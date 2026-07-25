import { pgTable, serial, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const logLevelEnum = pgEnum("log_level", ["info", "warning", "error", "critical"]);

export const securityLogsTable = pgTable("security_logs", {
  id: serial("id").primaryKey(),
  level: logLevelEnum("level").notNull(),
  message: text("message").notNull(),
  source: text("source").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  details: text("details"),
});

export const insertLogSchema = createInsertSchema(securityLogsTable).omit({ id: true, timestamp: true });
export type InsertLog = z.infer<typeof insertLogSchema>;
export type SecurityLog = typeof securityLogsTable.$inferSelect;
