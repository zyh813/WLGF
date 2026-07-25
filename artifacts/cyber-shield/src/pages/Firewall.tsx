import { useState } from "react";
import { 
  useGetFirewallRules, 
  useCreateFirewallRule, 
  useUpdateFirewallRule, 
  useDeleteFirewallRule,
  getGetFirewallRulesQueryKey,
  FirewallRuleAction,
  FirewallRuleProtocol
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const ruleSchema = z.object({
  name: z.string().min(2, "Name is required"),
  description: z.string().optional(),
  action: z.enum(["allow", "deny", "drop", "log"]),
  protocol: z.enum(["tcp", "udp", "icmp", "any"]),
  sourceIp: z.string().min(1, "Source IP is required"),
  destinationPort: z.string().min(1, "Port is required"),
  priority: z.coerce.number().min(1).max(9999),
  enabled: z.boolean().default(true),
});

type RuleFormValues = z.infer<typeof ruleSchema>;

export default function Firewall() {
  const queryClient = useQueryClient();
  const { data: rules, isLoading } = useGetFirewallRules();
  const createRule = useCreateFirewallRule();
  const updateRule = useUpdateFirewallRule();
  const deleteRule = useDeleteFirewallRule();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const form = useForm<RuleFormValues>({
    resolver: zodResolver(ruleSchema),
    defaultValues: {
      name: "",
      description: "",
      action: "allow",
      protocol: "tcp",
      sourceIp: "0.0.0.0/0",
      destinationPort: "80,443",
      priority: 100,
      enabled: true,
    },
  });

  const onSubmit = (data: RuleFormValues) => {
    createRule.mutate({ data }, {
      onSuccess: () => {
        toast.success("Firewall rule created");
        setIsCreateOpen(false);
        form.reset();
        queryClient.invalidateQueries({ queryKey: getGetFirewallRulesQueryKey() });
      },
      onError: () => toast.error("Failed to create rule")
    });
  };

  const handleToggle = (id: number, enabled: boolean) => {
    updateRule.mutate({ id, data: { enabled } }, {
      onSuccess: () => {
        toast.success(`Rule ${enabled ? 'enabled' : 'disabled'}`);
        queryClient.invalidateQueries({ queryKey: getGetFirewallRulesQueryKey() });
      },
      onError: () => toast.error("Failed to update rule")
    });
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this rule?")) {
      deleteRule.mutate({ id }, {
        onSuccess: () => {
          toast.success("Rule deleted");
          queryClient.invalidateQueries({ queryKey: getGetFirewallRulesQueryKey() });
        },
        onError: () => toast.error("Failed to delete rule")
      });
    }
  };

  // Sort by priority
  const sortedRules = [...(rules || [])].sort((a, b) => a.priority - b.priority);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold uppercase tracking-widest text-primary drop-shadow-[0_0_10px_rgba(0,255,255,0.5)] flex items-center gap-3">
            <Shield className="w-8 h-8" />
            Firewall Rules
          </h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">Manage inbound/outbound access control lists</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add Firewall Rule</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Rule Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Block Malicious IP Range" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="action"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Action</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select action" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="allow">ALLOW</SelectItem>
                            <SelectItem value="deny">DENY</SelectItem>
                            <SelectItem value="drop">DROP</SelectItem>
                            <SelectItem value="log">LOG</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="protocol"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Protocol</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select protocol" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="tcp">TCP</SelectItem>
                            <SelectItem value="udp">UDP</SelectItem>
                            <SelectItem value="icmp">ICMP</SelectItem>
                            <SelectItem value="any">ANY</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="sourceIp"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Source IP / CIDR</FormLabel>
                        <FormControl>
                          <Input placeholder="192.168.1.0/24 or *" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="destinationPort"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dest Port(s)</FormLabel>
                        <FormControl>
                          <Input placeholder="80,443 or *" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority (lower = first)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createRule.isPending}>
                    {createRule.isPending ? "Deploying..." : "Deploy Rule"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Prio</TableHead>
                <TableHead>Rule Name</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Protocol</TableHead>
                <TableHead>Source IP</TableHead>
                <TableHead>Dest Port</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Manage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-primary font-mono animate-pulse">
                    Loading firewall configuration...
                  </TableCell>
                </TableRow>
              ) : sortedRules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground font-mono">
                    No firewall rules configured.
                  </TableCell>
                </TableRow>
              ) : (
                sortedRules.map((rule) => (
                  <TableRow key={rule.id} className={!rule.enabled ? 'opacity-50' : ''}>
                    <TableCell className="font-mono text-xs">{rule.priority}</TableCell>
                    <TableCell>
                      <div className="font-display font-medium text-foreground uppercase">{rule.name}</div>
                      {rule.description && (
                        <div className="text-xs text-muted-foreground">{rule.description}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        rule.action === 'allow' ? 'success' :
                        rule.action === 'deny' || rule.action === 'drop' ? 'destructive' : 'info'
                      }>
                        {rule.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs px-2 py-1 bg-muted/50 rounded-sm uppercase border border-border/50 text-primary">
                        {rule.protocol}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{rule.sourceIp}</TableCell>
                    <TableCell className="font-mono text-xs">{rule.destinationPort}</TableCell>
                    <TableCell>
                      <Switch 
                        checked={rule.enabled}
                        onCheckedChange={(checked) => handleToggle(rule.id, checked)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={() => handleDelete(rule.id)}
                        disabled={deleteRule.isPending}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
