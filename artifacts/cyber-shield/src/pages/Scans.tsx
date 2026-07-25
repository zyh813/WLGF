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
import { Card, CardContent } from "@/components/ui/card";
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
  target: z.string().min(1, "请输入目标IP或主机名"),
  type: z.enum(["port", "vulnerability", "full"]),
});

type ScanFormValues = z.infer<typeof scanSchema>;

const scanTypeLabel: Record<string, string> = {
  port: "端口扫描",
  vulnerability: "漏洞扫描",
  full: "全面审计",
};

const scanStatusLabel: Record<string, string> = {
  running: "扫描中",
  completed: "已完成",
  failed: "失败",
};

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
        toast.success("扫描任务已发起");
        setIsStartOpen(false);
        form.reset();
        queryClient.invalidateQueries({ queryKey: getGetScansQueryKey() });
      },
      onError: () => toast.error("发起扫描失败")
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold uppercase tracking-widest text-primary drop-shadow-[0_0_10px_rgba(0,255,255,0.5)] flex items-center gap-3">
            <Radar className="w-8 h-8" />
            漏洞扫描
          </h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">主动探测威胁面，识别系统安全漏洞</p>
        </div>
        
        <Dialog open={isStartOpen} onOpenChange={setIsStartOpen}>
          <DialogTrigger asChild>
            <Button>
              <Play className="w-4 h-4 mr-2" />
              发起扫描
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                配置扫描目标
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="target"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>目标主机 / IP范围</FormLabel>
                      <FormControl>
                        <Input placeholder="192.168.1.100 或 internal-server.local" {...field} />
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
                      <FormLabel>扫描模式</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="选择扫描类型" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="port">端口发现（快速）</SelectItem>
                          <SelectItem value="vulnerability">漏洞扫描（标准）</SelectItem>
                          <SelectItem value="full">全面审计（深度，较慢）</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={startScan.isPending} className="w-full sm:w-auto mt-4">
                    {startScan.isPending ? "初始化中..." : "启动扫描"}
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
            正在读取扫描记录...
          </div>
        ) : (scans || []).length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-muted-foreground border border-border/50 bg-card rounded-sm">
            <Radar className="w-12 h-12 mb-4 opacity-20" />
            <div className="font-display uppercase tracking-widest">暂无扫描记录</div>
            <div className="font-mono text-sm mt-2">发起新的扫描以检测系统漏洞。</div>
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
                            {scanStatusLabel[scan.status] || scan.status}
                          </Badge>
                          <Badge variant="secondary">{scanTypeLabel[scan.type] || scan.type}</Badge>
                        </div>
                        <div className="font-mono text-xs text-muted-foreground flex gap-4">
                          <span>开始：{new Date(scan.startedAt).toLocaleString('zh-CN')}</span>
                          {scan.completedAt && <span>完成：{new Date(scan.completedAt).toLocaleString('zh-CN')}</span>}
                        </div>
                      </div>
                    </div>

                    {scan.status === 'running' && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-mono text-primary">
                          <span>扫描中...</span>
                          <span>进行中</span>
                        </div>
                        <Progress value={65} className="h-1.5" />
                      </div>
                    )}
                  </div>

                  {/* Results Section */}
                  {(scan.status === 'completed' || scan.status === 'failed') && (
                    <div className="md:w-64 bg-background/50 border border-border/50 rounded-sm p-4 flex flex-col justify-center">
                      <div className="text-xs font-display text-muted-foreground uppercase mb-2 text-center tracking-widest border-b border-border/50 pb-2">
                        发现漏洞
                      </div>
                      <div className="flex items-center justify-around mt-2">
                        <div className="text-center group relative cursor-help">
                          <div className="font-display text-xl text-destructive font-bold">{scan.criticalCount}</div>
                          <div className="text-[10px] font-mono text-destructive uppercase">严重</div>
                        </div>
                        <div className="w-px h-8 bg-border" />
                        <div className="text-center group relative cursor-help">
                          <div className="font-display text-xl text-warning font-bold">{scan.highCount}</div>
                          <div className="text-[10px] font-mono text-warning uppercase">高危</div>
                        </div>
                        <div className="w-px h-8 bg-border" />
                        <div className="text-center group relative cursor-help">
                          <div className="font-display text-xl text-primary font-bold">{scan.mediumCount}</div>
                          <div className="text-[10px] font-mono text-primary uppercase">中危</div>
                        </div>
                        <div className="w-px h-8 bg-border" />
                        <div className="text-center group relative cursor-help">
                          <div className="font-display text-xl text-muted-foreground font-bold">{scan.lowCount}</div>
                          <div className="text-[10px] font-mono text-muted-foreground uppercase">低危</div>
                        </div>
                      </div>
                      
                      {scan.criticalCount > 0 && (
                        <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-center gap-2 text-xs font-mono text-destructive">
                          <ShieldAlert className="w-3 h-3" />
                          需立即处置
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
