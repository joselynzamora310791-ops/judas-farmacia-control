import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({ titulo, descripcion, acciones }: { titulo: string; descripcion?: string; acciones?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">{titulo}</h1>
        {descripcion && <p className="mt-1 text-sm text-muted-foreground">{descripcion}</p>}
      </div>
      {acciones && <div className="no-print flex flex-wrap items-center gap-2">{acciones}</div>}
    </div>
  );
}

type Tono = "primary" | "success" | "warning" | "destructive";
const tonos: Record<Tono, string> = {
  primary: "bg-primary-soft text-primary",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  destructive: "bg-destructive-soft text-destructive",
};

export function StatCard({
  titulo,
  valor,
  detalle,
  icon: Icon,
  tono = "primary",
}: {
  titulo: string;
  valor: ReactNode;
  detalle?: ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  tono?: Tono;
}) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{titulo}</p>
          <p className="tabular mt-2 truncate font-display text-2xl font-bold">{valor}</p>
        </div>
        <div className={cn("grid size-10 shrink-0 place-items-center rounded-xl", tonos[tono])}>
          <Icon className="size-5" />
        </div>
      </div>
      {detalle && <p className="mt-2 text-xs text-muted-foreground">{detalle}</p>}
    </div>
  );
}

export function Panel({ titulo, acciones, children, className }: { titulo?: string; acciones?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border bg-card shadow-card", className)}>
      {titulo && (
        <div className="flex items-center justify-between gap-3 border-b px-5 py-3.5">
          <h2 className="text-base font-semibold">{titulo}</h2>
          {acciones}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Vacio({ texto }: { texto: string }) {
  return <div className="py-10 text-center text-sm text-muted-foreground">{texto}</div>;
}
