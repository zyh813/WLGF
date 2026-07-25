import { insert, findAll, update, remove, count } from "./memory-store";
import { logger } from "../lib/logger";

let blockedIps: Set<string> = new Set();

export async function loadBlockedIps(): Promise<void> {
  const rules = findAll("firewall_rules", { action: "deny", enabled: true });
  blockedIps = new Set(rules.map((r) => r.sourceIp));
  logger.info({ count: blockedIps.size }, "Loaded blocked IPs from firewall rules");
}

export function isIpBlocked(ip: string): boolean {
  return blockedIps.has(ip);
}

export async function blockIp(ip: string, reason: string = "Security threat"): Promise<void> {
  const existing = findAll("firewall_rules", { sourceIp: ip, action: "deny" })[0];
  
  if (!existing) {
    insert("firewall_rules", {
      name: `Block ${ip}`,
      description: reason,
      action: "deny",
      protocol: "any",
      sourceIp: ip,
      destinationPort: "any",
      enabled: true,
      priority: 1,
    });
    
    insert("security_logs", {
      level: "warning",
      message: `IP blocked: ${ip} - ${reason}`,
      source: "firewall",
      details: JSON.stringify({ ip, reason, action: "block" }),
    });
    
    blockedIps.add(ip);
    logger.warn({ ip, reason }, "IP blocked");
  }
}

export async function unblockIp(ip: string): Promise<void> {
  remove("firewall_rules", { sourceIp: ip, action: "deny" });
  update("network_connections", { sourceIp: ip, status: "blocked" }, { status: "active" });
  
  insert("security_logs", {
    level: "info",
    message: `IP unblocked: ${ip}`,
    source: "firewall",
    details: JSON.stringify({ ip, action: "unblock" }),
  });
  
  blockedIps.delete(ip);
  logger.info({ ip }, "IP unblocked");
}

export async function getBlockedIps(): Promise<string[]> {
  return Array.from(blockedIps);
}

export async function syncFirewallRules(): Promise<void> {
  await loadBlockedIps();
}

export function getAllFirewallRules(): any[] {
  return findAll("firewall_rules").map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  }));
}

let syncInterval: ReturnType<typeof setInterval> | null = null;

export function startFirewallSync(): void {
  if (syncInterval) {
    stopFirewallSync();
  }
  
  syncFirewallRules();
  
  syncInterval = setInterval(() => {
    syncFirewallRules();
  }, 30000);
  
  logger.info("Firewall sync started");
}

export function stopFirewallSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    logger.info("Firewall sync stopped");
  }
}