import { Router, type IRouter } from "express";
import { count, findAll } from "../services/memory-store";
import { getHourlyStats, getTrafficRate } from "../services/traffic-stats";
import { getBlockedIps } from "../services/firewall-service";

const router: IRouter = Router();

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const totalAlerts = count("alerts");
  const activeThreats = count("alerts", { status: "active" });
  const blockedConnections = count("network_connections", { status: "blocked" });
  const firewallRules = count("firewall_rules", { enabled: true });
  const criticalAlerts = count("alerts", { severity: "critical", status: "active" });
  
  const resolvedToday = findAll("alerts").filter(
    (a) => a.status === "resolved" && a.resolvedAt && a.resolvedAt >= todayStart
  ).length;
  
  const scans = findAll("scans");
  const latestScan = scans.length > 0 ? scans[0] : null;

  const trafficRate = getTrafficRate();
  const blockedIpsCount = (await getBlockedIps()).length;

  const totalActive = activeThreats;
  const totalCritical = criticalAlerts;
  const securityScore = Math.max(0, Math.min(100, 100 - (totalActive * 5) - (totalCritical * 10)));

  res.json({
    totalAlerts,
    activeThreats: totalActive,
    blockedConnections,
    firewallRules,
    lastScanAt: latestScan ? (latestScan.startedAt ? latestScan.startedAt.toISOString() : new Date().toISOString()) : null,
    securityScore,
    criticalAlerts: totalCritical,
    resolvedToday,
    currentInbound: trafficRate.inbound,
    currentOutbound: trafficRate.outbound,
    blockedIps: blockedIpsCount,
  });
});

router.get("/traffic/stats", async (_req, res): Promise<void> => {
  const hourlyStats = getHourlyStats();
  const trafficRate = getTrafficRate();

  const stats = hourlyStats.map((stat) => ({
    hour: stat.hour,
    inbound: stat.inbound,
    outbound: stat.outbound,
    inboundKbps: stat.inboundKbps,
    outboundKbps: stat.outboundKbps,
  }));

  res.json({
    current: {
      inbound: trafficRate.inbound,
      outbound: trafficRate.outbound,
      inboundKbps: Math.round((trafficRate.inbound / 1024) * 8),
      outboundKbps: Math.round((trafficRate.outbound / 1024) * 8),
    },
    hourly: stats,
    interfaces: trafficRate.interfaces,
  });
});

export default router;