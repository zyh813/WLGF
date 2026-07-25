import { Router, type IRouter } from "express";
import { insert, findAll } from "../services/memory-store";
import { runPortScan, getAllScans } from "../services/vulnerability-scanner";

const router: IRouter = Router();

router.get("/scans", async (_req, res): Promise<void> => {
  const scans = getAllScans();
  res.json(scans);
});

router.post("/scans", async (req, res): Promise<void> => {
  const { target, type } = req.body;
  
  if (!target || !type) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  
  const scan = insert("scans", {
    target,
    type,
    status: "running",
    vulnerabilities: 0,
    criticalCount: 0,
    highCount: 0,
    mediumCount: 0,
    lowCount: 0,
  });
  
  runPortScan(target, scan.id).catch((err) => {
    console.error("Scan failed:", err);
  });
  
  res.status(201).json(formatScan(scan));
});

function formatScan(s: any) {
  return {
    id: s.id,
    target: s.target,
    type: s.type,
    status: s.status,
    startedAt: s.startedAt ? s.startedAt.toISOString() : new Date().toISOString(),
    completedAt: s.completedAt ? s.completedAt.toISOString() : null,
    vulnerabilities: s.vulnerabilities,
    criticalCount: s.criticalCount,
    highCount: s.highCount,
    mediumCount: s.mediumCount,
    lowCount: s.lowCount,
  };
}

export default router;