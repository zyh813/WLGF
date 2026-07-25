import { useState } from "react";
import {
  useGetThreatIndicators,
  useCreateThreatIndicator,
  useUpdateThreatIndicator,
  useDeleteThreatIndicator,
  useImportThreatFeed,
  useBlockThreatIndicator,
  getGetThreatIndicatorsQueryKey,
  getGetFirewallRulesQueryKey,
  ThreatIndicator,
  ThreatIndicatorType,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Crosshair, Plus, Trash2, Pencil, DownloadCloud, ShieldBan, Filter } from "lucide-react";
import { toast } from "sonner";

const indicatorSchema = z.object({
  type: z.enum(["ip", "domain", "hash"]),
  value: z.string().min(1, "指标值不能为空"),
  category: z.enum(["malware", "botnet", "phishing", "c2", "scanner", "spam", "apt", "other"]),
  confidence: z.coerce.number().min(0).max(100),
  source: z.string().min(1, "来源不能为空"),
  description: z.string().optional(),
});

type IndicatorFormValues = z.infer<typeof indicatorSchema>;

const typeLabel: Record<string, string> = {
  ip: "IP地址",
  domain: "域名",
  hash: "文件哈希",
};

const categoryLabel: Record<string, string> = {
  malware: "恶意软件",
  botnet: "僵尸网络",
  phishing: "钓鱼",
  c2: "C2服务器",
  scanner: "扫描器",
  spam: "垃圾邮件",
  apt: "APT组织",
  other: "其他",
};

const defaultValues: IndicatorFormValues = {
  type: "ip",
  value: "",
  category: "malware",
  confidence: 50,
  source: "manual",
  description: "",
};

