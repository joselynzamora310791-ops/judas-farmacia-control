import { createFileRoute } from "@tanstack/react-router";
import { keepPreviousData, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Coins, Download, Printer, Receipt, ShoppingBag, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { PageHeader, Panel, StatCard, Vacio } from "@/components/app/PageHeader";
import { RangoFechas, rangoPorDefecto, type Rango } from "@/components/app/RangoFechas";
import { StockBajoBadge, VencimientoBadge } from "@/components/app/Badges";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { productosQuery, ventasDiariasQuery, ventasPorCategoriaQuery, ventasPorProductoQuery } from "@/lib/queries";
import { descargarCSV, formatCordobas, formatDiaCorto, formatEntero, formatFecha, hoyManagua } from "@/lib/format";
import { diasParaVencer, porVencer, tieneStockBajo } from "@/lib/inventario";

export const Route = createFileRoute("/_authenticated/_panel/_gerente/reportes")({
  head: () => ({
    meta: [
      { title: "Reportes · Farmacia San Judas SIG" },
      { name: "description", content: "Reportes de ventas por período, producto, categoría e inventario." },
      { property: "og:title", content: "Reportes · Farmacia San Judas SIG" },
      { property: "og:description", content: "Reportes de ventas e inventario." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => {
    const r = rangoPorDefecto();
    return Promise.all([
      context.queryClient.ensureQueryData(ventasDiariasQuery(r.desde, r.hasta)),
      context.queryClient.ensureQueryData(ventasPorProductoQuery(r.desde, r.hasta)),
      context.queryClient.ensureQueryData(ventasPorCategoriaQuery(r.desde, r.hasta)),
      context.queryClient.ensureQueryData(productosQuery()),
    ]);
  },
  component: ReportesPage,
});

const COLORES = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--muted-foreground)"];
const tooltipStyle = { borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)", fontSize: 12 };

function ReportesPage() {
  const [rango, setRango] = useState<Rango>(rangoPorDefecto);
  const diarias = useQuery({ ...ventasDiariasQuery(rango.desde, rango.hasta), placeholderData: keepPreviousData }).data ?? [];
  const porProducto = useQuery({ ...ventasPorProductoQuery(rango.desde, rango.hasta), placeholderData: keepPreviousData }).data ?? [];
  const porCategoria = useQuery({ ...ventasPorCategoriaQuery(rango.desde, rango.hasta), placeholderData: keepPreviousData }).data ?? [];
  const { data: productos } = useSuspenseQuery(productosQuery());
  const hoy = hoyManagua();

  const total = diarias.reduce((s, d) => s + d.total, 0);
  const transacciones = diarias.reduce((s, d) => s + d.num_ventas, 0);
  const unidades = porProducto.reduce((s, p) => s + p.cantidad, 0);
  const ticket = transacciones ? total / transacciones : 0;
  const serie = diarias.map((d) => ({ ...d, etiqueta: formatDiaCorto(d.dia) }));

  const inventarioAlertas = productos.filter((p) => tieneStockBajo(p) || porVencer(p, hoy));
  const sufijo = `${rango.desde}_a_${rango.hasta}`;

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Reportes"
        descripcion={`Período: ${formatFecha(rango.desde)} – ${formatFecha(rango.hasta)}`}
        acciones={
          <>
            <RangoFechas valor={rango} onChange={setRango} />
            <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="size-4" /> Imprimir</Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard titulo="Ingresos" valor={formatCordobas(total)} icon={Coins} tono="success" />
        <StatCard titulo="Transacciones" valor={formatEntero(transacciones)} icon={Receipt} />
        <StatCard titulo="Ticket promedio" valor={formatCordobas(ticket)} icon={TrendingUp} />
        <StatCard titulo="Unidades vendidas" valor={formatEntero(unidades)} icon={ShoppingBag} tono="success" />
      </div>

      <Tabs defaultValue="ventas">
        <TabsList className="no-print">
          <TabsTrigger value="ventas">Ventas por día</TabsTrigger>
          <TabsTrigger value="productos">Por producto</TabsTrigger>
          <TabsTrigger value="categorias">Por categoría</TabsTrigger>
          <TabsTrigger value="inventario">Inventario</TabsTrigger>
        </TabsList>

        <TabsContent value="ventas" className="mt-4">
          <Panel
            titulo="Ventas diarias"
            acciones={
              <Button size="sm" variant="ghost" onClick={() => descargarCSV(`ventas_diarias_${sufijo}.csv`, [["Fecha", "Transacciones", "Total (C$)"], ...diarias.map((d) => [d.dia, d.num_ventas, d.total.toFixed(2)])])}>
                <Download className="size-4" /> CSV
              </Button>
            }
          >
            {serie.length === 0 ? (
              <Vacio texto="No hay ventas en este período." />
            ) : (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={serie}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="etiqueta" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={70} tickFormatter={(v) => `C$ ${Number(v).toLocaleString("en-US")}`} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v) => [formatCordobas(Number(v)), "Ventas"]} />
                    <Bar dataKey="total" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="productos" className="mt-4">
          <Panel
            titulo="Ventas por producto"
            acciones={
              <Button size="sm" variant="ghost" onClick={() => descargarCSV(`ventas_productos_${sufijo}.csv`, [["Código", "Producto", "Categoría", "Unidades", "Ingresos (C$)"], ...porProducto.map((p) => [p.codigo, p.nombre, p.categoria, p.cantidad, p.ingresos.toFixed(2)])])}>
                <Download className="size-4" /> CSV
              </Button>
            }
          >
            <TablaSimple
              columnas={["#", "Código", "Producto", "Categoría", "Unidades", "Ingresos"]}
              filas={porProducto.map((p, i) => [i + 1, p.codigo ?? "—", p.nombre, p.categoria ?? "—", formatEntero(p.cantidad), formatCordobas(p.ingresos)])}
              alinearDerecha={[4, 5]}
            />
          </Panel>
        </TabsContent>

        <TabsContent value="categorias" className="mt-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <Panel titulo="Participación por categoría">
              {porCategoria.length === 0 ? (
                <Vacio texto="No hay ventas en este período." />
              ) : (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={porCategoria} dataKey="ingresos" nameKey="categoria" innerRadius={60} outerRadius={110} paddingAngle={2}>
                        {porCategoria.map((_, i) => <Cell key={i} fill={COLORES[i % COLORES.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatCordobas(Number(v))} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Panel>
            <Panel
              titulo="Detalle por categoría"
              acciones={
                <Button size="sm" variant="ghost" onClick={() => descargarCSV(`ventas_categorias_${sufijo}.csv`, [["Categoría", "Unidades", "Ingresos (C$)"], ...porCategoria.map((c) => [c.categoria, c.cantidad, c.ingresos.toFixed(2)])])}>
                  <Download className="size-4" /> CSV
                </Button>
              }
            >
              <TablaSimple
                columnas={["Categoría", "Unidades", "Ingresos", "%"]}
                filas={porCategoria.map((c) => [c.categoria, formatEntero(c.cantidad), formatCordobas(c.ingresos), total ? `${((c.ingresos / total) * 100).toFixed(1)}%` : "—"])}
                alinearDerecha={[1, 2, 3]}
              />
            </Panel>
          </div>
        </TabsContent>

        <TabsContent value="inventario" className="mt-4">
          <Panel
            titulo="Productos con alertas de inventario"
            acciones={
              <Button size="sm" variant="ghost" onClick={() => descargarCSV(`alertas_inventario_${hoy}.csv`, [["Código", "Producto", "Existencia", "Stock mínimo", "Vencimiento", "Stock bajo", "Por vencer"], ...inventarioAlertas.map((p) => [p.codigo, p.nombre, p.existencia, p.stock_minimo, p.fecha_vencimiento, tieneStockBajo(p) ? "Sí" : "No", porVencer(p, hoy) ? "Sí" : "No"])])}>
                <Download className="size-4" /> CSV
              </Button>
            }
          >
            {inventarioAlertas.length === 0 ? (
              <Vacio texto="Sin alertas de inventario." />
            ) : (
              <div className="-mx-5 -my-5 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3">Código</th><th className="px-5 py-3">Producto</th>
                      <th className="px-5 py-3 text-right">Existencia</th><th className="px-5 py-3 text-right">Mínimo</th>
                      <th className="px-5 py-3">Vencimiento</th><th className="px-5 py-3">Alertas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {inventarioAlertas.map((p) => {
                      const dias = diasParaVencer(p, hoy);
                      return (
                        <tr key={p.id}>
                          <td className="px-5 py-3 font-mono text-xs">{p.codigo}</td>
                          <td className="px-5 py-3 font-medium">{p.nombre}</td>
                          <td className="tabular px-5 py-3 text-right">{p.existencia}</td>
                          <td className="tabular px-5 py-3 text-right">{p.stock_minimo}</td>
                          <td className="px-5 py-3">{formatFecha(p.fecha_vencimiento)}</td>
                          <td className="px-5 py-3"><div className="flex flex-wrap gap-1">{tieneStockBajo(p) && <StockBajoBadge />}{porVencer(p, hoy) && dias !== null && <VencimientoBadge dias={dias} />}</div></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TablaSimple({ columnas, filas, alinearDerecha = [] }: { columnas: string[]; filas: (string | number)[][]; alinearDerecha?: number[] }) {
  if (filas.length === 0) return <Vacio texto="No hay datos en este período." />;
  return (
    <div className="-mx-5 -my-5 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>{columnas.map((c, i) => <th key={c} className={`px-5 py-3 font-semibold ${alinearDerecha.includes(i) ? "text-right" : ""}`}>{c}</th>)}</tr>
        </thead>
        <tbody className="divide-y">
          {filas.map((f, i) => (
            <tr key={i} className="hover:bg-muted/40">
              {f.map((v, j) => <td key={j} className={`px-5 py-3 ${alinearDerecha.includes(j) ? "tabular text-right font-medium" : ""}`}>{v}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
