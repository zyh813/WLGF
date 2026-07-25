import { readFileSync } from "fs";
import { insert, findOne, findAll } from "./memory-store";
import { logger } from "../lib/logger";

interface ParsedConnection {
  sourceIp: string;
  sourcePort: number;
  destinationIp: string;
  destinationPort: number;
  protocol: "tcp" | "udp";
  status: string;
}

function hexToIp(hex: string): string {
  const parts = [];
  for (let i = 0; i < 8; i += 2) {
    parts.push(parseInt(hex.substr(i, 2), 16));
  }
  return parts.reverse().join(".");
}

function hexToPort(hex: string): number {
  return parseInt(hex, 16);
}

function parseConnections(protocol: "tcp" | "udp"): ParsedConnection[] {
  const connections: ParsedConnection[] = [];
  
  try {
    const content = readFileSync(`/proc/net/${protocol}`, "utf-8");
    const lines = content.trim().split("\n").slice(1);
    
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 4) continue;
      
      const localParts = parts[1].split(":");
      const remParts = parts[2].split(":");
      
      connections.push({
        sourceIp: hexToIp(localParts[0]),
        sourcePort: hexToPort(localParts[1]),
        destinationIp: hexToIp(remParts[0]),
        destinationPort: hexToPort(remParts[1]),
        protocol,
        status: parts[3],
      });
    }
  } catch (err) {
    logger.warn({ err, protocol }, "Failed to read /proc/net file");
  }
  
  return connections;
}

export async function syncNetworkConnections(): Promise<void> {
  const tcpConnections = parseConnections("tcp");
  const udpConnections = parseConnections("udp");
  const allConnections = [...tcpConnections, ...udpConnections];
  
  logger.debug({ count: allConnections.length }, "Parsed network connections");
  
  for (const conn of allConnections) {
    if (conn.destinationIp === "0.0.0.0" && conn.sourceIp !== "0.0.0.0") {
      continue;
    }
    
    const existing = findOne("network_connections", {
      sourceIp: conn.sourceIp,
      sourcePort: conn.sourcePort,
      destinationIp: conn.destinationIp,
      destinationPort: conn.destinationPort,
      protocol: conn.protocol,
    });
    
    if (!existing) {
      insert("network_connections", {
        sourceIp: conn.sourceIp,
        sourcePort: conn.sourcePort,
        destinationIp: conn.destinationIp,
        destinationPort: conn.destinationPort,
        protocol: conn.protocol,
        status: conn.status === "01" ? "active" : conn.status === "0A" ? "suspicious" : "active",
        country: "Unknown",
        bytesIn: 0,
        bytesOut: 0,
      });
    }
  }
  
  logger.info({ count: allConnections.length }, "Synced network connections");
}

export function getActiveConnections(): ParsedConnection[] {
  const tcpConnections = parseConnections("tcp");
  const udpConnections = parseConnections("udp");
  return [...tcpConnections, ...udpConnections];
}

export function getAllConnections(status?: string): any[] {
  if (status && status !== "all") {
    return findAll("network_connections", { status });
  }
  return findAll("network_connections");
}