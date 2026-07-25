import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, connectionsTable } from "@workspace/db";
import { BlockConnectionParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/connections", async (req, res): Promise<void> => {
  const { status } = req.query as { status?: string };
  const q = db.select().from(connectionsTable).orderBy(desc(connectionsTable.connectedAt));
  if (status && status !== "all") {
    q.where(eq(connectionsTable.status, status as "active" | "blocked" | "suspicious"));
  }
  const connections = await q;
  res.json(connections.map(formatConnection));
});

router.post("/connections/:id/block", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = BlockConnectionParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [conn] = await db.update(connectionsTable)
    .set({ status: "blocked" })
    .where(eq(connectionsTable.id, params.data.id))
    .returning();
  if (!conn) {
    res.status(404).json({ error: "Connection not found" });
    return;
  }
  res.json(formatConnection(conn));
});

function formatConnection(c: typeof connectionsTable.$inferSelect) {
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
    connectedAt: c.connectedAt.toISOString(),
  };
}

export default router;