export default function ThreatIntel() {
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState<ThreatIndicatorType | "all">("all");
  const { data: indicators, isLoading } = useGetThreatIndicators();
  const createIndicator = useCreateThreatIndicator();
  const updateIndicator = useUpdateThreatIndicator();
  const deleteIndicator = useDeleteThreatIndicator();
  const importFeed = useImportThreatFeed();
  const blockIndicator = useBlockThreatIndicator();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ThreatIndicator | null>(null);

  const form = useForm<IndicatorFormValues>({
    resolver: zodResolver(indicatorSchema),
    defaultValues,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getGetThreatIndicatorsQueryKey() });
  };

  const openCreate = () => {
    setEditing(null);
    form.reset(defaultValues);
    setDialogOpen(true);
  };

  const openEdit = (i: ThreatIndicator) => {
    setEditing(i);
    form.reset({
      type: i.type,
      value: i.value,
      category: i.category,
      confidence: i.confidence,
      source: i.source,
      description: i.description || "",
    });
    setDialogOpen(true);
  };

  const onSubmit = (data: IndicatorFormValues) => {
    if (editing) {
      updateIndicator.mutate({ id: editing.id, data }, {
        onSuccess: () => {
          toast.success("威胁指标已更新");
          setDialogOpen(false);
          invalidate();
        },
        onError: () => toast.error("更新指标失败"),
      });
    } else {
      createIndicator.mutate({ data }, {
        onSuccess: () => {
          toast.success("威胁指标已添加");
          setDialogOpen(false);
          invalidate();
        },
        onError: () => toast.error("添加指标失败"),
      });
    }
  };

  const handleDelete = (id: number) => {
    if (window.confirm("确定要删除此条威胁指标吗？")) {
      deleteIndicator.mutate({ id }, {
        onSuccess: () => {
          toast.success("指标已删除");
          invalidate();
        },
        onError: () => toast.error("删除指标失败"),
      });
    }
  };

  const handleImport = () => {
    importFeed.mutate(undefined, {
      onSuccess: (result) => {
        toast.success(`情报源导入完成：新增 ${result.imported} 条，跳过重复 ${result.skipped} 条`);
        invalidate();
      },
      onError: () => toast.error("导入情报源失败"),
    });
  };

  const handleBlock = (i: ThreatIndicator) => {
    blockIndicator.mutate({ id: i.id }, {
      onSuccess: () => {
        toast.success(`已推送防火墙拒绝规则：${i.value}`);
        queryClient.invalidateQueries({ queryKey: getGetFirewallRulesQueryKey() });
      },
      onError: (error) => {
        const status = (error as { response?: { status?: number } })?.response?.status;
        if (status === 409) {
          toast.warning("该IP已存在防火墙拒绝规则");
        } else {
          toast.error("推送防火墙规则失败");
        }
      },
    });
  };

  const filtered = (indicators || []).filter((i) => typeFilter === "all" || i.type === typeFilter);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold uppercase tracking-widest text-primary drop-shadow-[0_0_10px_rgba(0,255,255,0.5)] flex items-center gap-3">
            <Crosshair className="w-8 h-8" />
            威胁情报
          </h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">管理失陷指标（IOC）并联动防火墙封禁</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-card p-1 rounded-sm border border-border">
            <Filter className="w-4 h-4 text-muted-foreground mx-2" />
            <select
              className="bg-transparent font-mono text-sm border-none text-foreground focus:ring-0 outline-none p-2 cursor-pointer"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as ThreatIndicatorType | "all")}
            >
              <option value="all" className="bg-card">全部类型</option>
              <option value="ip" className="bg-card">IP地址</option>
              <option value="domain" className="bg-card">域名</option>
              <option value="hash" className="bg-card">文件哈希</option>
            </select>
          </div>
          <Button variant="outline" onClick={handleImport} disabled={importFeed.isPending}>
            <DownloadCloud className="w-4 h-4 mr-2" />
            {importFeed.isPending ? "导入中..." : "导入情报源"}
          </Button>
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" />
            新增指标
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>类型</TableHead>
                <TableHead>指标值</TableHead>
                <TableHead>威胁类别</TableHead>
                <TableHead>置信度</TableHead>
                <TableHead>来源</TableHead>
                <TableHead>首次发现</TableHead>
                <TableHead>最近活跃</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-primary font-mono animate-pulse">
                    正在同步威胁情报库...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground font-mono">
                    暂无威胁指标，可点击“导入情报源”加载样本数据。
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-[10px] uppercase">
                        {typeLabel[i.type] || i.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-sm text-primary/90 max-w-[280px] truncate" title={i.value}>{i.value}</div>
                      {i.description && (
                        <div className="text-xs text-muted-foreground max-w-[280px] truncate" title={i.description}>{i.description}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={i.category === "c2" || i.category === "apt" || i.category === "malware" ? "destructive" : "warning"}>
                        {categoryLabel[i.category] || i.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={
                              i.confidence >= 80 ? "h-full bg-destructive" : i.confidence >= 50 ? "h-full bg-warning" : "h-full bg-primary"
                            }
                            style={{ width: `${i.confidence}%` }}
                          />
                        </div>
                        <span className="font-mono text-xs">{i.confidence}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{i.source}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {new Date(i.firstSeen).toLocaleDateString("zh-CN")}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {new Date(i.lastSeen).toLocaleDateString("zh-CN")}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {i.type === "ip" && (
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 text-xs"
                            onClick={() => handleBlock(i)}
                            disabled={blockIndicator.isPending}
                          >
                            <ShieldBan className="w-3 h-3 mr-1" />
                            推送到防火墙
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" onClick={() => openEdit(i)} className="h-7 w-7">
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(i.id)}
                          disabled={deleteIndicator.isPending}
                          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editing ? "编辑威胁指标" : "新增威胁指标"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>指标类型</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="选择类型" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ip">IP地址</SelectItem>
                          <SelectItem value="domain">域名</SelectItem>
                          <SelectItem value="hash">文件哈希</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>威胁类别</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="选择类别" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(categoryLabel).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="value"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>指标值</FormLabel>
                      <FormControl>
                        <Input placeholder="例如：185.220.101.34 或 evil.example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confidence"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>置信度（0-100）</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} max={100} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="source"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>情报来源</FormLabel>
                      <FormControl>
                        <Input placeholder="例如：AbuseIPDB" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>描述</FormLabel>
                      <FormControl>
                        <Input placeholder="威胁描述（可选）" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={createIndicator.isPending || updateIndicator.isPending}>
                  {createIndicator.isPending || updateIndicator.isPending ? "提交中..." : editing ? "保存修改" : "添加指标"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
