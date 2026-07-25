import { insert, findOne, findAll } from "./memory-store";
import { logger } from "../lib/logger";
import { getActiveConnections } from "./network-monitor";

const DANGEROUS_PORTS = new Set([
  21, 22, 23, 25, 53, 80, 110, 119, 135, 139, 143, 443, 445, 465, 587, 
  993, 995, 1080, 1433, 1521, 2100, 2222, 3306, 3389, 4444, 5000, 5432, 
  5900, 6379, 7000, 7070, 8080, 8443, 9000, 9090, 10000
]);

const DANGEROUS_SERVICES: Record<number, string> = {
  21: "FTP",
  22: "SSH",
  23: "Telnet",
  25: "SMTP",
  53: "DNS",
  135: "RPC",
  139: "NetBIOS",
  445: "SMB",
  3389: "RDP",
  6379: "Redis",
  5432: "PostgreSQL",
  3306: "MySQL",
  27017: "MongoDB",
};

interface AlertConfig {
  portScanThreshold: number;
  highConcurrencyThreshold: number;
  checkInterval: number;
}

const config: AlertConfig = {
  portScanThreshold: 10,
  highConcurrencyThreshold: 50,
  checkInterval: 5000,
};

let knownThreatIps = new Set<string>();

export function updateThreatIps(ips: Set<string>): void {
  knownThreatIps = ips;
}

async function detectPortScanning(connections: { sourceIp: string; destinationPort: number }[]): Promise<void> {
  const portCounts = new Map<string, Set<number>>();
  
  for (const conn of connections) {
    if (!portCounts.has(conn.sourceIp)) {
      portCounts.set(conn.sourceIp, new Set());
    }
    portCounts.get(conn.sourceIp)!.add(conn.destinationPort);
  }
  
  for (const [sourceIp, ports] of portCounts) {
    if (ports.size >= config.portScanThreshold) {
      const isKnownThreat = knownThreatIps.has(sourceIp);
      const severity = isKnownThreat ? "critical" : "high";
      
      await createAlertIfNotExists(
        "port_scan",
        severity,
        sourceIp,
        `端口扫描检测: 来自 ${sourceIp} 的连接尝试了 ${ports.size} 个不同端口`,
        [...ports][0]
      );
    }
  }
}

async function detectDangerousPortConnections(connections: { sourceIp: string; destinationPort: number; protocol: string }[]): Promise<void> {
  for (const conn of connections) {
    if (DANGEROUS_PORTS.has(conn.destinationPort)) {
      const service = DANGEROUS_SERVICES[conn.destinationPort] || `端口 ${conn.destinationPort}`;
      const isKnownThreat = knownThreatIps.has(conn.sourceIp);
      const severity = isKnownThreat ? "critical" : "high";
      
      await createAlertIfNotExists(
        "intrusion",
        severity,
        conn.sourceIp,
        `${service}危险端口连接: 来自 ${conn.sourceIp} 的 ${conn.protocol.toUpperCase()} 连接`,
        conn.destinationPort
      );
    }
  }
}

async function detectHighConcurrency(connections: { sourceIp: string }[]): Promise<void> {
  const ipCounts = new Map<string, number>();
  
  for (const conn of connections) {
    ipCounts.set(conn.sourceIp, (ipCounts.get(conn.sourceIp) || 0) + 1);
  }
  
  for (const [sourceIp, count] of ipCounts) {
    if (count >= config.highConcurrencyThreshold) {
      await createAlertIfNotExists(
        "ddos",
        "critical",
        sourceIp,
        `DDoS攻击迹象: 来自 ${sourceIp} 的并发连接数达到 ${count}`,
        null
      );
    }
  }
}

async function createAlertIfNotExists(
  type: "intrusion" | "ddos" | "malware" | "brute_force" | "port_scan" | "sql_injection" | "xss" | "other",
  severity: "critical" | "high" | "medium" | "low",
  sourceIp: string,
  description: string,
  targetPort: number | null
): Promise<void> {
  const existing = findOne("alerts", {
    sourceIp,
    type,
    status: "active",
  });
  
  if (!existing) {
    insert("alerts", {
      title: getAlertTitle(type),
      description,
      severity,
      type,
      sourceIp,
      targetPort,
      status: "active",
    });
    
    insert("security_logs", {
      level: severity === "critical" ? "critical" : severity === "high" ? "error" : "warning",
      message: description,
      source: "alert-engine",
      details: JSON.stringify({ type, severity, sourceIp, targetPort }),
    });
    
    logger.warn({ type, severity, sourceIp, targetPort }, "New alert created");
  }
}

function getAlertTitle(type: string): string {
  const titles: Record<string, string> = {
    intrusion: "入侵检测",
    ddos: "DDoS攻击",
    malware: "恶意软件",
    brute_force: "暴力破解",
    port_scan: "端口扫描",
    sql_injection: "SQL注入",
    xss: "XSS攻击",
    other: "安全告警",
  };
  return titles[type] || "安全告警";
}

export async function analyzeConnections(): Promise<void> {
  logger.debug("Starting connection analysis");
  
  try {
    const connections = getActiveConnections();
    
    await detectPortScanning(connections);
    await detectDangerousPortConnections(connections);
    await detectHighConcurrency(connections);
    
    logger.info({ count: connections.length }, "Connection analysis completed");
  } catch (err) {
    logger.error({ err }, "Error during connection analysis");
  }
}

let analysisInterval: ReturnType<typeof setInterval> | null = null;

export function startAlertEngine(): void {
  if (analysisInterval) {
    stopAlertEngine();
  }
  
  analyzeConnections();
  
  analysisInterval = setInterval(() => {
    analyzeConnections();
  }, config.checkInterval);
  
  logger.info({ interval: config.checkInterval }, "Alert engine started");
}

export function stopAlertEngine(): void {
  if (analysisInterval) {
    clearInterval(analysisInterval);
    analysisInterval = null;
    logger.info("Alert engine stopped");
  }
}

export function getAllAlerts(status?: string, severity?: string, limit?: number): any[] {
  let alerts = findAll("alerts");
  
  if (status && status !== "all") {
    alerts = alerts.filter((a) => a.status === status);
  }
  if (severity) {
    alerts = alerts.filter((a) => a.severity === severity);
  }
  if (limit) {
    alerts = alerts.slice(0, limit);
  }
  
  return alerts.map((a) => ({
    ...a,
    knownThreat: knownThreatIps.has(a.sourceIp),
    detectedAt: a.detectedAt.toISOString(),
    resolvedAt: a.resolvedAt ? a.resolvedAt.toISOString() : null,
  }));
}