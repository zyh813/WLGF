import { pgTable, serial, text, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const firewallActionEnum = pgEnum("firewall_action", ["allow", "deny", "drop", "log"]);
export const protocolEnum = pgEnum("protocol", ["tcp", "udp", "icmp", "any"]);

export const firewallRulesTable = pgTable("firewall_rules", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  action: firewallActionEnum("action").notNull(),
  protocol: protocolEnum("protocol").notNull(),
  sourceIp: text("source_ip").notNull(),
  destinationPort: text("destination_port").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  priority: integer("priority").notNull().default(100),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertFirewallRuleSchema = createInsertSchema(firewallRulesTable).omit({ id: true, createdAt: true });
export type InsertFirewallRule = z.infer<typeof insertFirewallRuleSchema>;
export type FirewallRule = typeof firewallRulesTable.$inferSelect;
