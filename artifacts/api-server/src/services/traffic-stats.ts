import { readFileSync } from "fs";
import { logger } from "../lib/logger";

interface InterfaceStats {
  name: string;
  rxBytes: number;
  txBytes: number;
  rxPackets: number;
  txPackets: number;
}

interface TrafficSnapshot {
  timestamp: number;
  interfaces: InterfaceStats[];
}

let lastSnapshot: TrafficSnapshot | null = null;

export function parseTrafficStats(): InterfaceStats[] {
  const stats: InterfaceStats[] = [];
  
  try {
    const content = readFileSync("/proc/net/dev", "utf-8");
    const lines = content.trim().split("\n").slice(2);
    
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 17) continue;
      
      const name = parts[0].replace(":", "");
      
      stats.push({
        name,
        rxBytes: parseInt(parts[1], 10),
        txBytes: parseInt(parts[9], 10),
        rxPackets: parseInt(parts[2], 10),
        txPackets: parseInt(parts[10], 10),
      });
    }
  } catch (err) {
    logger.warn({ err }, "Failed to read /proc/net/dev");
  }
  
  return stats;
}

export function getTrafficRate(): { inbound: number; outbound: number; interfaces: InterfaceStats[] } {
  const currentStats = parseTrafficStats();
  const currentTime = Date.now();
  
  let inbound = 0;
  let outbound = 0;
  
  if (lastSnapshot && currentTime - lastSnapshot.timestamp > 0) {
    const elapsedSeconds = (currentTime - lastSnapshot.timestamp) / 1000;
    
    for (const iface of currentStats) {
      const lastIface = lastSnapshot.interfaces.find(i => i.name === iface.name);
      if (lastIface) {
        const rxRate = (iface.rxBytes - lastIface.rxBytes) / elapsedSeconds;
        const txRate = (iface.txBytes - lastIface.txBytes) / elapsedSeconds;
        inbound += rxRate;
        outbound += txRate;
      }
    }
  }
  
  lastSnapshot = {
    timestamp: currentTime,
    interfaces: currentStats,
  };
  
  return {
    inbound: Math.round(inbound),
    outbound: Math.round(outbound),
    interfaces: currentStats,
  };
}

let hourlyStats: { hour: string; inbound: number; outbound: number }[] = [];

export function updateHourlyStats(): void {
  const now = new Date();
  const hourKey = now.toISOString().substring(0, 13);
  
  const rate = getTrafficRate();
  
  const existing = hourlyStats.find(s => s.hour === hourKey);
  if (existing) {
    existing.inbound += rate.inbound;
    existing.outbound += rate.outbound;
  } else {
    hourlyStats.push({
      hour: hourKey,
      inbound: rate.inbound,
      outbound: rate.outbound,
    });
  }
  
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  hourlyStats = hourlyStats.filter(s => new Date(s.hour) >= cutoff);
  
  logger.debug({ stats: hourlyStats.length }, "Updated hourly traffic stats");
}

export function getHourlyStats(): { hour: string; inbound: number; outbound: number; inboundKbps: number; outboundKbps: number }[] {
  const now = new Date();
  const stats: { hour: string; inbound: number; outbound: number; inboundKbps: number; outboundKbps: number }[] = [];
  
  for (let i = 23; i >= 0; i--) {
    const hour = new Date(now);
    hour.setHours(now.getHours() - i, 0, 0, 0);
    const hourKey = hour.toISOString().substring(0, 13);
    const label = hour.toISOString().substring(11, 16);
    
    const found = hourlyStats.find(s => s.hour === hourKey);
    const secondsInHour = i === 0 ? now.getMinutes() * 60 + now.getSeconds() : 3600;
    
    if (found && secondsInHour > 0) {
      const avgInbound = (found.inbound / secondsInHour) * 3600;
      const avgOutbound = (found.outbound / secondsInHour) * 3600;
      stats.push({
        hour: label,
        inbound: Math.round(avgInbound),
        outbound: Math.round(avgOutbound),
        inboundKbps: Math.round((avgInbound / 1024) * 8),
        outboundKbps: Math.round((avgOutbound / 1024) * 8),
      });
    } else {
      stats.push({
        hour: label,
        inbound: 0,
        outbound: 0,
        inboundKbps: 0,
        outboundKbps: 0,
      });
    }
  }
  
  return stats;
}