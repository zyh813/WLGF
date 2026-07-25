import { eq } from "drizzle-orm";
import { db, threatIndicatorsTable } from "@workspace/db";

/** Returns the set of IP values known as threat indicators. */
export async function getKnownThreatIps(): Promise<Set<string>> {
  const rows = await db.select({ value: threatIndicatorsTable.value })
    .from(threatIndicatorsTable)
    .where(eq(threatIndicatorsTable.type, "ip"));
  return new Set(rows.map((r) => r.value));
}
