import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <div className={cn("grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-brand shadow-elevated", className)}>
      <svg viewBox="0 0 24 24" className="size-5 text-primary-foreground" aria-hidden="true">
        <path fill="currentColor" d="M9.5 3h5a1 1 0 0 1 1 1v4.5H20a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-4.5V20a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1v-4.5H4a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1h4.5V4a1 1 0 0 1 1-1Z" />
      </svg>
    </div>
  );
}

export function Logo({ className, light }: { className?: string; light?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      <div className="leading-tight">
        <div className={cn("font-display text-[15px] font-bold tracking-tight", light ? "text-primary-foreground" : "text-foreground")}>
          Farmacia San Judas
        </div>
        <div className={cn("text-[11px] font-semibold uppercase tracking-[0.18em]", light ? "text-sidebar-primary" : "text-success")}>
          SIG · Managua
        </div>
      </div>
    </div>
  );
}
