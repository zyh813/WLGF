import { pgTable, serial, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const connectionStatusEnum = pgEnum("connection_status", ["active", "blocked", "suspicious"]);
export const connectionProtocolEnum = pgEnum("connection_protocol", ["tcp", "udp", "icmp"]);

export const connectionsTable = pgTable("network_connections", {
  id: serial("id").primaryKey(),
  sourceIp: text("source_ip").notNull(),
  sourcePort: integer("source_port").notNull(),
  destinationIp: text("destination_ip").notNull(),
  destinationPort: integer("destination_port").notNull(),
  protocol: connectionProtocolEnum("protocol").notNull(),
  status: connectionStatusEnum("status").notNull().default("active"),
  bytesIn: integer("bytes_in").notNull().default(0),
  bytesOut: integer("bytes_out").notNull().default(0),
  country: text("country").notNull().default("Unknown"),
  connectedAt: timestamp("connected_at").notNull().defaultNow(),
});

export const insertConnectionSchema = createInsertSchema(connectionsTable).omit({ id: true, connectedAt: true });
export type InsertConnection = z.infer<typeof insertConnectionSchema>;
export type Connection = typeof connectionsTable.$inferSelect;
