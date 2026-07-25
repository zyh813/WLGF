import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, securityLogsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/logs", async (req, res): Promise<void> => {
  const { level, limit } = req.query as { level?: string; limit?: string };
  const q = db.select().from(securityLogsTable).orderBy(desc(securityLogsTable.timestamp));
  if (level) {
    q.where(eq(securityLogsTable.level, level as "info" | "warning" | "error" | "critical"));
  }
  if (limit) {
    q.limit(parseInt(limit, 10));
  }
  const logs = await q;
  res.json(logs.map(formatLog));
});

function formatLog(l: typeof securityLogsTable.$inferSelect) {
  return {
    id: l.id,
    level: l.level,
    message: l.message,
    source: l.source,
    timestamp: l.timestamp.toISOString(),
    details: l.details ?? null,
  };
}

export default router;
