import { Router, type IRouter } from "express";
import { insert, findAll, update, remove } from "../services/memory-store";
import { updateThreatIps } from "../services/alert-engine";

const router: IRouter = Router();

router.get("/threat-indicators", async (req, res): Promise<void> => {
  const { type, limit } = req.query as { type?: string; limit?: string };
  let indicators = findAll("threat_indicators");
  
  if (type) {
    indicators = indicators.filter((i) => i.type === type);
  }
  if (limit) {
    indicators = indicators.slice(0, parseInt(limit, 10));
  }
  
  res.json(indicators.map(formatIndicator));
});

router.post("/threat-indicators", async (req, res): Promise<void> => {
  const { type, value, category, description } = req.body;
  
  if (!type || !value || !category) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  
  const indicator = insert("threat_indicators", {
    type,
    value,
    category,
    description: description ?? "",
    active: true,
  });
  
  updateThreatIps(getThreatIpsFromStore());
  
  res.status(201).json(formatIndicator(indicator));
});

router.patch("/threat-indicators/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  
  const updated = update("threat_indicators", { id }, req.body);
  
  updateThreatIps(getThreatIpsFromStore());
  
  if (updated.length === 0) {
    res.status(404).json({ error: "Threat indicator not found" });
    return;
  }
  
  res.json(formatIndicator(updated[0]));
});

router.delete("/threat-indicators/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  
  const removed = remove("threat_indicators", { id });
  
  updateThreatIps(getThreatIpsFromStore());
  
  if (removed.length === 0) {
    res.status(404).json({ error: "Threat indicator not found" });
    return;
  }
  
  res.sendStatus(204);
});

function getThreatIpsFromStore(): Set<string> {
  const indicators = findAll("threat_indicators", { type: "ip", active: true });
  return new Set(indicators.map((i) => i.value));
}

function formatIndicator(i: any) {
  return {
    id: i.id,
    type: i.type,
    value: i.value,
    category: i.category,
    description: i.description,
    active: i.active,
    createdAt: i.createdAt ? i.createdAt.toISOString() : new Date().toISOString(),
  };
}

export default router;