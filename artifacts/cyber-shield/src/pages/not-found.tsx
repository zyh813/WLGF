export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-full space-y-4 font-mono text-center">
      <div className="text-6xl text-destructive font-bold drop-shadow-[0_0_20px_hsl(var(--destructive))]">404</div>
      <div className="text-xl text-primary font-display uppercase tracking-widest">Sector Not Found</div>
      <p className="text-muted-foreground">The requested operational sector does not exist or access is restricted.</p>
    </div>
  );
}
