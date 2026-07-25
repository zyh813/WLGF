import { pgTable, serial, text, integer, timestamp, pgEnum, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const scanTypeEnum = pgEnum("scan_type", ["port", "vulnerability", "full"]);
export const scanStatusEnum = pgEnum("scan_status", ["running", "completed", "failed"]);
export const assetRiskEnum = pgEnum("asset_risk", ["critical", "high", "medium", "low"]);

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

export type AssetService = {
  port: number;
  protocol: string;
  service: string;
  version: string;
};

export const assetsTable = pgTable("assets", {
  id: serial("id").primaryKey(),
  host: text("host").notNull(),
  ipAddress: text("ip_address").notNull(),
  os: text("os").notNull().default("Unknown"),
  services: jsonb("services").notNull().default([]).$type<AssetService[]>(),
  riskLevel: assetRiskEnum("risk_level").notNull().default("low"),
  openVulnerabilities: integer("open_vulnerabilities").notNull().default(0),
  lastSeen: timestamp("last_seen").notNull().defaultNow(),
});

export const insertAssetSchema = createInsertSchema(assetsTable).omit({ id: true, lastSeen: true });
export type InsertAsset = z.infer<typeof insertAssetSchema>;
export type Asset = typeof assetsTable.$inferSelect;

export const reconJobsTable = pgTable("recon_jobs", {
  id: serial("id").primaryKey(),
  target: text("target").notNull(),
  status: scanStatusEnum("status").notNull().default("running"),
  discoveredCount: integer("discovered_count").notNull().default(0),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertReconJobSchema = createInsertSchema(reconJobsTable).omit({ id: true, status: true, discoveredCount: true, startedAt: true, completedAt: true });
export type InsertReconJob = z.infer<typeof insertReconJobSchema>;
export type ReconJob = typeof reconJobsTable.$inferSelect;
