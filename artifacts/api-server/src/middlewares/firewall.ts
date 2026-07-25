import { type Request, type Response, type NextFunction } from "express";
import { isIpBlocked } from "../services/firewall-service";

export function firewallMiddleware(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.socket.remoteAddress || "";
  
  if (isIpBlocked(ip)) {
    res.status(403).json({
      error: "Forbidden",
      message: "Your IP address has been blocked by the firewall",
      ip,
    });
    return;
  }
  
  next();
}