import { useGetDashboardSummary, useGetTrafficStats, useGetRecentAlerts } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Shield, ShieldAlert, Activity, CheckCircle2 } from "lucide-react";

const severityLabel: Record<string, string> = {
  critical: "严重",
  high: "高危",
  medium: "中危",
  low: "低危",
};

export default function Dashboard() {
  const { data: summary, isLoading: isSummaryLoading } = useGetDashboardSummary();
  const { data: traffic, isLoading: isTrafficLoading } = useGetTrafficStats();
  const { data: alerts, isLoading: isAlertsLoading } = useGetRecentAlerts();

  if (isSummaryLoading || isTrafficLoading || isAlertsLoading) {
    return <div className="flex items-center justify-center h-full text-primary font-mono animate-pulse">正在初始化仪表盘...</div>;
  }

  const scoreColor = (summary?.securityScore || 0) > 80 ? "text-success" : (summary?.securityScore || 0) > 60 ? "text-warning" : "text-destructive";
  const scoreDropShadow = (summary?.securityScore || 0) > 80 ? "drop-shadow-[0_0_15px_hsl(var(--success))]" : (summary?.securityScore || 0) > 60 ? "drop-shadow-[0_0_15px_hsl(var(--warning))]" : "drop-shadow-[0_0_15px_hsl(var(--destructive))]";

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold uppercase tracking-widest text-primary drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]">
            网络安全态势
          </h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">实时威胁监测与安全态势感知</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs font-mono text-muted-foreground uppercase">当前威胁等级</div>
            <div className="font-display font-bold text-warning text-xl tracking-widest uppercase">警戒</div>
          </div>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-mono text-muted-foreground uppercase mb-1">安全评分</p>
              <h2 className={`text-4xl font-display font-bold ${scoreColor} ${scoreDropShadow}`}>
                {summary?.securityScore}%
              </h2>
            </div>
            <Shield className={`w-12 h-12 ${scoreColor} opacity-50`} />
          </CardContent>
        </Card>
        
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-mono text-muted-foreground uppercase mb-1">活跃威胁</p>
              <h2 className="text-4xl font-display font-bold text-destructive drop-shadow-[0_0_15px_hsl(var(--destructive))]">
                {summary?.activeThreats}
              </h2>
            </div>
            <ShieldAlert className="w-12 h-12 text-destructive opacity-50" />
          </CardContent>
        </Card>

        <Card className="border-warning/20 bg-warning/5">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-mono text-muted-foreground uppercase mb-1">已封锁连接</p>
              <h2 className="text-4xl font-display font-bold text-warning drop-shadow-[0_0_15px_hsl(var(--warning))]">
                {summary?.blockedConnections}
              </h2>
            </div>
            <Activity className="w-12 h-12 text-warning opacity-50" />
          </CardContent>
        </Card>

        <Card className="border-success/20 bg-success/5">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-mono text-muted-foreground uppercase mb-1">今日已处置</p>
              <h2 className="text-4xl font-display font-bold text-success drop-shadow-[0_0_15px_hsl(var(--success))]">
                {summary?.resolvedToday}
              </h2>
            </div>
            <CheckCircle2 className="w-12 h-12 text-success opacity-50" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Traffic Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>网络流量（近24小时）</CardTitle>
            <CardDescription>入站与出站流量及拦截异常统计</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={traffic || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorInbound" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorBlocked" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis 
                    dataKey="hour" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12} 
                    tickFormatter={(val) => val.split(':')[0] + '时'}
                    fontFamily="var(--app-font-mono)"
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12}
                    fontFamily="var(--app-font-mono)"
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', fontFamily: 'var(--app-font-mono)', fontSize: '12px' }}
                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                    formatter={(value, name) => [value, name === 'inbound' ? '入站' : '拦截']}
                  />
                  <Area type="monotone" dataKey="inbound" name="inbound" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorInbound)" />
                  <Area type="monotone" dataKey="blocked" name="blocked" stroke="hsl(var(--destructive))" fillOpacity={1} fill="url(#colorBlocked)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Alerts Feed */}
        <Card>
          <CardHeader>
            <CardTitle>实时告警动态</CardTitle>
            <CardDescription>近24小时威胁检测事件</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(alerts || []).slice(0, 5).map((alert) => (
                <div key={alert.id} className="flex gap-4 items-start p-3 rounded-sm bg-muted/20 border border-border/50 hover:bg-muted/40 transition-colors">
                  <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                    alert.severity === 'critical' ? 'bg-destructive shadow-[0_0_8px_hsl(var(--destructive))]' :
                    alert.severity === 'high' ? 'bg-warning shadow-[0_0_8px_hsl(var(--warning))]' :
                    alert.severity === 'medium' ? 'bg-primary shadow-[0_0_8px_hsl(var(--primary))]' :
                    'bg-success shadow-[0_0_8px_hsl(var(--success))]'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-sm font-display font-medium text-foreground truncate">{alert.title}</p>
                      <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap ml-2">
                        {new Date(alert.detectedAt).toLocaleTimeString('zh-CN')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-muted-foreground truncate flex-1">{alert.sourceIp}</span>
                      <Badge variant={
                        alert.severity === 'critical' ? 'destructive' :
                        alert.severity === 'high' ? 'warning' :
                        alert.severity === 'medium' ? 'default' : 'secondary'
                      } className="text-[8px] px-1 py-0 h-4">
                        {severityLabel[alert.severity] || alert.severity}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
              {(!alerts || alerts.length === 0) && (
                <div className="text-center py-8 text-muted-foreground font-mono text-sm">
                  暂无最新告警。
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
