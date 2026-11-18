import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Minus, Plus, Printer, Receipt, Search, ShoppingCart, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Panel, Vacio } from "@/components/app/PageHeader";
import { StockBajoBadge, VencimientoBadge } from "@/components/app/Badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  clientesQuery,
  detalleVentaQuery,
  mensajeError,
  productosQuery,
  ventasRecientesQuery,
  type Producto,
  type Venta,
} from "@/lib/queries";
import { formatCordobas, formatEntero, formatFechaHora, hoyManagua } from "@/lib/format";
import { diasParaVencer, porVencer, tieneStockBajo } from "@/lib/inventario";
import { cn } from "@/lib/utils";
import { filtrarVentas, resumenDemo } from "@/lib/historial-ventas";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/_authenticated/_panel/ventas")({
  head: () => ({
    meta: [
      { title: "Ventas · Farmacia San Judas SIG" },
      { name: "description", content: "Registro de ventas e historial de facturas en córdobas." },
      { property: "og:title", content: "Ventas · Farmacia San Judas SIG" },
      { property: "og:description", content: "Registro de ventas e historial de facturas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(productosQuery()),
      context.queryClient.ensureQueryData(clientesQuery()),
      context.queryClient.ensureQueryData(ventasRecientesQuery()),
    ]),
  component: VentasPage,
});

const METODOS: Record<string, string> = { efectivo: "Efectivo", tarjeta: "Tarjeta", transferencia: "Transferencia" };

type ItemCarrito = { producto: Producto; cantidad: number };

function VentasPage() {
  const { perfil } = Route.useRouteContext();
  return (
    <div>
      <PageHeader titulo="Ventas" descripcion="Registre ventas; el precio se toma del inventario y la existencia se descuenta automáticamente." />
      <Tabs defaultValue="nueva">
        <TabsList className="no-print mb-4">
          <TabsTrigger value="nueva"><ShoppingCart className="size-4" /> Nueva venta</TabsTrigger>
          <TabsTrigger value="historial"><Receipt className="size-4" /> {perfil.rol === "gerente" ? "Historial" : "Mis ventas"}</TabsTrigger>
        </TabsList>
        <TabsContent value="nueva"><NuevaVenta /></TabsContent>
        <TabsContent value="historial"><Historial /></TabsContent>
      </Tabs>
    </div>
  );
}

