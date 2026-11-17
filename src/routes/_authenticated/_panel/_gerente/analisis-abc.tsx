import { createFileRoute } from "@tanstack/react-router";
import { keepPreviousData, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Download, Info } from "lucide-react";
import { Bar, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader, Panel, Vacio } from "@/components/app/PageHeader";
import { RangoFechas, type Rango } from "@/components/app/RangoFechas";
import { ClaseBadge } from "@/components/app/Badges";
import { Button } from "@/components/ui/button";
import { productosQuery, ventasPorProductoQuery } from "@/lib/queries";
import { clasificarABC, resumenABC, LIMITE_A, LIMITE_B, type ClaseABC } from "@/lib/abc";
import { descargarCSV, formatCordobas, formatEntero, formatFecha, formatPorcentaje, hoyManagua, sumarDias } from "@/lib/format";
import { cn } from "@/lib/utils";

function rangoABC(): Rango {
  const hoy = hoyManagua();
  return { desde: sumarDias(hoy, -89), hasta: hoy };
}

export const Route = createFileRoute("/_authenticated/_panel/_gerente/analisis-abc")({
  head: () => ({
    meta: [
      { title: "Análisis ABC · Farmacia San Judas SIG" },
      { name: "description", content: "Clasificación ABC de productos según su contribución al valor de consumo." },
      { property: "og:title", content: "Análisis ABC · Farmacia San Judas SIG" },
      { property: "og:description", content: "Clasificación ABC según el valor de consumo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => {
    const r = rangoABC();
    return Promise.all([
      context.queryClient.ensureQueryData(ventasPorProductoQuery(r.desde, r.hasta)),
      context.queryClient.ensureQueryData(productosQuery()),
    ]);
  },
  component: AnalisisABC,
});

const DESCRIPCION: Record<ClaseABC, { titulo: string; texto: string; tarjeta: string; acento: string }> = {
  A: {
    titulo: "Clase A · Alta prioridad",
    texto: "Representan cerca del 80% del valor de consumo. Nunca deben agotarse: control diario y reabastecimiento prioritario.",
    tarjeta: "border-primary/30 bg-primary-soft",
    acento: "text-primary",
  },
  B: {
    titulo: "Clase B · Prioridad media",
    texto: "Aportan el siguiente 15%. Revisión semanal y pedidos regulares.",
    tarjeta: "border-success/30 bg-success-soft",
    acento: "text-success",
  },
  C: {
    titulo: "Clase C · Baja prioridad",
    texto: "Último 5% del valor de consumo. Comprar en cantidades pequeñas y evitar sobrestock o vencimientos.",
    tarjeta: "border-border bg-muted",
    acento: "text-muted-foreground",
  },
};

const tooltipStyle = { borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)", fontSize: 12 };

function AnalisisABC() {
  const [rango, setRango] = useState<Rango>(rangoABC);
  const [filtro, setFiltro] = useState<ClaseABC | "todas">("todas");
  const ventas = useQuery({ ...ventasPorProductoQuery(rango.desde, rango.hasta), placeholderData: keepPreviousData }).data ?? [];
  const { data: productos } = useSuspenseQuery(productosQuery());

  const filas = useMemo(() => clasificarABC(ventas), [ventas]);
  const resumen = useMemo(() => resumenABC(filas), [filas]);
  const conVentas = new Set(filas.map((f) => f.producto_id));
  const sinVentas = productos.filter((p) => !conVentas.has(p.id)).length;
  const visibles = filtro === "todas" ? filas : filas.filter((f) => f.clase === filtro);
  const pareto = filas.slice(0, 40).map((f, i) => ({
    pos: i + 1,
    nombre: f.nombre,
    ingresos: f.ingresos,
    acumulado: Number(f.acumulado.toFixed(1)),
  }));

  const exportar = () =>
    descargarCSV(`analisis_abc_${rango.desde}_a_${rango.hasta}.csv`, [
      ["Posición", "Código", "Producto", "Categoría", "Unidades", "Valor de consumo (C$)", "% del valor", "% acumulado", "Clase"],
      ...filas.map((f, i) => [i + 1, f.codigo, f.nombre, f.categoria, f.cantidad, f.ingresos.toFixed(2), f.porcentaje.toFixed(2), f.acumulado.toFixed(2), f.clase]),
    ]);

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Análisis ABC de productos"
        descripcion={`Período: ${formatFecha(rango.desde)} – ${formatFecha(rango.hasta)}`}
        acciones={
          <>
            <RangoFechas valor={rango} onChange={setRango} />
            <Button variant="outline" size="sm" onClick={exportar} disabled={filas.length === 0}><Download className="size-4" /> CSV</Button>
          </>
        }
      />

      <div className="flex items-start gap-3 rounded-2xl border bg-card p-4 text-sm shadow-card">
        <Info className="mt-0.5 size-4 shrink-0 text-primary" />
        <p className="text-muted-foreground">
          Cada producto se mide por su contribución al <b className="text-foreground">valor de consumo</b> del período (unidades vendidas × precio de venta) y se ordenan de mayor a menor. Se clasifican como <b className="text-foreground">A</b> hasta
          acumular el {LIMITE_A}% del valor de consumo, <b className="text-foreground">B</b> hasta el {LIMITE_B}% y{" "}
          <b className="text-foreground">C</b> el resto (principio de Pareto).
          {sinVentas > 0 &&
            (sinVentas === 1
              ? " Además, 1 producto del inventario no tuvo ventas en este período (se considera clase C)."
              : ` Además, ${sinVentas} productos del inventario no tuvieron ventas en este período (se consideran clase C).`)}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {resumen.map((r) => {
          const d = DESCRIPCION[r.clase];
          const activo = filtro === r.clase;
          return (
            <button
              key={r.clase}
              onClick={() => setFiltro(activo ? "todas" : r.clase)}
              className={cn("rounded-2xl border p-5 text-left shadow-card transition", d.tarjeta, activo && "ring-2 ring-ring")}
            >
              <div className="flex items-center justify-between">
                <h3 className={cn("text-sm font-semibold", d.acento)}>{d.titulo}</h3>
                <ClaseBadge clase={r.clase} />
              </div>
              <div className="tabular mt-3 font-display text-2xl font-bold">{formatCordobas(r.ingresos)}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {formatEntero(r.productos)} productos ({formatPorcentaje(r.pctProductos)}) · {formatPorcentaje(r.pctIngresos)} del valor de consumo
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{d.texto}</p>
            </button>
          );
        })}
      </div>

      <Panel titulo="Curva de Pareto" acciones={filas.length > 40 && <span className="text-xs text-muted-foreground">Primeros 40 productos</span>}>
        {pareto.length === 0 ? (
          <Vacio texto="No hay ventas en este período para analizar." />
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={pareto} margin={{ right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="pos" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                <YAxis yAxisId="izq" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={70} tickFormatter={(v) => `C$ ${Number(v).toLocaleString("en-US")}`} />
                <YAxis yAxisId="der" orientation="right" domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelFormatter={(_, p) => (p?.[0]?.payload as { nombre?: string } | undefined)?.nombre ?? ""}
                  formatter={(v, n) => (n === "acumulado" ? [`${v}%`, "Acumulado"] : [formatCordobas(Number(v)), "Valor de consumo"])}
                />
                <ReferenceLine yAxisId="der" y={LIMITE_A} stroke="var(--primary)" strokeDasharray="4 4" />
                <ReferenceLine yAxisId="der" y={LIMITE_B} stroke="var(--success)" strokeDasharray="4 4" />
                <Bar yAxisId="izq" dataKey="ingresos" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={48} />
                <Line yAxisId="der" dataKey="acumulado" stroke="var(--success)" strokeWidth={2.5} dot={false} type="monotone" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>

      <Panel
        titulo={filtro === "todas" ? "Clasificación de productos" : `Productos clase ${filtro}`}
        acciones={filtro !== "todas" && <Button size="sm" variant="ghost" onClick={() => setFiltro("todas")}>Ver todas</Button>}
      >
        {visibles.length === 0 ? (
          <Vacio texto="No hay productos para mostrar." />
        ) : (
          <div className="-mx-5 -my-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-semibold">#</th>
                  <th className="px-5 py-3 font-semibold">Código</th>
                  <th className="px-5 py-3 font-semibold">Producto</th>
                  <th className="px-5 py-3 font-semibold">Categoría</th>
                  <th className="px-5 py-3 text-right font-semibold">Unidades</th>
                  <th className="px-5 py-3 text-right font-semibold">Valor de consumo</th>
                  <th className="px-5 py-3 text-right font-semibold">% del valor</th>
                  <th className="px-5 py-3 text-right font-semibold">% acumulado</th>
                  <th className="px-5 py-3 text-center font-semibold">Clase</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {visibles.map((f) => (
                  <tr key={f.producto_id ?? f.nombre} className="hover:bg-muted/40">
                    <td className="tabular px-5 py-3 text-muted-foreground">{filas.indexOf(f) + 1}</td>
                    <td className="px-5 py-3 font-mono text-xs">{f.codigo ?? "—"}</td>
                    <td className="px-5 py-3 font-medium">{f.nombre}</td>
                    <td className="px-5 py-3 text-muted-foreground">{f.categoria ?? "—"}</td>
                    <td className="tabular px-5 py-3 text-right">{formatEntero(f.cantidad)}</td>
                    <td className="tabular px-5 py-3 text-right font-semibold">{formatCordobas(f.ingresos)}</td>
                    <td className="tabular px-5 py-3 text-right">{formatPorcentaje(f.porcentaje)}</td>
                    <td className="tabular px-5 py-3 text-right">{formatPorcentaje(f.acumulado)}</td>
                    <td className="px-5 py-3 text-center"><ClaseBadge clase={f.clase} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
