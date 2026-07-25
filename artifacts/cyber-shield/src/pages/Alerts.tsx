import { useState } from "react";
import { useGetAlerts, useResolveAlert, getGetAlertsQueryKey, AlertSeverity, AlertStatus } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldAlert, ShieldCheck, Filter, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function Alerts() {
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<AlertStatus | 'all'>('all');
  
  const queryClient = useQueryClient();
  const { data: alerts, isLoading } = useGetAlerts();
  const resolveAlert = useResolveAlert();

  const handleResolve = (id: number) => {
    resolveAlert.mutate({ id }, {
      onSuccess: () => {
        toast.success("Alert resolved successfully");
        queryClient.invalidateQueries({ queryKey: getGetAlertsQueryKey() });
      },
      onError: () => {
        toast.error("Failed to resolve alert");
      }
    });
  };

  const filteredAlerts = (alerts || []).filter(alert => {
    if (severityFilter !== 'all' && alert.severity !== severityFilter) return false;
    if (statusFilter !== 'all' && alert.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold uppercase tracking-widest text-primary drop-shadow-[0_0_10px_rgba(0,255,255,0.5)] flex items-center gap-3">
            <ShieldAlert className="w-8 h-8" />
            Security Alerts
          </h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">Investigate and remediate detected threats</p>
        </div>
        
        <div className="flex items-center gap-2 bg-card p-1 rounded-sm border border-border">
          <Filter className="w-4 h-4 text-muted-foreground mx-2" />
          <select 
            className="bg-transparent font-mono text-sm border-none text-foreground focus:ring-0 outline-none p-2 cursor-pointer"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as AlertSeverity | 'all')}
          >
            <option value="all" className="bg-card">All Severities</option>
            <option value="critical" className="bg-card">Critical</option>
            <option value="high" className="bg-card">High</option>
            <option value="medium" className="bg-card">Medium</option>
            <option value="low" className="bg-card">Low</option>
          </select>
          <div className="w-px h-6 bg-border mx-1" />
          <select 
            className="bg-transparent font-mono text-sm border-none text-foreground focus:ring-0 outline-none p-2 cursor-pointer"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as AlertStatus | 'all')}
          >
            <option value="all" className="bg-card">All Statuses</option>
            <option value="active" className="bg-card">Active</option>
            <option value="resolved" className="bg-card">Resolved</option>
          </select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Severity</TableHead>
                <TableHead>Event Details</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Source IP</TableHead>
                <TableHead>Detected At</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-primary font-mono animate-pulse">
                    Scanning alert database...
                  </TableCell>
                </TableRow>
              ) : filteredAlerts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground font-mono">
                    No alerts match the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredAlerts.map((alert) => (
                  <TableRow key={alert.id} className={alert.status === 'active' && alert.severity === 'critical' ? 'bg-destructive/5' : ''}>
                    <TableCell>
                      <Badge variant={
                        alert.severity === 'critical' ? 'destructive' :
                        alert.severity === 'high' ? 'warning' :
                        alert.severity === 'medium' ? 'default' : 'info'
                      }>
                        {alert.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-display font-medium text-foreground uppercase">{alert.title}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[300px]" title={alert.description}>
                        {alert.description}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-[10px]">{alert.type.replace('_', ' ')}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-primary/80">
                      {alert.sourceIp}
                      {alert.targetPort ? `:${alert.targetPort}` : ''}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(alert.detectedAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {alert.status === 'active' ? (
                        <span className="flex items-center gap-2 text-warning">
                          <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" /> Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-2 text-success opacity-70">
                          <CheckCircle2 className="w-3 h-3" /> Resolved
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {alert.status === 'active' && (
                        <Button 
                          size="sm" 
                          variant="safe" 
                          onClick={() => handleResolve(alert.id)}
                          disabled={resolveAlert.isPending}
                          className="h-7 text-xs"
                        >
                          <ShieldCheck className="w-3 h-3 mr-1" />
                          Resolve
                        </Button>
                      )}
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

