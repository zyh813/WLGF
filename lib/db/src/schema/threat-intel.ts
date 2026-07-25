import { pgTable, serial, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const indicatorTypeEnum = pgEnum("indicator_type", ["ip", "domain", "hash"]);
export const threatCategoryEnum = pgEnum("threat_category", [
  "malware",
  "botnet",
  "phishing",
  "c2",
  "scanner",
  "spam",
  "apt",
  "other",
]);

export const threatIndicatorsTable = pgTable("threat_indicators", {
  id: serial("id").primaryKey(),
  type: indicatorTypeEnum("type").notNull(),
  value: text("value").notNull(),
  category: threatCategoryEnum("category").notNull(),
  confidence: integer("confidence").notNull().default(50),
  source: text("source").notNull().default("manual"),
  description: text("description").notNull().default(""),
  firstSeen: timestamp("first_seen").notNull().defaultNow(),
  lastSeen: timestamp("last_seen").notNull().defaultNow(),
});

export const insertThreatIndicatorSchema = createInsertSchema(threatIndicatorsTable).omit({
  id: true,
  firstSeen: true,
  lastSeen: true,
});
export type InsertThreatIndicator = z.infer<typeof insertThreatIndicatorSchema>;
export type ThreatIndicator = typeof threatIndicatorsTable.$inferSelect;
