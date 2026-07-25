import { useState } from "react";
import {
  useGetAssets,
  useGetReconJobs,
  useStartReconJob,
  getGetAssetsQueryKey,
  getGetReconJobsQueryKey,
} from "@workspace/api-client-react";
import type { Asset } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Radar, Play, Target, Server, ShieldAlert, Network, Clock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const reconSchema = z.object({
  target: z.string().min(1, "请输入目标IP或网段"),
});

type ReconFormValues = z.infer<typeof reconSchema>;

const riskLabel: Record<string, string> = {
  critical: "严重",
  high: "高危",
  medium: "中危",
  low: "低危",
};

const riskClass: Record<string, string> = {
  critical: "text-destructive border-destructive/50",
  high: "text-warning border-warning/50",
  medium: "text-primary border-primary/50",
  low: "text-muted-foreground border-border",
};

const jobStatusLabel: Record<string, string> = {
  running: "侦察中",
  completed: "已完成",
  failed: "失败",
};

const riskFilters = ["all", "critical", "high", "medium", "low"] as const;

export default function Assets() {
  const queryClient = useQueryClient();
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const assetsParams = riskFilter === "all" ? undefined : { risk: riskFilter as never };
  const { data: assets, isLoading } = useGetAssets(assetsParams, {
    query: { queryKey: getGetAssetsQueryKey(assetsParams), refetchInterval: 5000 },
  });
  const { data: jobs } = useGetReconJobs({
    query: { queryKey: getGetReconJobsQueryKey(), refetchInterval: 5000 },
  });
  const startRecon = useStartReconJob();

  const [isStartOpen, setIsStartOpen] = useState(false);
  const [selected, setSelected] = useState<Asset | null>(null);

  const form = useForm<ReconFormValues>({
    resolver: zodResolver(reconSchema),
    defaultValues: { target: "" },
  });

  const onSubmit = (data: ReconFormValues) => {
    startRecon.mutate(
      { data },
      {
        onSuccess: () => {
          toast.success("侦察任务已发起");
          setIsStartOpen(false);
          form.reset();
          queryClient.invalidateQueries({ queryKey: getGetReconJobsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetAssetsQueryKey() });
        },
        onError: () => toast.error("发起侦察失败"),
      },
    );
  };

  const runningJobs = (jobs || []).filter((j) => j.status === "running").length;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold uppercase tracking-widest text-primary drop-shadow-[0_0_10px_rgba(0,255,255,0.5)] flex items-center gap-3">
            <Radar className="w-8 h-8" />
            资产测绘
          </h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">侦察与资产发现 · 掌握你的攻击面</p>
        </div>

        <Dialog open={isStartOpen} onOpenChange={setIsStartOpen}>
          <DialogTrigger asChild>
            <Button>
              <Play className="w-4 h-4 mr-2" />
              发起侦察
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                配置侦察目标
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="target"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>目标网段 / 主机</FormLabel>
                      <FormControl>
                        <Input placeholder="10.0.0.0/24 或 internal-server.local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={startRecon.isPending} className="w-full sm:w-auto mt-4">
                    {startRecon.isPending ? "初始化中..." : "启动侦察"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Recon jobs summary */}
      {(jobs || []).length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Network className="w-5 h-5 text-primary" />
              <div>
                <div className="font-display text-2xl font-bold text-foreground">{(assets || []).length}</div>
                <div className="font-mono text-xs text-muted-foreground uppercase">已发现资产</div>
              </div>
            </CardContent>
          </Card>
          <Card className={runningJobs > 0 ? "border-primary shadow-[0_0_15px_hsl(var(--primary)/0.2)]" : ""}>
            <CardContent className="p-4 flex items-center gap-3">
              <Radar className={cn("w-5 h-5 text-primary", runningJobs > 0 && "animate-pulse")} />
              <div>
                <div className="font-display text-2xl font-bold text-foreground">{runningJobs}</div>
                <div className="font-mono text-xs text-muted-foreground uppercase">进行中的侦察</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-destructive" />
              <div>
                <div className="font-display text-2xl font-bold text-foreground">
                  {(assets || []).filter((a) => a.riskLevel === "critical").length}
                </div>
                <div className="font-mono text-xs text-muted-foreground uppercase">严重风险资产</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent recon jobs */}
      {(jobs || []).length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="font-display uppercase tracking-widest text-xs text-muted-foreground mb-3 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" /> 近期侦察任务
            </div>
            <div className="flex flex-col gap-2">
              {(jobs || []).slice(0, 4).map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between font-mono text-xs border border-border/40 rounded-sm px-3 py-2 bg-background/40"
                >
                  <span className="text-foreground">{job.target}</span>
                  <div className="flex items-center gap-3">
                    {job.status === "completed" && (
                      <span className="text-success">新增 {job.discoveredCount} 项资产</span>
                    )}
                    <Badge
                      variant={job.status === "running" ? "default" : job.status === "completed" ? "outline" : "destructive"}
                      className={job.status === "running" ? "animate-pulse" : ""}
                    >
                      {jobStatusLabel[job.status] || job.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Risk filters */}
      <div className="flex flex-wrap gap-2">
        {riskFilters.map((r) => (
          <Button
            key={r}
            size="sm"
            variant={riskFilter === r ? "default" : "outline"}
            onClick={() => setRiskFilter(r)}
          >
            {r === "all" ? "全部" : riskLabel[r]}
          </Button>
        ))}
      </div>

      {/* Asset table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center p-12 text-primary font-mono animate-pulse">
              正在读取资产清单...
            </div>
          ) : (assets || []).length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
              <Server className="w-12 h-12 mb-4 opacity-20" />
              <div className="font-display uppercase tracking-widest">暂无资产记录</div>
              <div className="font-mono text-sm mt-2">发起侦察扫描以发现网络中的资产。</div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>主机 / IP</TableHead>
                  <TableHead>操作系统</TableHead>
                  <TableHead>开放服务</TableHead>
                  <TableHead>风险等级</TableHead>
                  <TableHead>关联漏洞</TableHead>
                  <TableHead>最近发现</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(assets || []).map((asset) => (
                  <TableRow
                    key={asset.id}
                    className="cursor-pointer"
                    onClick={() => setSelected(asset)}
                  >
                    <TableCell>
                      <div className="font-mono text-foreground font-bold">{asset.host}</div>
                      <div className="font-mono text-xs text-muted-foreground">{asset.ipAddress}</div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{asset.os}</TableCell>
                    <TableCell className="font-mono text-xs text-foreground">
                      {asset.services.length} 个端口
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("uppercase", riskClass[asset.riskLevel])}>
                        {riskLabel[asset.riskLevel] || asset.riskLevel}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "font-display font-bold",
                          asset.openVulnerabilities > 0 ? "text-destructive" : "text-muted-foreground",
                        )}
                      >
                        {asset.openVulnerabilities}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {new Date(asset.lastSeen).toLocaleString("zh-CN")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Asset detail drawer */}
      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="font-mono flex items-center gap-2">
                  <Server className="w-5 h-5 text-primary" />
                  {selected.host}
                </SheetTitle>
                <SheetDescription className="font-mono">{selected.ipAddress}</SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="border border-border/40 rounded-sm p-3 bg-background/40">
                    <div className="font-mono text-[10px] uppercase text-muted-foreground">操作系统</div>
                    <div className="font-mono text-sm text-foreground mt-1">{selected.os}</div>
                  </div>
                  <div className="border border-border/40 rounded-sm p-3 bg-background/40">
                    <div className="font-mono text-[10px] uppercase text-muted-foreground">风险等级</div>
                    <Badge variant="outline" className={cn("mt-1 uppercase", riskClass[selected.riskLevel])}>
                      {riskLabel[selected.riskLevel] || selected.riskLevel}
                    </Badge>
                  </div>
                  <div className="border border-border/40 rounded-sm p-3 bg-background/40">
                    <div className="font-mono text-[10px] uppercase text-muted-foreground">关联开放漏洞</div>
                    <div
                      className={cn(
                        "font-display text-xl font-bold mt-1",
                        selected.openVulnerabilities > 0 ? "text-destructive" : "text-muted-foreground",
                      )}
                    >
                      {selected.openVulnerabilities}
                    </div>
                  </div>
                  <div className="border border-border/40 rounded-sm p-3 bg-background/40">
                    <div className="font-mono text-[10px] uppercase text-muted-foreground">最近发现</div>
                    <div className="font-mono text-xs text-foreground mt-1">
                      {new Date(selected.lastSeen).toLocaleString("zh-CN")}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="font-display uppercase tracking-widest text-xs text-muted-foreground mb-3 flex items-center gap-2">
                    <Network className="w-3.5 h-3.5" /> 指纹识别服务
                  </div>
                  {selected.services.length === 0 ? (
                    <div className="font-mono text-xs text-muted-foreground">未发现开放服务。</div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {selected.services.map((svc, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between font-mono text-xs border border-border/40 rounded-sm px-3 py-2 bg-background/40"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-primary font-bold w-16">
                              {svc.port}/{svc.protocol}
                            </span>
                            <span className="text-foreground">{svc.service}</span>
                          </div>
                          <span className="text-muted-foreground">{svc.version}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
