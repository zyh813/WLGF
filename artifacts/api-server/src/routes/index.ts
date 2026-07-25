import { Router, type IRouter } from "express";
import healthRouter from "./health";
import alertsRouter from "./alerts";
import firewallRouter from "./firewall";
import connectionsRouter from "./connections";
import scansRouter from "./scans";
import logsRouter from "./security-logs";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(alertsRouter);
router.use(firewallRouter);
router.use(connectionsRouter);
router.use(scansRouter);
router.use(logsRouter);

export default router;
