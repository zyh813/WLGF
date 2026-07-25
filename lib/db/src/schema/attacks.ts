import { pgTable, serial, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const attackTypeEnum = pgEnum("attack_type", [
  "sql_injection",
  "xss",
  "ddos",
  "brute_force",
  "port_scan",
  "phishing",
]);
export const attackStatusEnum = pgEnum("attack_status", ["running", "completed", "blocked"]);

export const attackCampaignsTable = pgTable("attack_campaigns", {
  id: serial("id").primaryKey(),
  target: text("target").notNull(),
  type: attackTypeEnum("type").notNull(),
  status: attackStatusEnum("status").notNull().default("running"),
  result: text("result"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertAttackCampaignSchema = createInsertSchema(attackCampaignsTable).omit({
  id: true,
  status: true,
  result: true,
  startedAt: true,
  completedAt: true,
});
export type InsertAttackCampaign = z.infer<typeof insertAttackCampaignSchema>;
export type AttackCampaign = typeof attackCampaignsTable.$inferSelect;

export const exploitsTable = pgTable("exploits", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  severity: text("severity").notNull(),
  mitreTactic: text("mitre_tactic").notNull(),
  description: text("description").notNull(),
  payload: text("payload").notNull(),
});

export const insertExploitSchema = createInsertSchema(exploitsTable).omit({ id: true });
export type InsertExploit = z.infer<typeof insertExploitSchema>;
export type Exploit = typeof exploitsTable.$inferSelect;
