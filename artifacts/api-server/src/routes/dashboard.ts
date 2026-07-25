import { Router, type IRouter } from "express";
import { eq, count, gte, and } from "drizzle-orm";
import { db, alertsTable, firewallRulesTable, connectionsTable, scansTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [[totalAlerts], [activeThreats], [blockedConnections], [firewallRules], [criticalAlerts], [resolvedToday], latestScan] = await Promise.all([
    db.select({ count: count() }).from(alertsTable),
    db.select({ count: count() }).from(alertsTable).where(eq(alertsTable.status, "active")),
    db.select({ count: count() }).from(connectionsTable).where(eq(connectionsTable.status, "blocked")),
    db.select({ count: count() }).from(firewallRulesTable).where(eq(firewallRulesTable.enabled, true)),
    db.select({ count: count() }).from(alertsTable).where(and(eq(alertsTable.severity, "critical"), eq(alertsTable.status, "active"))),
    db.select({ count: count() }).from(alertsTable).where(and(eq(alertsTable.status, "resolved"), gte(alertsTable.resolvedAt, todayStart))),
    db.select().from(scansTable).orderBy(scansTable.startedAt).limit(1),
  ]);

  const totalActive = activeThreats.count;
  const totalCritical = criticalAlerts.count;
  // Simple security score: starts at 100, penalizes active threats and critical issues
  const securityScore = Math.max(0, Math.min(100, 100 - (totalActive * 5) - (totalCritical * 10)));

  res.json({
    totalAlerts: totalAlerts.count,
    activeThreats: totalActive,
    blockedConnections: blockedConnections.count,
    firewallRules: firewallRules.count,
    lastScanAt: latestScan[0] ? latestScan[0].startedAt.toISOString() : null,
    securityScore,
    criticalAlerts: totalCritical,
    resolvedToday: resolvedToday.count,
  });
});

router.get("/traffic/stats", async (_req, res): Promise<void> => {
  // Generate simulated hourly traffic stats for the last 24 hours
  const stats = [];
  const now = new Date();
  for (let i = 23; i >= 0; i--) {
    const hour = new Date(now);
    hour.setHours(now.getHours() - i, 0, 0, 0);
    const label = hour.toISOString().substring(11, 16);
    const base = Math.floor(Math.random() * 500) + 200;
    stats.push({
      hour: label,
      inbound: base + Math.floor(Math.random() * 300),
      outbound: Math.floor(base * 0.7) + Math.floor(Math.random() * 200),
      blocked: Math.floor(Math.random() * 80),
      suspicious: Math.floor(Math.random() * 30),
    });
  }
  res.json(stats);
});

export default router;
