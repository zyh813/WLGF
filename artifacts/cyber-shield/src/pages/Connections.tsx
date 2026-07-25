import { useState } from "react";
import { 
  useGetConnections, 
  useBlockConnection, 
  getGetConnectionsQueryKey,
  NetworkConnectionStatus
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, ShieldBan, Filter } from "lucide-react";
import { toast } from "sonner";

export default function Connections() {
  const [statusFilter, setStatusFilter] = useState<NetworkConnectionStatus | 'all'>('all');
  
  const queryClient = useQueryClient();
  const { data: connections, isLoading } = useGetConnections();
  const blockConnection = useBlockConnection();

  const handleBlock = (id: number) => {
    blockConnection.mutate({ id }, {
      onSuccess: () => {
        toast.success("Connection blocked and IP blacklisted");
        queryClient.invalidateQueries({ queryKey: getGetConnectionsQueryKey() });
      },
      onError: () => {
        toast.error("Failed to block connection");
      }
    });
  };

  const filteredConnections = (connections || []).filter(conn => {
    if (statusFilter !== 'all' && conn.status !== statusFilter) return false;
    return true;
  });

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold uppercase tracking-widest text-primary drop-shadow-[0_0_10px_rgba(0,255,255,0.5)] flex items-center gap-3">
            <Activity className="w-8 h-8" />
            Active Connections
          </h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">Monitor real-time network sessions and traffic</p>
        </div>
        
        <div className="flex items-center gap-2 bg-card p-1 rounded-sm border border-border">
          <Filter className="w-4 h-4 text-muted-foreground mx-2" />
          <select 
            className="bg-transparent font-mono text-sm border-none text-foreground focus:ring-0 outline-none p-2 cursor-pointer"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as NetworkConnectionStatus | 'all')}
          >
            <option value="all" className="bg-card">All Connections</option>
            <option value="active" className="bg-card">Active</option>
            <option value="suspicious" className="bg-card">Suspicious</option>
            <option value="blocked" className="bg-card">Blocked</option>
          </select>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Protocol</TableHead>
                <TableHead>Traffic (In/Out)</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Uptime</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-primary font-mono animate-pulse">
                    Monitoring network streams...
                  </TableCell>
                </TableRow>
              ) : filteredConnections.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground font-mono">
                    No active connections found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredConnections.map((conn) => (
                  <TableRow key={conn.id} className={conn.status === 'suspicious' ? 'bg-warning/5' : conn.status === 'blocked' ? 'bg-destructive/5' : ''}>
                    <TableCell>
                      {conn.status === 'active' && <Badge variant="success">ACTIVE</Badge>}
                      {conn.status === 'suspicious' && <Badge variant="warning" className="animate-pulse">SUSPICIOUS</Badge>}
                      {conn.status === 'blocked' && <Badge variant="destructive">BLOCKED</Badge>}
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-sm text-primary/90">{conn.sourceIp}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">Port {conn.sourcePort}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-sm text-foreground">{conn.destinationIp}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">Port {conn.destinationPort}</div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs px-2 py-1 bg-muted/50 rounded-sm uppercase border border-border/50 text-muted-foreground">
                        {conn.protocol}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-xs flex flex-col gap-1">
                        <span className="text-primary flex items-center gap-1">
                          <span className="inline-block w-2 h-2">↓</span> {formatBytes(conn.bytesIn)}
                        </span>
                        <span className="text-muted-foreground flex items-center gap-1">
                          <span className="inline-block w-2 h-2">↑</span> {formatBytes(conn.bytesOut)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-display tracking-wider text-xs uppercase">{conn.country}</span>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {new Date(conn.connectedAt).toLocaleTimeString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {conn.status !== 'blocked' && (
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          onClick={() => handleBlock(conn.id)}
                          disabled={blockConnection.isPending}
                          className="h-7 text-xs"
                        >
                          <ShieldBan className="w-3 h-3 mr-1" />
                          Block
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
