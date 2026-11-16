import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent } from "react";
import { AlertTriangle, CalendarClock, Package, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, StatCard, Vacio } from "@/components/app/PageHeader";
import { OkBadge, StockBajoBadge, VencimientoBadge } from "@/components/app/Badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { categoriasQuery, mensajeError, productosQuery, type Producto } from "@/lib/queries";
import { formatCordobas, formatEntero, formatFecha, hoyManagua } from "@/lib/format";
import { diasParaVencer, porVencer, tieneStockBajo } from "@/lib/inventario";
import { puedeEditarProductos } from "@/lib/permisos";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_panel/productos")({
  head: () => ({
    meta: [
      { title: "Productos e inventario · Farmacia San Judas SIG" },
      { name: "description", content: "Consulta y control del inventario de productos de la farmacia." },
      { property: "og:title", content: "Productos e inventario · Farmacia San Judas SIG" },
      { property: "og:description", content: "Consulta y control del inventario de productos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(productosQuery()),
      context.queryClient.ensureQueryData(categoriasQuery()),
    ]),
  component: ProductosPage,
});

type Filtro = "todos" | "stock" | "vencer";

function ProductosPage() {
  const { perfil } = Route.useRouteContext();
  const editable = puedeEditarProductos(perfil.rol);
  const { data: productos } = useSuspenseQuery(productosQuery());
  const { data: categorias } = useSuspenseQuery(categoriasQuery());
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState("todas");
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [editando, setEditando] = useState<Producto | null | "nuevo">(null);
  const [eliminando, setEliminando] = useState<Producto | null>(null);
  const hoy = hoyManagua();
  const queryClient = useQueryClient();

  const conteoStock = productos.filter(tieneStockBajo).length;
  const conteoVencer = productos.filter((p) => porVencer(p, hoy)).length;

  const lista = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return productos.filter((p) => {
      if (q && !p.nombre.toLowerCase().includes(q) && !p.codigo.toLowerCase().includes(q)) return false;
      if (categoria !== "todas" && p.categoria_id !== categoria) return false;
      if (filtro === "stock" && !tieneStockBajo(p)) return false;
      if (filtro === "vencer" && !porVencer(p, hoy)) return false;
      return true;
    });
  }, [productos, busqueda, categoria, filtro, hoy]);

  const eliminar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("productos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Producto eliminado");
      queryClient.invalidateQueries({ queryKey: ["productos"] });
      setEliminando(null);
    },
    onError: (e) => toast.error(mensajeError(e)),
  });

  return (
    <div>
      <PageHeader
        titulo="Productos e inventario"
        descripcion={editable ? "Registre y actualice productos, precios y existencias." : "Consulta de productos, precios y existencias."}
        acciones={
          editable && (
            <Button onClick={() => setEditando("nuevo")}>
              <Plus className="size-4" /> Nuevo producto
            </Button>
          )
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <button onClick={() => setFiltro("todos")} className="text-left">
          <StatCard titulo="Total de productos" valor={formatEntero(productos.length)} icon={Package} />
        </button>
        <button onClick={() => setFiltro("stock")} className="text-left">
          <StatCard titulo="Stock bajo" valor={formatEntero(conteoStock)} detalle="Existencia igual o menor al mínimo" icon={AlertTriangle} tono="destructive" />
        </button>
        <button onClick={() => setFiltro("vencer")} className="text-left">
          <StatCard titulo="Por vencer" valor={formatEntero(conteoVencer)} detalle="Vencen en menos de 30 días" icon={CalendarClock} tono="warning" />
        </button>
      </div>

      <div className="rounded-2xl border bg-card shadow-card">
        <div className="flex flex-wrap items-center gap-3 border-b p-4">
          <div className="relative min-w-56 flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por código o nombre…" className="pl-9" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </div>
          <Select value={categoria} onValueChange={setCategoria}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las categorías</SelectItem>
              {categorias.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filtro} onValueChange={(v) => setFiltro(v as Filtro)}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="stock">Solo stock bajo</SelectItem>
              <SelectItem value="vencer">Solo por vencer</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">Código</th>
                <th className="px-4 py-3 font-semibold">Producto</th>
                <th className="px-4 py-3 font-semibold">Categoría</th>
                <th className="px-4 py-3 text-right font-semibold">Precio</th>
                <th className="px-4 py-3 text-right font-semibold">Existencia</th>
                <th className="px-4 py-3 text-right font-semibold">Stock mín.</th>
                <th className="px-4 py-3 font-semibold">Vencimiento</th>
                <th className="px-4 py-3 font-semibold">Alertas</th>
                {editable && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y">
              {lista.map((p) => {
                const bajo = tieneStockBajo(p);
                const vence = porVencer(p, hoy);
                const dias = diasParaVencer(p, hoy);
                return (
                  <tr
                    key={p.id}
                    className={cn(
                      "transition-colors hover:bg-muted/40",
                      bajo && "bg-destructive-soft/60 hover:bg-destructive-soft",
                      !bajo && vence && "bg-warning-soft/60 hover:bg-warning-soft",
                    )}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.codigo}</td>
                    <td className="px-4 py-3 font-medium">{p.nombre}</td>
                    <td className="px-4 py-3 text-muted-foreground">{p.categorias?.nombre ?? "—"}</td>
                    <td className="tabular px-4 py-3 text-right font-semibold">{formatCordobas(p.precio)}</td>
                    <td className={cn("tabular px-4 py-3 text-right font-semibold", bajo && "text-destructive")}>{formatEntero(p.existencia)}</td>
                    <td className="tabular px-4 py-3 text-right text-muted-foreground">{formatEntero(p.stock_minimo)}</td>
                    <td className={cn("px-4 py-3", vence && "font-medium text-warning")}>{formatFecha(p.fecha_vencimiento)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {bajo && <StockBajoBadge />}
                        {vence && dias !== null && <VencimientoBadge dias={dias} />}
                        {!bajo && !vence && <OkBadge />}
                      </div>
                    </td>
                    {editable && (
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" aria-label="Editar" onClick={() => setEditando(p)}>
                            <Pencil className="size-4" />
                          </Button>
                          <Button variant="ghost" size="icon" aria-label="Eliminar" className="text-destructive hover:text-destructive" onClick={() => setEliminando(p)}>
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {lista.length === 0 && (
            <Vacio texto={productos.length === 0 ? "Aún no hay productos registrados." : "No hay productos que coincidan con la búsqueda."} />
          )}
        </div>
      </div>

      {editable && editando && (
        <ProductoDialog
          producto={editando === "nuevo" ? null : editando}
          categorias={categorias}
          onClose={() => setEditando(null)}
        />
      )}

      <AlertDialog open={!!eliminando} onOpenChange={(o) => !o && setEliminando(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará “{eliminando?.nombre}”. Las ventas registradas conservarán su historial.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => eliminando && eliminar.mutate(eliminando.id)}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ProductoDialog({
  producto,
  categorias,
  onClose,
}: {
  producto: Producto | null;
  categorias: { id: string; nombre: string }[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    codigo: producto?.codigo ?? "",
    nombre: producto?.nombre ?? "",
    categoria_id: producto?.categoria_id ?? "",
    precio: producto ? String(producto.precio) : "",
    existencia: producto ? String(producto.existencia) : "0",
    stock_minimo: producto ? String(producto.stock_minimo) : "5",
    fecha_vencimiento: producto?.fecha_vencimiento ?? "",
  });
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const guardar = useMutation({
    mutationFn: async () => {
      const datos = {
        codigo: form.codigo.trim(),
        nombre: form.nombre.trim(),
        categoria_id: form.categoria_id || null,
        precio: Number(form.precio),
        existencia: Math.trunc(Number(form.existencia)),
        stock_minimo: Math.trunc(Number(form.stock_minimo)),
        fecha_vencimiento: form.fecha_vencimiento || null,
      };
      const { error } = producto
        ? await supabase.from("productos").update(datos).eq("id", producto.id)
        : await supabase.from("productos").insert(datos);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(producto ? "Producto actualizado" : "Producto registrado");
      queryClient.invalidateQueries({ queryKey: ["productos"] });
      queryClient.invalidateQueries({ queryKey: ["categorias"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      onClose();
    },
    onError: (e) => toast.error(mensajeError(e)),
  });

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    guardar.mutate();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{producto ? "Editar producto" : "Nuevo producto"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={enviar} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="codigo">Código</Label>
            <Input id="codigo" required value={form.codigo} onChange={(e) => set("codigo")(e.target.value)} placeholder="Ej. MED-001" />
          </div>
          <div className="space-y-1.5">
            <Label>Categoría</Label>
            <Select value={form.categoria_id || "ninguna"} onValueChange={(v) => set("categoria_id")(v === "ninguna" ? "" : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ninguna">Sin categoría</SelectItem>
                {categorias.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="nombre">Nombre del producto</Label>
            <Input id="nombre" required value={form.nombre} onChange={(e) => set("nombre")(e.target.value)} placeholder="Ej. Acetaminofén 500 mg x 10" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="precio">Precio (C$)</Label>
            <Input id="precio" type="number" step="0.01" min="0" required value={form.precio} onChange={(e) => set("precio")(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="venc">Fecha de vencimiento</Label>
            <Input id="venc" type="date" value={form.fecha_vencimiento} onChange={(e) => set("fecha_vencimiento")(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="exist">Existencia</Label>
            <Input id="exist" type="number" min="0" step="1" required value={form.existencia} onChange={(e) => set("existencia")(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="min">Stock mínimo</Label>
            <Input id="min" type="number" min="0" step="1" required value={form.stock_minimo} onChange={(e) => set("stock_minimo")(e.target.value)} />
          </div>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={guardar.isPending}>{guardar.isPending ? "Guardando…" : "Guardar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
