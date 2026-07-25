import { Router, type IRouter } from "express";
import { eq, and, desc, gte } from "drizzle-orm";
import { db, alertsTable } from "@workspace/db";
import {
  CreateAlertBody,
  ResolveAlertParams,
} from "@workspace/api-zod";
import { getKnownThreatIps } from "../lib/threat-match";

const router: IRouter = Router();

router.get("/alerts", async (req, res): Promise<void> => {
  const { status, severity, limit } = req.query as { status?: string; severity?: string; limit?: string };
  const conditions = [];
  if (status && status !== "all") {
    conditions.push(eq(alertsTable.status, status as "active" | "resolved"));
  }
  if (severity) {
    conditions.push(eq(alertsTable.severity, severity as "critical" | "high" | "medium" | "low"));
  }
  const q = db.select().from(alertsTable).orderBy(desc(alertsTable.detectedAt));
  if (conditions.length > 0) {
    q.where(and(...conditions));
  }
  if (limit) {
    q.limit(parseInt(limit, 10));
  }
  const alerts = await q;
  const threatIps = await getKnownThreatIps();
  res.json(alerts.map((a) => formatAlert(a, threatIps)));
});

router.post("/alerts", async (req, res): Promise<void> => {
  const parsed = CreateAlertBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [alert] = await db.insert(alertsTable).values({
    ...parsed.data,
    targetPort: parsed.data.targetPort ?? null,
  }).returning();
  res.status(201).json(formatAlert(alert));
});

router.post("/alerts/:id/resolve", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = ResolveAlertParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [alert] = await db.update(alertsTable)
    .set({ status: "resolved", resolvedAt: new Date() })
    .where(eq(alertsTable.id, params.data.id))
    .returning();
  if (!alert) {
    res.status(404).json({ error: "Alert not found" });
    return;
  }
  res.json(formatAlert(alert));
});

router.get("/alerts/recent", async (_req, res): Promise<void> => {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const alerts = await db.select().from(alertsTable)
    .where(gte(alertsTable.detectedAt, since))
    .orderBy(desc(alertsTable.detectedAt));
  const threatIps = await getKnownThreatIps();
  res.json(alerts.map((a) => formatAlert(a, threatIps)));
});

function formatAlert(a: typeof alertsTable.$inferSelect, threatIps?: Set<string>) {
  return {
    id: a.id,
    title: a.title,
    description: a.description,
    severity: a.severity,
    type: a.type,
    sourceIp: a.sourceIp,
    targetPort: a.targetPort ?? null,
    status: a.status,
    detectedAt: a.detectedAt.toISOString(),
    resolvedAt: a.resolvedAt ? a.resolvedAt.toISOString() : null,
    knownThreat: threatIps ? threatIps.has(a.sourceIp) : false,
  };
}

export default router;
