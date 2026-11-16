import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { hoyManagua, inicioDeMes, sumarDias } from "@/lib/format";

export type Rango = { desde: string; hasta: string };

export function rangoPorDefecto(): Rango {
  const hoy = hoyManagua();
  return { desde: inicioDeMes(hoy), hasta: hoy };
}

export function RangoFechas({ valor, onChange }: { valor: Rango; onChange: (r: Rango) => void }) {
  const hoy = hoyManagua();
  const presets: { t: string; r: Rango }[] = [
    { t: "Hoy", r: { desde: hoy, hasta: hoy } },
    { t: "7 días", r: { desde: sumarDias(hoy, -6), hasta: hoy } },
    { t: "Este mes", r: { desde: inicioDeMes(hoy), hasta: hoy } },
    { t: "90 días", r: { desde: sumarDias(hoy, -89), hasta: hoy } },
    { t: "Este año", r: { desde: `${hoy.slice(0, 4)}-01-01`, hasta: hoy } },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex rounded-lg border bg-card p-0.5">
        {presets.map((p) => {
          const activo = p.r.desde === valor.desde && p.r.hasta === valor.hasta;
          return (
            <Button key={p.t} size="sm" variant={activo ? "default" : "ghost"} className="h-7 px-2.5 text-xs" onClick={() => onChange(p.r)}>
              {p.t}
            </Button>
          );
        })}
      </div>
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Input type="date" className="h-8 w-36" value={valor.desde} max={valor.hasta} onChange={(e) => e.target.value && onChange({ ...valor, desde: e.target.value })} />
        <span>a</span>
        <Input type="date" className="h-8 w-36" value={valor.hasta} min={valor.desde} onChange={(e) => e.target.value && onChange({ ...valor, hasta: e.target.value })} />
      </div>
    </div>
  );
}
