import { cn } from "@/lib/utils";
import type { Rol } from "@/lib/permisos";
import { NOMBRE_ROL } from "@/lib/permisos";
import { textoVencimiento } from "@/lib/inventario";
import type { ClaseABC } from "@/lib/abc";

const base = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap";

export function StockBajoBadge() {
  return <span className={cn(base, "bg-destructive text-destructive-foreground")}>Stock bajo</span>;
}

export function VencimientoBadge({ dias }: { dias: number }) {
  return <span className={cn(base, "bg-warning text-warning-foreground")}>{textoVencimiento(dias)}</span>;
}

export function OkBadge() {
  return <span className={cn(base, "bg-success-soft text-accent-foreground")}>Normal</span>;
}

export function RolBadge({ rol }: { rol: Rol }) {
  return (
    <span className={cn(base, rol === "gerente" ? "bg-primary-soft text-primary" : "bg-success-soft text-accent-foreground")}>
      {NOMBRE_ROL[rol]}
    </span>
  );
}

const claseColor: Record<ClaseABC, string> = {
  A: "bg-primary text-primary-foreground",
  B: "bg-success text-success-foreground",
  C: "bg-muted text-muted-foreground",
};

export function ClaseBadge({ clase }: { clase: ClaseABC }) {
  return <span className={cn(base, "min-w-7 justify-center", claseColor[clase])}>{clase}</span>;
}
