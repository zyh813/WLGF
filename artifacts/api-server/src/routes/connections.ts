import { Router, type IRouter } from "express";
import { update, findAll } from "../services/memory-store";
import { getActiveConnections, syncNetworkConnections, getAllConnections } from "../services/network-monitor";
import { getKnownThreatIps } from "../lib/threat-match";

const router: IRouter = Router();

router.get("/connections", async (req, res): Promise<void> => {
  await syncNetworkConnections();
  
  const { status } = req.query as { status?: string };
  const connections = getAllConnections(status);
  const threatIps = await getKnownThreatIps();
  res.json(connections.map((c) => formatConnection(c, threatIps)));
});

router.get("/connections/live", async (_req, res): Promise<void> => {
  const liveConnections = getActiveConnections();
  const threatIps = await getKnownThreatIps();
  
  res.json(liveConnections.map((c) => ({
    sourceIp: c.sourceIp,
    sourcePort: c.sourcePort,
    destinationIp: c.destinationIp,
    destinationPort: c.destinationPort,
    protocol: c.protocol,
    status: c.status,
    knownThreat: threatIps.has(c.sourceIp),
  })));
});

router.post("/connections/:id/block", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  
  const updated = update("network_connections", { id }, { status: "blocked" });
  
  if (updated.length === 0) {
    res.status(404).json({ error: "Connection not found" });
    return;
  }
  
  res.json(formatConnection(updated[0]));
});

function formatConnection(c: any, threatIps?: Set<string>) {
  return {
    id: c.id,
    sourceIp: c.sourceIp,
    sourcePort: c.sourcePort,
    destinationIp: c.destinationIp,
    destinationPort: c.destinationPort,
    protocol: c.protocol,
    status: c.status,
    bytesIn: c.bytesIn,
    bytesOut: c.bytesOut,
    country: c.country,
    connectedAt: c.connectedAt ? c.connectedAt.toISOString() : new Date().toISOString(),
    knownThreat: threatIps ? threatIps.has(c.sourceIp) : false,
  };
}

export default router;