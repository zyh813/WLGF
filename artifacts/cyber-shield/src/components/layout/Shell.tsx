import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  ShieldAlert, 
  Shield, 
  Activity, 
  Radar, 
  ScrollText,
  Swords,
  ActivityIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "仪表盘", icon: LayoutDashboard },
  { href: "/alerts", label: "安全告警", icon: ShieldAlert },
  { href: "/firewall", label: "防火墙", icon: Shield },
  { href: "/connections", label: "网络连接", icon: Activity },
  { href: "/scans", label: "漏洞扫描", icon: Radar },
  { href: "/attacks", label: "攻击模拟", icon: Swords },
  { href: "/logs", label: "安全日志", icon: ScrollText },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="flex min-h-[100dvh] bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border/50 bg-card flex flex-col relative z-10 shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.5)]">
        <div className="h-16 flex items-center px-6 border-b border-border/50">
          <ActivityIcon className="w-6 h-6 text-primary mr-3" />
          <div className="flex flex-col">
            <span className="font-display font-bold uppercase tracking-widest text-lg leading-none text-primary">CyberShield</span>
            <span className="font-mono text-[10px] text-muted-foreground uppercase mt-1">网络攻防平台 v1.0.0</span>
          </div>
        </div>
        
        <nav className="flex-1 py-4 flex flex-col gap-1 px-3">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-sm font-display tracking-wider text-sm transition-all group relative",
                  isActive 
                    ? "bg-primary/10 text-primary shadow-[inset_2px_0_0_hsl(var(--primary))]" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {isActive && (
                  <div className="absolute left-0 top-0 bottom-0 w-px bg-primary shadow-[0_0_10px_hsl(var(--primary))]" />
                )}
                <item.icon className={cn("w-4 h-4", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-border/50 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse shadow-[0_0_8px_hsl(var(--success))]" />
            <span className="font-mono text-xs text-muted-foreground">系统安全运行中</span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#02050A]">
        {/* Top Header */}
        <header className="h-16 border-b border-border/50 flex items-center justify-between px-6 bg-card/50 backdrop-blur-sm z-10">
          <div className="flex items-center gap-4">
            <span className="font-mono text-xs text-muted-foreground flex items-center gap-2">
              <span className="text-primary">&gt;</span> 威胁等级：4级
            </span>
          </div>
          <div className="flex items-center gap-4 font-mono text-xs">
            <div className="flex items-center gap-2 text-muted-foreground">
              <span>操作员：</span>
              <span className="text-foreground">分析师_01</span>
            </div>
            <div className="h-4 w-px bg-border" />
            <div className="text-primary">{new Date().toISOString().split('T')[1].split('.')[0]} UTC</div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-6 relative">
          {/* Subtle grid background */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.03]" 
               style={{ backgroundImage: 'linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)', backgroundSize: '40px 40px' }} 
          />
          <div className="relative z-10 h-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
