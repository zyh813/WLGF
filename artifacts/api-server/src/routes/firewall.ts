import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, firewallRulesTable } from "@workspace/db";
import {
  CreateFirewallRuleBody,
  UpdateFirewallRuleBody,
  UpdateFirewallRuleParams,
  DeleteFirewallRuleParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/firewall/rules", async (_req, res): Promise<void> => {
  const rules = await db.select().from(firewallRulesTable).orderBy(firewallRulesTable.priority);
  res.json(rules.map(formatRule));
});

router.post("/firewall/rules", async (req, res): Promise<void> => {
  const parsed = CreateFirewallRuleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [rule] = await db.insert(firewallRulesTable).values({
    ...parsed.data,
    description: parsed.data.description ?? "",
    enabled: parsed.data.enabled ?? true,
    priority: parsed.data.priority ?? 100,
  }).returning();
  res.status(201).json(formatRule(rule));
});

router.patch("/firewall/rules/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateFirewallRuleParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = UpdateFirewallRuleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [rule] = await db.update(firewallRulesTable)
    .set(parsed.data)
    .where(eq(firewallRulesTable.id, params.data.id))
    .returning();
  if (!rule) {
    res.status(404).json({ error: "Firewall rule not found" });
    return;
  }
  res.json(formatRule(rule));
});

router.delete("/firewall/rules/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteFirewallRuleParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [rule] = await db.delete(firewallRulesTable)
    .where(eq(firewallRulesTable.id, params.data.id))
    .returning();
  if (!rule) {
    res.status(404).json({ error: "Firewall rule not found" });
    return;
  }
  res.sendStatus(204);
});

function formatRule(r: typeof firewallRulesTable.$inferSelect) {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    action: r.action,
    protocol: r.protocol,
    sourceIp: r.sourceIp,
    destinationPort: r.destinationPort,
    enabled: r.enabled,
    priority: r.priority,
    createdAt: r.createdAt.toISOString(),
  };
}

export default router;