function NuevaVenta() {
  const queryClient = useQueryClient();
  const { data: productos } = useSuspenseQuery(productosQuery());
  const { data: clientes } = useSuspenseQuery(clientesQuery());
  const [busqueda, setBusqueda] = useState("");
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [clienteId, setClienteId] = useState("general");
  const [metodo, setMetodo] = useState("efectivo");
  const [recibido, setRecibido] = useState("");
  const [nuevoCliente, setNuevoCliente] = useState(false);
  const [ventaHecha, setVentaHecha] = useState<string | null>(null);
  const hoy = hoyManagua();

  const resultados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const base = q ? productos.filter((p) => p.nombre.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q)) : productos;
    return base.slice(0, 30);
  }, [productos, busqueda]);

  const total = carrito.reduce((s, i) => s + Number(i.producto.precio) * i.cantidad, 0);
  const vuelto = Number(recibido) - total;

  const agregar = (p: Producto) => {
    const dias = diasParaVencer(p, hoy);
    if (dias !== null && dias < 0) {
      toast.error("Este producto está vencido y no puede venderse");
      return;
    }
    setCarrito((c) => {
      const existente = c.find((i) => i.producto.id === p.id);
      const enCarrito = existente?.cantidad ?? 0;
      if (enCarrito + 1 > p.existencia) {
        toast.error(`Solo hay ${p.existencia} unidades de ${p.nombre}`);
        return c;
      }
      return existente
        ? c.map((i) => (i.producto.id === p.id ? { ...i, cantidad: i.cantidad + 1 } : i))
        : [...c, { producto: p, cantidad: 1 }];
    });
  };

  const cambiarCantidad = (id: string, cantidad: number) => {
    setCarrito((c) =>
      c
        .map((i) => (i.producto.id === id ? { ...i, cantidad: Math.min(Math.max(cantidad, 0), i.producto.existencia) } : i))
        .filter((i) => i.cantidad > 0),
    );
  };

  const registrar = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("registrar_venta", {
        _cliente_id: clienteId === "general" ? (null as unknown as string) : clienteId,
        _metodo_pago: metodo,
        _items: carrito.map((i) => ({ producto_id: i.producto.id, cantidad: i.cantidad })),
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: (id) => {
      setVentaHecha(id);
      setCarrito([]);
      setRecibido("");
      setClienteId("general");
      queryClient.invalidateQueries({ queryKey: ["productos"] });
      queryClient.invalidateQueries({ queryKey: ["ventas"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["reportes"] });
    },
    onError: (e) => toast.error(mensajeError(e)),
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
      <Panel titulo="Productos">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input autoFocus placeholder="Buscar producto por código o nombre…" className="pl-9" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {resultados.map((p) => {
            const agotado = p.existencia <= 0;
            const dias = diasParaVencer(p, hoy);
            return (
              <button
                key={p.id}
                disabled={agotado}
                onClick={() => agregar(p)}
                className={cn(
                  "flex items-start justify-between gap-3 rounded-xl border bg-card p-3 text-left transition hover:border-primary hover:bg-primary-soft/50 disabled:cursor-not-allowed disabled:opacity-50",
                )}
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">{p.nombre}</div>
                  <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">{p.codigo} · Existencia {formatEntero(p.existencia)}</div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {tieneStockBajo(p) && <StockBajoBadge />}
                    {porVencer(p, hoy) && dias !== null && <VencimientoBadge dias={dias} />}
                  </div>
                </div>
                <div className="tabular shrink-0 font-semibold text-primary">{formatCordobas(p.precio)}</div>
              </button>
            );
          })}
        </div>
        {resultados.length === 0 && <Vacio texto="No se encontraron productos." />}
      </Panel>

      <div className="space-y-4">
        <Panel titulo="Detalle de la venta">
          {carrito.length === 0 ? (
            <Vacio texto="Seleccione productos para agregarlos a la venta." />
          ) : (
            <ul className="divide-y">
              {carrito.map((i) => (
                <li key={i.producto.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{i.producto.nombre}</div>
                    <div className="text-xs text-muted-foreground">{formatCordobas(i.producto.precio)} c/u</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="outline" className="size-7" onClick={() => cambiarCantidad(i.producto.id, i.cantidad - 1)} aria-label="Restar">
                      <Minus className="size-3" />
                    </Button>
                    <Input
                      className="h-7 w-12 px-1 text-center"
                      type="number"
                      value={i.cantidad}
                      onChange={(e) => cambiarCantidad(i.producto.id, Number(e.target.value))}
                    />
                    <Button size="icon" variant="outline" className="size-7" onClick={() => agregar(i.producto)} aria-label="Sumar">
                      <Plus className="size-3" />
                    </Button>
                  </div>
                  <div className="tabular w-24 text-right text-sm font-semibold">{formatCordobas(Number(i.producto.precio) * i.cantidad)}</div>
                  <Button size="icon" variant="ghost" className="size-7 text-destructive" onClick={() => cambiarCantidad(i.producto.id, 0)} aria-label="Quitar">
                    <Trash2 className="size-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Cliente</Label>
                <button className="flex items-center gap-1 text-xs font-medium text-primary hover:underline" onClick={() => setNuevoCliente(true)}>
                  <UserPlus className="size-3.5" /> Nuevo cliente
                </button>
              </div>
              <Select value={clienteId} onValueChange={setClienteId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">Consumidor final</SelectItem>
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nombre}{c.cedula ? ` · ${c.cedula}` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Método de pago</Label>
                <Select value={metodo} onValueChange={setMetodo}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(METODOS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {metodo === "efectivo" && (
                <div className="space-y-1.5">
                  <Label htmlFor="recibido">Recibido (C$)</Label>
                  <Input id="recibido" type="number" min="0" step="0.01" value={recibido} onChange={(e) => setRecibido(e.target.value)} />
                </div>
              )}
            </div>
            <div className="rounded-xl bg-gradient-brand p-4 text-primary-foreground">
              <div className="flex items-baseline justify-between">
                <span className="text-sm opacity-85">Total a pagar</span>
                <span className="tabular font-display text-3xl font-bold">{formatCordobas(total)}</span>
              </div>
              {metodo === "efectivo" && recibido !== "" && (
                <div className="mt-1 flex justify-between text-sm opacity-90">
                  <span>Vuelto</span>
                  <span className="tabular font-semibold">{vuelto >= 0 ? formatCordobas(vuelto) : "Monto insuficiente"}</span>
                </div>
              )}
            </div>
            <Button
              className="h-11 w-full bg-success text-success-foreground hover:bg-success/90"
              disabled={carrito.length === 0 || registrar.isPending || (metodo === "efectivo" && recibido !== "" && vuelto < 0)}
              onClick={() => registrar.mutate()}
            >
              {registrar.isPending ? "Registrando…" : "Registrar venta"}
            </Button>
          </div>
        </Panel>
      </div>

      {nuevoCliente && (
        <ClienteRapido
          onClose={() => setNuevoCliente(false)}
          onCreado={(id) => {
            setClienteId(id);
            setNuevoCliente(false);
          }}
        />
      )}
      {ventaHecha && <ComprobanteDialog ventaId={ventaHecha} onClose={() => setVentaHecha(null)} />}
    </div>
  );
}

function ClienteRapido({ onClose, onCreado }: { onClose: () => void; onCreado: (id: string) => void }) {
  const queryClient = useQueryClient();
  const [nombre, setNombre] = useState("");
  const [cedula, setCedula] = useState("");
  const [telefono, setTelefono] = useState("");
  const crear = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("clientes")
        .insert({ nombre: nombre.trim(), cedula: cedula.trim() || null, telefono: telefono.trim() || null })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: async (id) => {
      await queryClient.invalidateQueries({ queryKey: ["clientes"] });
      toast.success("Cliente registrado");
      onCreado(id);
    },
    onError: (e) => toast.error(mensajeError(e)),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nuevo cliente</DialogTitle></DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            crear.mutate();
          }}
        >
          <div className="space-y-1.5"><Label htmlFor="cn">Nombre</Label><Input id="cn" required value={nombre} onChange={(e) => setNombre(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label htmlFor="cc">Cédula</Label><Input id="cc" value={cedula} onChange={(e) => setCedula(e.target.value)} placeholder="001-010190-0000A" /></div>
            <div className="space-y-1.5"><Label htmlFor="ct">Teléfono</Label><Input id="ct" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="8888-8888" /></div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={crear.isPending}>Guardar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ComprobanteDialog({ ventaId, onClose, venta }: { ventaId: string; onClose: () => void; venta?: Venta }) {
  const { data: detalles } = useQuery(detalleVentaQuery(ventaId));
  const { data: cabecera } = useQuery({
    queryKey: ["ventas", "cabecera", ventaId],
    enabled: !venta,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ventas")
        .select("id, numero, total, metodo_pago, created_at, clientes(nombre), profiles(nombre)")
        .eq("id", ventaId)
        .single();
      if (error) throw error;
      return data as unknown as Venta;
    },
  });
  const v = venta ?? cabecera;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Comprobante de venta</DialogTitle></DialogHeader>
          <div className="rounded-xl border p-4 text-sm">
          <div className="text-center">
            <div className="font-display text-base font-bold">Farmacia San Judas</div>
            <div className="text-xs text-muted-foreground">Managua, Nicaragua</div>
          </div>
          {v && (
            <div className="mt-3 grid grid-cols-2 gap-1 text-xs text-muted-foreground">
              <span>Factura N.º {String(v.numero).padStart(6, "0")}</span>
              <span className="text-right">{formatFechaHora(v.created_at)}</span>
              <span>Cliente: {v.clientes?.nombre ?? "Consumidor final"}</span>
              <span className="text-right">Pago: {METODOS[v.metodo_pago] ?? v.metodo_pago}</span>
               <span className="col-span-2">Atendió: {v.usuario_nombre ?? v.profiles?.nombre ?? "—"}</span>
            </div>
          )}
          <div className="my-3 border-t border-dashed" />
          <ul className="space-y-1.5">
            {(detalles ?? []).map((d) => (
              <li key={d.id} className="flex justify-between gap-3">
                 <span>{d.cantidad} × {d.producto_nombre}<span className="block text-xs text-muted-foreground">{formatCordobas(d.precio_unitario)} c/u</span></span>
                <span className="tabular">{formatCordobas(d.subtotal)}</span>
              </li>
            ))}
          </ul>
          <div className="my-3 border-t border-dashed" />
          <div className="flex justify-between text-base font-bold">
            <span>Total</span>
            <span className="tabular">{formatCordobas(v?.total ?? 0)}</span>
          </div>
        </div>
        <DialogFooter className="no-print">
          <Button variant="outline" onClick={() => window.print()}><Printer className="size-4" /> Imprimir</Button>
          <Button onClick={onClose}>Listo</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Historial() {
  const { data: ventas } = useSuspenseQuery(ventasRecientesQuery());
  const [seleccion, setSeleccion] = useState<Venta | null>(null);
  const [filtros, setFiltros] = useState({ desde: "", hasta: "", mes: "", producto: "", cajero: "", soloDemo: false });
  const filtradas = filtrarVentas(ventas, filtros);
  const resumen = resumenDemo(ventas);
  const productos = [...new Map(ventas.flatMap((v) => v.venta_detalles.filter((d) => d.producto_id).map((d) => [d.producto_id, d.producto_nombre] as const))).entries()];
  const cajeros = [...new Map(ventas.filter((v) => v.usuario_id).map((v) => [v.usuario_id, v.usuario_nombre ?? v.profiles?.nombre ?? "—"] as const)).entries()];
  return (
    <div className="space-y-6">
      {resumen.length > 0 && <section className="space-y-3">
        <h2 className="text-lg font-semibold">Demostración del examen</h2>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/60"><tr><th className="p-3 text-left">Mes</th><th className="p-3 text-right">Transacciones</th><th className="p-3 text-right">Total vendido</th></tr></thead>
            <tbody className="divide-y">{resumen.map((r) => <tr key={r.mes}><td className="p-3">{new Intl.DateTimeFormat("es-NI", { month: "long", year: "numeric", timeZone: "America/Managua" }).format(new Date(`${r.mes}-15T12:00:00Z`))}</td><td className="p-3 text-right">{r.cantidad}</td><td className="p-3 text-right">{formatCordobas(r.total)}</td></tr>)}</tbody>
            <tfoot className="border-t font-semibold"><tr><td className="p-3">Total demostración</td><td className="p-3 text-right">{resumen.reduce((s, r) => s + r.cantidad, 0)}</td><td className="p-3 text-right">{formatCordobas(resumen.reduce((s, r) => s + r.total, 0))}</td></tr></tfoot>
          </table>
        </div>
      </section>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1"><Label htmlFor="ventas-desde">Desde</Label><Input id="ventas-desde" type="date" value={filtros.desde} onChange={(e) => setFiltros({ ...filtros, desde: e.target.value })} /></div>
        <div className="space-y-1"><Label htmlFor="ventas-hasta">Hasta</Label><Input id="ventas-hasta" type="date" value={filtros.hasta} onChange={(e) => setFiltros({ ...filtros, hasta: e.target.value })} /></div>
        <div className="space-y-1"><Label htmlFor="ventas-mes">Mes</Label><Input id="ventas-mes" type="month" value={filtros.mes} onChange={(e) => setFiltros({ ...filtros, mes: e.target.value })} /></div>
        <div className="space-y-1"><Label>Producto</Label><Select value={filtros.producto || "todos"} onValueChange={(v) => setFiltros({ ...filtros, producto: v === "todos" ? "" : v })}><SelectTrigger aria-label="Filtrar por producto"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todos los productos</SelectItem>{productos.map(([id, nombre]) => id && <SelectItem key={id} value={id}>{nombre}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1"><Label>Cajero</Label><Select value={filtros.cajero || "todos"} onValueChange={(v) => setFiltros({ ...filtros, cajero: v === "todos" ? "" : v })}><SelectTrigger aria-label="Filtrar por cajero"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todos los cajeros</SelectItem>{cajeros.map(([id, nombre]) => id && <SelectItem key={id} value={id}>{nombre}</SelectItem>)}</SelectContent></Select></div>
        <div className="flex items-center gap-2 self-end py-2"><Checkbox id="ventas-demo" checked={filtros.soloDemo} onCheckedChange={(v) => setFiltros({ ...filtros, soloDemo: v === true })} /><Label htmlFor="ventas-demo">Solo demostración</Label></div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><span>{filtradas.length} transacciones · {formatCordobas(filtradas.reduce((s, v) => s + Number(v.total), 0))}</span><Button variant="outline" size="sm" onClick={() => setFiltros({ desde: "", hasta: "", mes: "", producto: "", cajero: "", soloDemo: false })}>Limpiar filtros</Button></div>
    <Panel titulo="Historial de ventas" acciones={<span className="text-xs text-muted-foreground">{filtradas.length} registros</span>}>
      <div className="-mx-5 -my-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-5 py-3 font-semibold">Factura</th>
              <th className="px-5 py-3 font-semibold">Fecha</th>
              <th className="px-5 py-3 font-semibold">Cliente</th>
              <th className="px-5 py-3 font-semibold">Cajero</th>
              <th className="px-5 py-3 font-semibold">Pago</th>
              <th className="px-5 py-3 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtradas.map((v) => (
              <tr key={v.id} className="cursor-pointer hover:bg-muted/40" onClick={() => setSeleccion(v)}>
                <td className="px-5 py-3 font-mono text-xs"><Button variant="link" size="sm" onClick={() => setSeleccion(v)}>#{String(v.numero).padStart(6, "0")}</Button></td>
                <td className="px-5 py-3 text-muted-foreground">{formatFechaHora(v.created_at)}</td>
                <td className="px-5 py-3">{v.clientes?.nombre ?? "Consumidor final"}</td>
                <td className="px-5 py-3 text-muted-foreground">{v.usuario_nombre ?? v.profiles?.nombre ?? "—"}</td>
                <td className="px-5 py-3">{METODOS[v.metodo_pago] ?? v.metodo_pago}</td>
                <td className="tabular px-5 py-3 text-right font-semibold">{formatCordobas(v.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtradas.length === 0 && <Vacio texto="No hay ventas para los filtros seleccionados." />}
      </div>
      {seleccion && <ComprobanteDialog ventaId={seleccion.id} venta={seleccion} onClose={() => setSeleccion(null)} />}
    </Panel>
    </div>
  );
}
