import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { AlertTriangle, CalendarClock, Coins, Package, Receipt, TrendingUp, Users } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader, Panel, StatCard, Vacio } from "@/components/app/PageHeader";
import { StockBajoBadge, VencimientoBadge } from "@/components/app/Badges";
import { dashboardQuery, productosQuery, ventasDiariasQuery, ventasPorProductoQuery } from "@/lib/queries";
import { formatCordobas, formatDiaCorto, formatEntero, hoyManagua, inicioDeMes, sumarDias } from "@/lib/format";
import { diasParaVencer, porVencer, tieneStockBajo } from "@/lib/inventario";
import { calcularTicketPromedio } from "@/lib/indicadores";

export const Route = createFileRoute("/_authenticated/_panel/_gerente/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard · Farmacia San Judas SIG" },
      { name: "description", content: "Indicadores clave de ventas e inventario de la farmacia." },
      { property: "og:title", content: "Dashboard · Farmacia San Judas SIG" },
      { property: "og:description", content: "Indicadores clave de ventas e inventario." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => {
    const hoy = hoyManagua();
    return Promise.all([
      context.queryClient.ensureQueryData(dashboardQuery()),
      context.queryClient.ensureQueryData(productosQuery()),
      context.queryClient.ensureQueryData(ventasDiariasQuery(sumarDias(hoy, -29), hoy)),
      context.queryClient.ensureQueryData(ventasPorProductoQuery(inicioDeMes(hoy), hoy)),
    ]);
  },
  component: Dashboard,
});

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid var(--border)",
  background: "var(--card)",
  fontSize: 12,
};

function Dashboard() {
  const hoy = hoyManagua();
  const desde = sumarDias(hoy, -29);
  const { data: r } = useSuspenseQuery(dashboardQuery());
  const { data: productos } = useSuspenseQuery(productosQuery());
  const { data: diarias } = useSuspenseQuery(ventasDiariasQuery(desde, hoy));
  const { data: topMes } = useSuspenseQuery(ventasPorProductoQuery(inicioDeMes(hoy), hoy));

  // Serie completa de 30 días (incluye días sin ventas)
  const mapa = new Map(diarias.map((d) => [d.dia, d.total]));
  const serie = Array.from({ length: 30 }, (_, i) => {
    const dia = sumarDias(desde, i);
    return { dia, etiqueta: formatDiaCorto(dia), total: mapa.get(dia) ?? 0 };
  });

  const stockBajo = productos.filter(tieneStockBajo).sort((a, b) => a.existencia - b.existencia);
  const vencer = productos
    .filter((p) => porVencer(p, hoy))
    .sort((a, b) => (a.fecha_vencimiento ?? "").localeCompare(b.fecha_vencimiento ?? ""));
  const top5 = topMes.slice(0, 5).map((t) => ({ ...t, corto: t.nombre.length > 22 ? t.nombre.slice(0, 21) + "…" : t.nombre }));

  return (
    <div className="space-y-6">
      <PageHeader titulo="Dashboard" descripcion="Resumen gerencial de ventas e inventario en tiempo real." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        <StatCard titulo="Ventas de hoy" valor={formatCordobas(r.ventas_hoy)} detalle={`${formatEntero(r.num_ventas_hoy)} transacciones`} icon={Coins} tono="success" />
        <StatCard titulo="Ventas del mes" valor={formatCordobas(r.ventas_mes)} detalle={`${formatEntero(r.num_ventas_mes)} transacciones`} icon={TrendingUp} />
        <StatCard titulo="Stock bajo" valor={formatEntero(r.stock_bajo)} detalle="Productos en o bajo el mínimo" icon={AlertTriangle} tono="destructive" />
        <StatCard titulo="Ticket promedio" valor={formatCordobas(calcularTicketPromedio(r.ventas_mes, r.num_ventas_mes))} detalle="Por transacción del mes" icon={Receipt} tono="success" />
        <StatCard titulo="Por vencer" valor={formatEntero(r.por_vencer)} detalle="Vencen en menos de 30 días" icon={CalendarClock} tono="warning" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard titulo="Valor del inventario" valor={formatCordobas(r.valor_inventario)} detalle={`${formatEntero(r.total_productos)} productos registrados`} icon={Package} />
        <StatCard titulo="Clientes registrados" valor={formatEntero(r.total_clientes)} icon={Users} tono="success" />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel titulo="Ventas de los últimos 30 días" className="xl:col-span-2">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={serie} margin={{ left: 0, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="gVentas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="etiqueta" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} interval={4} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={70} tickFormatter={(v) => `C$ ${Number(v).toLocaleString("en-US")}`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [formatCordobas(Number(v)), "Ventas"]} />
                <Area type="monotone" dataKey="total" stroke="var(--primary)" strokeWidth={2.5} fill="url(#gVentas)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel titulo="Más vendidos del mes">
          {top5.length === 0 ? (
            <Vacio texto="Sin ventas este mes." />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={top5} layout="vertical" margin={{ left: 0, right: 8 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="corto" width={130} tick={{ fontSize: 11, fill: "var(--foreground)" }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [formatCordobas(Number(v)), "Ingresos"]} />
                  <Bar dataKey="ingresos" fill="var(--success)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel titulo="Alertas de stock bajo" acciones={<Link to="/productos" className="text-xs font-medium text-primary hover:underline">Ver inventario</Link>}>
          {stockBajo.length === 0 ? (
            <Vacio texto="No hay productos con stock bajo." />
          ) : (
            <ul className="-my-2 divide-y">
              {stockBajo.slice(0, 8).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{p.nombre}</div>
                    <div className="text-xs text-muted-foreground">Existencia {p.existencia} · Mínimo {p.stock_minimo}</div>
                  </div>
                  <StockBajoBadge />
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel titulo="Próximos a vencer" acciones={<Link to="/productos" className="text-xs font-medium text-primary hover:underline">Ver inventario</Link>}>
          {vencer.length === 0 ? (
            <Vacio texto="No hay productos por vencer en los próximos 30 días." />
          ) : (
            <ul className="-my-2 divide-y">
              {vencer.slice(0, 8).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{p.nombre}</div>
                    <div className="text-xs text-muted-foreground">Existencia {p.existencia}</div>
                  </div>
                  <VencimientoBadge dias={diasParaVencer(p, hoy) ?? 0} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
