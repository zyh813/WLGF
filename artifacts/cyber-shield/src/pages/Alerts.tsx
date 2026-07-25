import { useState } from "react";
import { useGetAlerts, useResolveAlert, getGetAlertsQueryKey, AlertSeverity, AlertStatus } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldAlert, ShieldCheck, Filter, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const severityLabel: Record<string, string> = {
  critical: "严重",
  high: "高危",
  medium: "中危",
  low: "低危",
};

const typeLabel: Record<string, string> = {
  intrusion: "入侵",
  ddos: "DDoS",
  malware: "恶意软件",
  brute_force: "暴力破解",
  port_scan: "端口扫描",
  sql_injection: "SQL注入",
  xss: "XSS",
  other: "其他",
};

export default function Alerts() {
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<AlertStatus | 'all'>('all');
  
  const queryClient = useQueryClient();
  const { data: alerts, isLoading } = useGetAlerts();
  const resolveAlert = useResolveAlert();

  const handleResolve = (id: number) => {
    resolveAlert.mutate({ id }, {
      onSuccess: () => {
        toast.success("告警已成功处置");
        queryClient.invalidateQueries({ queryKey: getGetAlertsQueryKey() });
      },
      onError: () => {
        toast.error("处置告警失败");
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
            安全告警
          </h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">排查并处置已检测到的威胁事件</p>
        </div>
        
        <div className="flex items-center gap-2 bg-card p-1 rounded-sm border border-border">
          <Filter className="w-4 h-4 text-muted-foreground mx-2" />
          <select 
            className="bg-transparent font-mono text-sm border-none text-foreground focus:ring-0 outline-none p-2 cursor-pointer"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as AlertSeverity | 'all')}
          >
            <option value="all" className="bg-card">全部级别</option>
            <option value="critical" className="bg-card">严重</option>
            <option value="high" className="bg-card">高危</option>
            <option value="medium" className="bg-card">中危</option>
            <option value="low" className="bg-card">低危</option>
          </select>
          <div className="w-px h-6 bg-border mx-1" />
          <select 
            className="bg-transparent font-mono text-sm border-none text-foreground focus:ring-0 outline-none p-2 cursor-pointer"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as AlertStatus | 'all')}
          >
            <option value="all" className="bg-card">全部状态</option>
            <option value="active" className="bg-card">处理中</option>
            <option value="resolved" className="bg-card">已处置</option>
          </select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>级别</TableHead>
                <TableHead>事件详情</TableHead>
                <TableHead>攻击类型</TableHead>
                <TableHead>来源IP</TableHead>
                <TableHead>检测时间</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-primary font-mono animate-pulse">
                    正在扫描告警数据库...
                  </TableCell>
                </TableRow>
              ) : filteredAlerts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground font-mono">
                    当前筛选条件下无告警记录。
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
                        {severityLabel[alert.severity] || alert.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-display font-medium text-foreground">{alert.title}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[300px]" title={alert.description}>
                        {alert.description}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {typeLabel[alert.type] || alert.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-primary/80">
                      {alert.sourceIp}
                      {alert.targetPort ? `:${alert.targetPort}` : ''}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(alert.detectedAt).toLocaleString('zh-CN')}
                    </TableCell>
                    <TableCell>
                      {alert.status === 'active' ? (
                        <span className="flex items-center gap-2 text-warning">
                          <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" /> 处理中
                        </span>
                      ) : (
                        <span className="flex items-center gap-2 text-success opacity-70">
                          <CheckCircle2 className="w-3 h-3" /> 已处置
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
                          处置
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
