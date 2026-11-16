import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Vacio } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { clientesQuery, mensajeError, type Cliente } from "@/lib/queries";
import { formatFecha } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/_panel/_gerente/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes · Farmacia San Judas SIG" },
      { name: "description", content: "Registro y administración de clientes de la farmacia." },
      { property: "og:title", content: "Clientes · Farmacia San Judas SIG" },
      { property: "og:description", content: "Registro y administración de clientes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(clientesQuery()),
  component: ClientesPage,
});

function ClientesPage() {
  const { data: clientes } = useSuspenseQuery(clientesQuery());
  const [busqueda, setBusqueda] = useState("");
  const [editando, setEditando] = useState<Cliente | "nuevo" | null>(null);
  const queryClient = useQueryClient();

  const lista = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return clientes;
    return clientes.filter((c) => [c.nombre, c.cedula, c.telefono, c.email].some((v) => v?.toLowerCase().includes(q)));
  }, [clientes, busqueda]);

  const eliminar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clientes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cliente eliminado");
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
    },
    onError: (e) => toast.error(mensajeError(e)),
  });

  return (
    <div>
      <PageHeader
        titulo="Clientes"
        descripcion={`${clientes.length} clientes registrados`}
        acciones={<Button onClick={() => setEditando("nuevo")}><Plus className="size-4" /> Nuevo cliente</Button>}
      />
      <div className="rounded-2xl border bg-card shadow-card">
        <div className="border-b p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por nombre, cédula, teléfono o correo…" className="pl-9" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">Nombre</th>
                <th className="px-4 py-3 font-semibold">Cédula</th>
                <th className="px-4 py-3 font-semibold">Teléfono</th>
                <th className="px-4 py-3 font-semibold">Correo</th>
                <th className="px-4 py-3 font-semibold">Dirección</th>
                <th className="px-4 py-3 font-semibold">Registrado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {lista.map((c) => (
                <tr key={c.id} className="hover:bg-muted/40">
                  <td className="px-4 py-3 font-medium">{c.nombre}</td>
                  <td className="px-4 py-3 font-mono text-xs">{c.cedula ?? "—"}</td>
                  <td className="px-4 py-3">{c.telefono ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.email ?? "—"}</td>
                  <td className="max-w-56 truncate px-4 py-3 text-muted-foreground">{c.direccion ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatFecha(c.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" aria-label="Editar" onClick={() => setEditando(c)}><Pencil className="size-4" /></Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Eliminar"
                        className="text-destructive hover:text-destructive"
                        onClick={() => confirm(`¿Eliminar a ${c.nombre}?`) && eliminar.mutate(c.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {lista.length === 0 && <Vacio texto="No hay clientes que mostrar." />}
        </div>
      </div>
      {editando && <ClienteDialog cliente={editando === "nuevo" ? null : editando} onClose={() => setEditando(null)} />}
    </div>
  );
}

function ClienteDialog({ cliente, onClose }: { cliente: Cliente | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [f, setF] = useState({
    nombre: cliente?.nombre ?? "",
    cedula: cliente?.cedula ?? "",
    telefono: cliente?.telefono ?? "",
    email: cliente?.email ?? "",
    direccion: cliente?.direccion ?? "",
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  const guardar = useMutation({
    mutationFn: async () => {
      const datos = {
        nombre: f.nombre.trim(),
        cedula: f.cedula.trim() || null,
        telefono: f.telefono.trim() || null,
        email: f.email.trim() || null,
        direccion: f.direccion.trim() || null,
      };
      const { error } = cliente
        ? await supabase.from("clientes").update(datos).eq("id", cliente.id)
        : await supabase.from("clientes").insert(datos);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(cliente ? "Cliente actualizado" : "Cliente registrado");
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
      onClose();
    },
    onError: (e) => toast.error(mensajeError(e)),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{cliente ? "Editar cliente" : "Nuevo cliente"}</DialogTitle></DialogHeader>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); guardar.mutate(); }}>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="n">Nombre completo</Label><Input id="n" required value={f.nombre} onChange={set("nombre")} /></div>
          <div className="space-y-1.5"><Label htmlFor="c">Cédula</Label><Input id="c" value={f.cedula} onChange={set("cedula")} placeholder="001-010190-0000A" /></div>
          <div className="space-y-1.5"><Label htmlFor="t">Teléfono</Label><Input id="t" value={f.telefono} onChange={set("telefono")} placeholder="8888-8888" /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="e">Correo</Label><Input id="e" type="email" value={f.email} onChange={set("email")} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="d">Dirección</Label><Input id="d" value={f.direccion} onChange={set("direccion")} placeholder="Barrio, Managua" /></div>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={guardar.isPending}>Guardar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
