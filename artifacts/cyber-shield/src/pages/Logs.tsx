import { useState } from "react";
import { 
  useGetLogs, 
  SecurityLogLevel
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollText, Filter, Terminal } from "lucide-react";

const levelLabel: Record<string, string> = {
  info: "信息",
  warning: "警告",
  error: "错误",
  critical: "严重",
};

export default function Logs() {
  const [levelFilter, setLevelFilter] = useState<SecurityLogLevel | 'all'>('all');
  
  const { data: logs, isLoading } = useGetLogs({ 
    limit: 100 
  });

  const filteredLogs = (logs || []).filter(log => {
    if (levelFilter !== 'all' && log.level !== levelFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-display font-bold uppercase tracking-widest text-primary drop-shadow-[0_0_10px_rgba(0,255,255,0.5)] flex items-center gap-3">
            <ScrollText className="w-8 h-8" />
            安全日志
          </h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">原始安全事件流与系统审计记录</p>
        </div>
        
        <div className="flex items-center gap-2 bg-card p-1 rounded-sm border border-border">
          <Filter className="w-4 h-4 text-muted-foreground mx-2" />
          <select 
            className="bg-transparent font-mono text-sm border-none text-foreground focus:ring-0 outline-none p-2 cursor-pointer"
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value as SecurityLogLevel | 'all')}
          >
            <option value="all" className="bg-card">全部级别</option>
            <option value="info" className="bg-card">信息</option>
            <option value="warning" className="bg-card">警告</option>
            <option value="error" className="bg-card">错误</option>
            <option value="critical" className="bg-card">严重</option>
          </select>
        </div>
      </div>

      <Card className="flex-1 flex flex-col min-h-0 border-primary/20 shadow-[0_0_20px_hsl(var(--primary)/0.05)]">
        <div className="bg-card border-b border-border/50 p-2 flex items-center gap-2">
          <Terminal className="w-4 h-4 text-primary ml-2" />
          <span className="font-mono text-xs text-primary uppercase tracking-widest">/var/log/syslog/security.log</span>
        </div>
        <CardContent className="p-0 flex-1 overflow-auto bg-[#030712]">
          <Table>
            <TableHeader className="sticky top-0 bg-[#030712]/90 backdrop-blur-sm z-10 border-b border-primary/20">
              <TableRow className="border-0 hover:bg-transparent">
                <TableHead className="w-[180px]">时间戳</TableHead>
                <TableHead className="w-[100px]">级别</TableHead>
                <TableHead className="w-[150px]">来源</TableHead>
                <TableHead>事件描述</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="font-mono text-xs">
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12 text-primary animate-pulse border-0">
                    正在读取日志流...
                  </TableCell>
                </TableRow>
              ) : filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12 text-muted-foreground border-0">
                    当前筛选条件下无日志记录。
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id} className="border-b border-white/5 hover:bg-white/5 transition-none">
                    <TableCell className="text-muted-foreground whitespace-nowrap">
                      {new Date(log.timestamp).toISOString().replace('T', ' ').replace('Z', '')}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-0.5 rounded-sm text-[10px] uppercase font-bold tracking-wider ${
                        log.level === 'critical' ? 'bg-destructive/20 text-destructive border border-destructive/30' :
                        log.level === 'error' ? 'bg-destructive/10 text-destructive' :
                        log.level === 'warning' ? 'bg-warning/10 text-warning' :
                        'bg-primary/10 text-primary'
                      }`}>
                        {levelLabel[log.level] || log.level}
                      </span>
                    </TableCell>
                    <TableCell className="text-primary/70">{log.source}</TableCell>
                    <TableCell>
                      <div className="text-foreground/90 font-medium">{log.message}</div>
                      {log.details && (
                        <div className="mt-1 text-muted-foreground/70 text-[10px] bg-white/5 p-1 rounded-sm overflow-x-auto whitespace-pre">
                          {log.details}
                        </div>
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
