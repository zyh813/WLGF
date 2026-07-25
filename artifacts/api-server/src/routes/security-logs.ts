import { Router, type IRouter } from "express";
import { getAllLogs } from "../services/log-monitor";

const router: IRouter = Router();

router.get("/logs", async (req, res): Promise<void> => {
  const { level, limit } = req.query as { level?: string; limit?: string };
  const logs = getAllLogs(level, limit ? parseInt(limit, 10) : undefined);
  res.json(logs);
});

export default router;