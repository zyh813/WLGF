export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-full space-y-4 font-mono text-center">
      <div className="text-6xl text-destructive font-bold drop-shadow-[0_0_20px_hsl(var(--destructive))]">404</div>
      <div className="text-xl text-primary font-display uppercase tracking-widest">区域未找到</div>
      <p className="text-muted-foreground">您请求的操作区域不存在或访问受限。</p>
    </div>
  );
}
