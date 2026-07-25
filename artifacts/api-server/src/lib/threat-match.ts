import { findAll } from "../services/memory-store";

export async function getKnownThreatIps(): Promise<Set<string>> {
  const rows = findAll("threat_indicators", { type: "ip", active: true });
  return new Set(rows.map((r: any) => r.value));
}