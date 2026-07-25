import { Router, type IRouter } from "express";
import { update, insert } from "../services/memory-store";
import { getAllAlerts } from "../services/alert-engine";

const router: IRouter = Router();

router.get("/alerts", async (req, res): Promise<void> => {
  const { status, severity, limit } = req.query as { status?: string; severity?: string; limit?: string };
  const alerts = getAllAlerts(status, severity, limit ? parseInt(limit, 10) : undefined);
  res.json(alerts);
});

router.post("/alerts", async (req, res): Promise<void> => {
  const { title, description, severity, type, sourceIp, targetPort } = req.body;
  
  if (!title || !description || !severity || !type || !sourceIp) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  
  const alert = insert("alerts", {
    title,
    description,
    severity,
    type,
    sourceIp,
    targetPort: targetPort ?? null,
    status: "active",
  });
  
  res.status(201).json(formatAlert(alert));
});

router.post("/alerts/:id/resolve", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  
  const updated = update("alerts", { id }, { status: "resolved", resolvedAt: new Date() });
  
  if (updated.length === 0) {
    res.status(404).json({ error: "Alert not found" });
    return;
  }
  
  res.json(formatAlert(updated[0]));
});

router.get("/alerts/recent", async (_req, res): Promise<void> => {
  const alerts = getAllAlerts(undefined, undefined, 50);
  res.json(alerts);
});

function formatAlert(a: any) {
  return {
    id: a.id,
    title: a.title,
    description: a.description,
    severity: a.severity,
    type: a.type,
    sourceIp: a.sourceIp,
    targetPort: a.targetPort ?? null,
    status: a.status,
    detectedAt: a.detectedAt ? a.detectedAt.toISOString() : new Date().toISOString(),
    resolvedAt: a.resolvedAt ? a.resolvedAt.toISOString() : null,
    knownThreat: a.knownThreat ?? false,
  };
}

export default router;