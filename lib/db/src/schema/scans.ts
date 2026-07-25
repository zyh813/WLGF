import { pgTable, serial, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const scanTypeEnum = pgEnum("scan_type", ["port", "vulnerability", "full"]);
export const scanStatusEnum = pgEnum("scan_status", ["running", "completed", "failed"]);

export const scansTable = pgTable("scans", {
  id: serial("id").primaryKey(),
  target: text("target").notNull(),
  type: scanTypeEnum("type").notNull(),
  status: scanStatusEnum("status").notNull().default("running"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  vulnerabilities: integer("vulnerabilities").notNull().default(0),
  criticalCount: integer("critical_count").notNull().default(0),
  highCount: integer("high_count").notNull().default(0),
  mediumCount: integer("medium_count").notNull().default(0),
  lowCount: integer("low_count").notNull().default(0),
});

export const insertScanSchema = createInsertSchema(scansTable).omit({ id: true, startedAt: true, completedAt: true, vulnerabilities: true, criticalCount: true, highCount: true, mediumCount: true, lowCount: true, status: true });
export type InsertScan = z.infer<typeof insertScanSchema>;
export type Scan = typeof scansTable.$inferSelect;
