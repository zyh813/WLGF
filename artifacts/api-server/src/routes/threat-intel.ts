import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, threatIndicatorsTable, firewallRulesTable } from "@workspace/db";
import {
  CreateThreatIndicatorBody,
  UpdateThreatIndicatorBody,
  UpdateThreatIndicatorParams,
  DeleteThreatIndicatorParams,
  BlockThreatIndicatorParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

const SAMPLE_FEED: Array<{
  type: "ip" | "domain" | "hash";
  value: string;
  category: "malware" | "botnet" | "phishing" | "c2" | "scanner" | "spam" | "apt" | "other";
  confidence: number;
  source: string;
  description: string;
}> = [
  { type: "ip", value: "185.220.101.34", category: "c2", confidence: 95, source: "AbuseIPDB 样本源", description: "已知 C2 服务器，多次参与僵尸网络控制" },
  { type: "ip", value: "45.155.205.233", category: "scanner", confidence: 88, source: "AbuseIPDB 样本源", description: "大规模端口扫描来源" },
  { type: "ip", value: "103.75.190.11", category: "botnet", confidence: 92, source: "Spamhaus 样本源", description: "Mirai 变种僵尸网络节点" },
  { type: "ip", value: "91.240.118.172", category: "malware", confidence: 85, source: "ThreatFox 样本源", description: "恶意软件分发服务器" },
  { type: "ip", value: "194.26.29.156", category: "spam", confidence: 70, source: "Spamhaus 样本源", description: "垃圾邮件中继" },
  { type: "ip", value: "185.220.101.45", category: "c2", confidence: 91, source: "AbuseIPDB 样本源", description: "Tor 出口节点，多次发起攻击" },
  { type: "ip", value: "103.214.148.22", category: "botnet", confidence: 87, source: "ThreatFox 样本源", description: "僵尸网络受控主机" },
  { type: "domain", value: "malware-delivery.example.net", category: "malware", confidence: 90, source: "URLhaus 样本源", description: "恶意载荷分发域名" },
  { type: "domain", value: "phish-login-secure.example.com", category: "phishing", confidence: 96, source: "PhishTank 样本源", description: "仿冒登录页钓鱼域名" },
  { type: "domain", value: "c2-beacon.example.org", category: "c2", confidence: 93, source: "ThreatFox 样本源", description: "Cobalt Strike 信标回连域名" },
  { type: "hash", value: "44d88612fea8a8f36de82e1278abb02f", category: "malware", confidence: 100, source: "VirusTotal 样本源", description: "EICAR 测试文件 MD5" },
  { type: "hash", value: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", category: "apt", confidence: 80, source: "MISP 样本源", description: "APT 组织相关样本 SHA256" },
];

router.get("/threat-intel/indicators", async (req, res): Promise<void> => {
  const { type } = req.query as { type?: string };
  const q = db.select().from(threatIndicatorsTable).orderBy(desc(threatIndicatorsTable.lastSeen));
  if (type && type !== "all") {
    q.where(eq(threatIndicatorsTable.type, type as "ip" | "domain" | "hash"));
  }
  const indicators = await q;
  res.json(indicators.map(formatIndicator));
});

router.post("/threat-intel/indicators", async (req, res): Promise<void> => {
  const parsed = CreateThreatIndicatorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [indicator] = await db.insert(threatIndicatorsTable).values({
    ...parsed.data,
    confidence: parsed.data.confidence ?? 50,
    source: parsed.data.source ?? "manual",
    description: parsed.data.description ?? "",
  }).returning();
  res.status(201).json(formatIndicator(indicator));
});

router.patch("/threat-intel/indicators/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateThreatIndicatorParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = UpdateThreatIndicatorBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [indicator] = await db.update(threatIndicatorsTable)
    .set({ ...parsed.data, lastSeen: new Date() })
    .where(eq(threatIndicatorsTable.id, params.data.id))
    .returning();
  if (!indicator) {
    res.status(404).json({ error: "Indicator not found" });
    return;
  }
  res.json(formatIndicator(indicator));
});

router.delete("/threat-intel/indicators/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteThreatIndicatorParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [indicator] = await db.delete(threatIndicatorsTable)
    .where(eq(threatIndicatorsTable.id, params.data.id))
    .returning();
  if (!indicator) {
    res.status(404).json({ error: "Indicator not found" });
    return;
  }
  res.sendStatus(204);
});

router.post("/threat-intel/import", async (_req, res): Promise<void> => {
  const existing = await db.select({
    type: threatIndicatorsTable.type,
    value: threatIndicatorsTable.value,
  }).from(threatIndicatorsTable);
  const existingKeys = new Set(existing.map((e) => `${e.type}:${e.value}`));

  const toInsert = SAMPLE_FEED.filter((e) => !existingKeys.has(`${e.type}:${e.value}`));
  if (toInsert.length > 0) {
    await db.insert(threatIndicatorsTable).values(toInsert);
  }
  res.status(201).json({ imported: toInsert.length, skipped: SAMPLE_FEED.length - toInsert.length });
});

router.post("/threat-intel/indicators/:id/block", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = BlockThreatIndicatorParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [indicator] = await db.select().from(threatIndicatorsTable)
    .where(eq(threatIndicatorsTable.id, params.data.id));
  if (!indicator) {
    res.status(404).json({ error: "Indicator not found" });
    return;
  }
  if (indicator.type !== "ip") {
    res.status(400).json({ error: "Only IP indicators can be pushed to the firewall" });
    return;
  }
  const [existingRule] = await db.select().from(firewallRulesTable)
    .where(and(eq(firewallRulesTable.sourceIp, indicator.value), eq(firewallRulesTable.action, "deny")));
  if (existingRule) {
    res.status(409).json({ error: "Firewall deny rule already exists for this IP" });
    return;
  }
  const [rule] = await db.insert(firewallRulesTable).values({
    name: `威胁情报拦截 ${indicator.value}`,
    description: `来源：威胁情报（${indicator.source}，${indicator.category}，置信度 ${indicator.confidence}%）`,
    action: "deny",
    protocol: "any",
    sourceIp: indicator.value,
    destinationPort: "*",
    enabled: true,
    priority: 10,
  }).returning();
  res.status(201).json({
    id: rule.id,
    name: rule.name,
    description: rule.description,
    action: rule.action,
    protocol: rule.protocol,
    sourceIp: rule.sourceIp,
    destinationPort: rule.destinationPort,
    enabled: rule.enabled,
    priority: rule.priority,
    createdAt: rule.createdAt.toISOString(),
  });
});

function formatIndicator(i: typeof threatIndicatorsTable.$inferSelect) {
  return {
    id: i.id,
    type: i.type,
    value: i.value,
    category: i.category,
    confidence: i.confidence,
    source: i.source,
    description: i.description,
    firstSeen: i.firstSeen.toISOString(),
    lastSeen: i.lastSeen.toISOString(),
  };
}

export default router;
