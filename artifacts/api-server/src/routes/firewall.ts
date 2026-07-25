import { Router, type IRouter } from "express";
import { insert, update, remove, findAll } from "../services/memory-store";
import { blockIp, unblockIp, getBlockedIps, loadBlockedIps, getAllFirewallRules } from "../services/firewall-service";

const router: IRouter = Router();

router.get("/firewall/rules", async (_req, res): Promise<void> => {
  const rules = getAllFirewallRules();
  res.json(rules);
});

router.post("/firewall/rules", async (req, res): Promise<void> => {
  const { name, description, action, protocol, sourceIp, destinationPort, enabled, priority } = req.body;
  
  if (!name || !action || !protocol || !sourceIp || !destinationPort) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  
  const rule = insert("firewall_rules", {
    name,
    description: description ?? "",
    action,
    protocol,
    sourceIp,
    destinationPort,
    enabled: enabled ?? true,
    priority: priority ?? 100,
  });
  
  await loadBlockedIps();
  
  res.status(201).json(formatRule(rule));
});

router.patch("/firewall/rules/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  
  const updated = update("firewall_rules", { id }, req.body);
  
  await loadBlockedIps();
  
  if (updated.length === 0) {
    res.status(404).json({ error: "Firewall rule not found" });
    return;
  }
  
  res.json(formatRule(updated[0]));
});

router.delete("/firewall/rules/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  
  const removed = remove("firewall_rules", { id });
  
  await loadBlockedIps();
  
  if (removed.length === 0) {
    res.status(404).json({ error: "Firewall rule not found" });
    return;
  }
  
  res.sendStatus(204);
});

router.post("/firewall/block/:ip", async (req, res): Promise<void> => {
  const ip = req.params.ip;
  const reason = req.body.reason || "Security threat";
  
  await blockIp(ip, reason);
  
  res.status(201).json({
    message: `IP ${ip} blocked successfully`,
    ip,
    reason,
  });
});

router.post("/firewall/unblock/:ip", async (req, res): Promise<void> => {
  const ip = req.params.ip;
  
  await unblockIp(ip);
  
  res.json({
    message: `IP ${ip} unblocked successfully`,
    ip,
  });
});

router.get("/firewall/blocked", async (_req, res): Promise<void> => {
  const blockedIpsList = await getBlockedIps();
  res.json({
    blockedIps: blockedIpsList,
    count: blockedIpsList.length,
  });
});

function formatRule(r: any) {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    action: r.action,
    protocol: r.protocol,
    sourceIp: r.sourceIp,
    destinationPort: r.destinationPort,
    enabled: r.enabled,
    priority: r.priority,
    createdAt: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
  };
}

export default router;