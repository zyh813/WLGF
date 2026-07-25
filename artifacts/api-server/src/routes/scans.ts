import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, scansTable } from "@workspace/db";
import { StartScanBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/scans", async (_req, res): Promise<void> => {
  const scans = await db.select().from(scansTable).orderBy(desc(scansTable.startedAt));
  res.json(scans.map(formatScan));
});

router.post("/scans", async (req, res): Promise<void> => {
  const parsed = StartScanBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [scan] = await db.insert(scansTable).values({
    target: parsed.data.target,
    type: parsed.data.type,
    status: "running",
  }).returning();

  // Simulate scan completion after a brief delay (for demo purposes)
  setTimeout(async () => {
    const critical = Math.floor(Math.random() * 3);
    const high = Math.floor(Math.random() * 5);
    const medium = Math.floor(Math.random() * 10);
    const low = Math.floor(Math.random() * 15);
    await db.update(scansTable).set({
      status: "completed",
      completedAt: new Date(),
      vulnerabilities: critical + high + medium + low,
      criticalCount: critical,
      highCount: high,
      mediumCount: medium,
      lowCount: low,
    }).where(eq(scansTable.id, scan.id));
  }, 5000);

  res.status(201).json(formatScan(scan));
});

function formatScan(s: typeof scansTable.$inferSelect) {
  return {
    id: s.id,
    target: s.target,
    type: s.type,
    status: s.status,
    startedAt: s.startedAt.toISOString(),
    completedAt: s.completedAt ? s.completedAt.toISOString() : null,
    vulnerabilities: s.vulnerabilities,
    criticalCount: s.criticalCount,
    highCount: s.highCount,
    mediumCount: s.mediumCount,
    lowCount: s.lowCount,
  };
}

export default router;
