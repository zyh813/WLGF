import { useState } from "react";
import {
  useGetAttacks,
  useLaunchAttack,
  useGetExploits,
  getGetAttacksQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Swords, Play, Target, ShieldOff, ShieldCheck, Crosshair, Skull } from "lucide-react";
import { toast } from "sonner";

const attackSchema = z.object({
  target: z.string().min(1, "请输入目标IP或主机名"),
  type: z.enum(["sql_injection", "xss", "ddos", "brute_force", "port_scan", "phishing"]),
});

type AttackFormValues = z.infer<typeof attackSchema>;

const attackTypeLabel: Record<string, string> = {
  sql_injection: "SQL 注入",
  xss: "跨站脚本 (XSS)",
  ddos: "DDoS 洪水",
  brute_force: "暴力破解",
  port_scan: "端口扫描",
  phishing: "钓鱼攻击",
};

const attackStatusLabel: Record<string, string> = {
  running: "进行中",
  completed: "已完成",
  blocked: "已拦截",
};

const severityLabel: Record<string, string> = {
  critical: "严重",
  high: "高危",
  medium: "中危",
  low: "低危",
};

const severityClass: Record<string, string> = {
  critical: "text-destructive border-destructive/50",
  high: "text-warning border-warning/50",
  medium: "text-primary border-primary/50",
  low: "text-muted-foreground border-border",
};

export default function Attacks() {
  const queryClient = useQueryClient();
  const { data: campaigns, isLoading } = useGetAttacks({
    query: { queryKey: getGetAttacksQueryKey(), refetchInterval: 4000 },
  });
  const { data: exploits, isLoading: exploitsLoading } = useGetExploits();
  const launchAttack = useLaunchAttack();

  const [isLaunchOpen, setIsLaunchOpen] = useState(false);

  const form = useForm<AttackFormValues>({
    resolver: zodResolver(attackSchema),
    defaultValues: {
      target: "",
      type: "sql_injection",
    },
  });

  const onSubmit = (data: AttackFormValues) => {
    launchAttack.mutate(
      { data },
      {
        onSuccess: () => {
          toast.success("攻击模拟已发起");
          setIsLaunchOpen(false);
          form.reset();
          queryClient.invalidateQueries({ queryKey: getGetAttacksQueryKey() });
        },
        onError: () => toast.error("发起攻击模拟失败"),
      },
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold uppercase tracking-widest text-primary drop-shadow-[0_0_10px_rgba(0,255,255,0.5)] flex items-center gap-3">
            <Swords className="w-8 h-8" />
            攻击模拟
          </h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">
            红队演练：对目标发起模拟攻击（无真实流量），检验防御体系有效性
          </p>
        </div>

        <Dialog open={isLaunchOpen} onOpenChange={setIsLaunchOpen}>
          <DialogTrigger asChild>
            <Button>
              <Play className="w-4 h-4 mr-2" />
              发起攻击
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                配置攻击演练
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="target"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>目标主机 / IP</FormLabel>
                      <FormControl>
                        <Input placeholder="192.168.1.100 或 app.internal.local" {...field} />
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
                      <FormLabel>攻击类型</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="选择攻击类型" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(attackTypeLabel).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={launchAttack.isPending}
                    className="w-full sm:w-auto mt-4"
                  >
                    {launchAttack.isPending ? "初始化中..." : "启动攻击"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="campaigns" className="w-full">
        <TabsList>
          <TabsTrigger value="campaigns">
            <Crosshair className="w-4 h-4 mr-2" />
            攻击战役
          </TabsTrigger>
          <TabsTrigger value="library">
            <Skull className="w-4 h-4 mr-2" />
            漏洞利用库
          </TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="mt-4">
          <div className="grid grid-cols-1 gap-4">
            {isLoading ? (
              <div className="flex items-center justify-center p-12 text-primary font-mono animate-pulse border border-border/50 bg-card rounded-sm">
                正在读取攻击记录...
              </div>
            ) : (campaigns || []).length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-muted-foreground border border-border/50 bg-card rounded-sm">
                <Swords className="w-12 h-12 mb-4 opacity-20" />
                <div className="font-display uppercase tracking-widest">暂无攻击记录</div>
                <div className="font-mono text-sm mt-2">发起新的模拟攻击以检验防御能力。</div>
              </div>
            ) : (
              campaigns?.map((c) => (
                <Card
                  key={c.id}
                  className={
                    c.status === "running"
                      ? "border-primary shadow-[0_0_15px_hsl(var(--primary)/0.2)]"
                      : c.status === "blocked"
                        ? "border-destructive/40"
                        : "border-warning/40"
                  }
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-start gap-4 justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="font-mono text-lg font-bold text-foreground">{c.target}</h3>
                          <Badge variant="secondary">{attackTypeLabel[c.type] || c.type}</Badge>
                          <Badge
                            variant={
                              c.status === "running"
                                ? "default"
                                : c.status === "blocked"
                                  ? "destructive"
                                  : "outline"
                            }
                            className={c.status === "running" ? "animate-pulse" : ""}
                          >
                            {c.status === "blocked" && <ShieldCheck className="w-3 h-3 mr-1" />}
                            {c.status === "completed" && <ShieldOff className="w-3 h-3 mr-1" />}
                            {attackStatusLabel[c.status] || c.status}
                          </Badge>
                        </div>
                        <div className="font-mono text-xs text-muted-foreground flex gap-4 flex-wrap">
                          <span>发起：{new Date(c.startedAt).toLocaleString("zh-CN")}</span>
                          {c.completedAt && (
                            <span>结束：{new Date(c.completedAt).toLocaleString("zh-CN")}</span>
                          )}
                        </div>
                        {c.status === "running" ? (
                          <div className="font-mono text-xs text-primary animate-pulse pt-1">
                            &gt; 正在执行攻击载荷...
                          </div>
                        ) : (
                          c.result && (
                            <div
                              className={`font-mono text-sm pt-1 ${
                                c.status === "blocked" ? "text-success" : "text-warning"
                              }`}
                            >
                              {c.result}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="library" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {exploitsLoading ? (
              <div className="col-span-full flex items-center justify-center p-12 text-primary font-mono animate-pulse border border-border/50 bg-card rounded-sm">
                正在加载漏洞利用库...
              </div>
            ) : (
              exploits?.map((e) => (
                <Card key={e.id}>
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-display font-bold text-foreground tracking-wide">{e.name}</h3>
                      <Badge variant="outline" className={severityClass[e.severity] || ""}>
                        {severityLabel[e.severity] || e.severity}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary">{e.category}</Badge>
                      <span className="font-mono text-[11px] text-primary uppercase tracking-wider">
                        {e.mitreTactic}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{e.description}</p>
                    <div className="bg-background/60 border border-border/50 rounded-sm p-3">
                      <div className="text-[10px] font-display uppercase tracking-widest text-muted-foreground mb-1">
                        示例载荷
                      </div>
                      <code className="font-mono text-xs text-warning break-all">{e.payload}</code>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
