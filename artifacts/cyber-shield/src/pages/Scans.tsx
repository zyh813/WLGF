import { useState } from "react";
import { 
  useGetScans, 
  useStartScan,
  getGetScansQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Radar, Play, Target, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

const scanSchema = z.object({
  target: z.string().min(1, "Target IP or hostname is required"),
  type: z.enum(["port", "vulnerability", "full"]),
});

type ScanFormValues = z.infer<typeof scanSchema>;

export default function Scans() {
  const queryClient = useQueryClient();
  const { data: scans, isLoading } = useGetScans();
  const startScan = useStartScan();
  
  const [isStartOpen, setIsStartOpen] = useState(false);

  const form = useForm<ScanFormValues>({
    resolver: zodResolver(scanSchema),
    defaultValues: {
      target: "",
      type: "vulnerability",
    },
  });

  const onSubmit = (data: ScanFormValues) => {
    startScan.mutate({ data }, {
      onSuccess: () => {
        toast.success("Scan sequence initiated");
        setIsStartOpen(false);
        form.reset();
        queryClient.invalidateQueries({ queryKey: getGetScansQueryKey() });
      },
      onError: () => toast.error("Failed to start scan")
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold uppercase tracking-widest text-primary drop-shadow-[0_0_10px_rgba(0,255,255,0.5)] flex items-center gap-3">
            <Radar className="w-8 h-8" />
            Vulnerability Scans
          </h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">Proactive threat detection and surface area analysis</p>
        </div>
        
        <Dialog open={isStartOpen} onOpenChange={setIsStartOpen}>
          <DialogTrigger asChild>
            <Button>
              <Play className="w-4 h-4 mr-2" />
              Initialize Scan
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Configure Scan Target
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="target"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Host / IP Range</FormLabel>
                      <FormControl>
                        <Input placeholder="192.168.1.100 or internal-server.local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Scan Profile</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select scan type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="port">PORT DISCOVERY (Fast)</SelectItem>
                          <SelectItem value="vulnerability">VULNERABILITY SCAN (Standard)</SelectItem>
                          <SelectItem value="full">FULL AUDIT (Deep, Slow)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={startScan.isPending} className="w-full sm:w-auto mt-4">
                    {startScan.isPending ? "Initializing..." : "Launch Sequence"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <div className="flex items-center justify-center p-12 text-primary font-mono animate-pulse border border-border/50 bg-card rounded-sm">
            Retrieving scan logs...
          </div>
        ) : (scans || []).length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-muted-foreground border border-border/50 bg-card rounded-sm">
            <Radar className="w-12 h-12 mb-4 opacity-20" />
            <div className="font-display uppercase tracking-widest">No scans executed</div>
            <div className="font-mono text-sm mt-2">Initialize a new scan to detect vulnerabilities.</div>
          </div>
        ) : (
          scans?.map((scan) => (
            <Card key={scan.id} className={scan.status === 'running' ? 'border-primary shadow-[0_0_15px_hsl(var(--primary)/0.2)]' : ''}>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Info Section */}
                  <div className="flex-1 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-mono text-lg font-bold text-foreground">{scan.target}</h3>
                          <Badge variant={scan.status === 'running' ? 'default' : scan.status === 'completed' ? 'outline' : 'destructive'} 
                                 className={scan.status === 'running' ? 'animate-pulse' : ''}>
                            {scan.status}
                          </Badge>
                          <Badge variant="secondary">{scan.type} scan</Badge>
                        </div>
                        <div className="font-mono text-xs text-muted-foreground flex gap-4">
                          <span>Started: {new Date(scan.startedAt).toLocaleString()}</span>
                          {scan.completedAt && <span>Completed: {new Date(scan.completedAt).toLocaleString()}</span>}
                        </div>
                      </div>
                    </div>

                    {scan.status === 'running' && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-mono text-primary">
                          <span>Scanning...</span>
                          <span>In Progress</span>
                        </div>
                        <Progress value={65} className="h-1.5" />
                      </div>
                    )}
                  </div>

                  {/* Results Section */}
                  {(scan.status === 'completed' || scan.status === 'failed') && (
                    <div className="md:w-64 bg-background/50 border border-border/50 rounded-sm p-4 flex flex-col justify-center">
                      <div className="text-xs font-display text-muted-foreground uppercase mb-2 text-center tracking-widest border-b border-border/50 pb-2">
                        Vulnerabilities Found
                      </div>
                      <div className="flex items-center justify-around mt-2">
                        <div className="text-center group relative cursor-help">
                          <div className="font-display text-xl text-destructive font-bold">{scan.criticalCount}</div>
                          <div className="text-[10px] font-mono text-destructive uppercase">Crit</div>
                        </div>
                        <div className="w-px h-8 bg-border" />
                        <div className="text-center group relative cursor-help">
                          <div className="font-display text-xl text-warning font-bold">{scan.highCount}</div>
                          <div className="text-[10px] font-mono text-warning uppercase">High</div>
                        </div>
                        <div className="w-px h-8 bg-border" />
                        <div className="text-center group relative cursor-help">
                          <div className="font-display text-xl text-primary font-bold">{scan.mediumCount}</div>
                          <div className="text-[10px] font-mono text-primary uppercase">Med</div>
                        </div>
                        <div className="w-px h-8 bg-border" />
                        <div className="text-center group relative cursor-help">
                          <div className="font-display text-xl text-muted-foreground font-bold">{scan.lowCount}</div>
                          <div className="text-[10px] font-mono text-muted-foreground uppercase">Low</div>
                        </div>
                      </div>
                      
                      {scan.criticalCount > 0 && (
                        <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-center gap-2 text-xs font-mono text-destructive">
                          <ShieldAlert className="w-3 h-3" />
                          Requires immediate action
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
