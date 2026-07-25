import { pgTable, serial, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const severityEnum = pgEnum("severity", ["critical", "high", "medium", "low"]);
export const alertTypeEnum = pgEnum("alert_type", ["intrusion", "ddos", "malware", "brute_force", "port_scan", "sql_injection", "xss", "other"]);
export const alertStatusEnum = pgEnum("alert_status", ["active", "resolved"]);

export const alertsTable = pgTable("alerts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  severity: severityEnum("severity").notNull(),
  type: alertTypeEnum("type").notNull(),
  sourceIp: text("source_ip").notNull(),
  targetPort: integer("target_port"),
  status: alertStatusEnum("status").notNull().default("active"),
  detectedAt: timestamp("detected_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

export const insertAlertSchema = createInsertSchema(alertsTable).omit({ id: true, detectedAt: true, resolvedAt: true, status: true });
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alertsTable.$inferSelect;
