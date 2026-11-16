import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FolderTree, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Vacio } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { categoriasQuery, mensajeError, type Categoria } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/_panel/_gerente/categorias")({
  head: () => ({
    meta: [
      { title: "Categorías · Farmacia San Judas SIG" },
      { name: "description", content: "Administración de categorías de productos." },
      { property: "og:title", content: "Categorías · Farmacia San Judas SIG" },
      { property: "og:description", content: "Administración de categorías de productos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(categoriasQuery()),
  component: CategoriasPage,
});

function CategoriasPage() {
  const { data: categorias } = useSuspenseQuery(categoriasQuery());
  const [editando, setEditando] = useState<Categoria | "nueva" | null>(null);
  const queryClient = useQueryClient();

  const eliminar = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categorias").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Categoría eliminada");
      queryClient.invalidateQueries({ queryKey: ["categorias"] });
      queryClient.invalidateQueries({ queryKey: ["productos"] });
    },
    onError: (e) => toast.error(mensajeError(e)),
  });

  return (
    <div>
      <PageHeader
        titulo="Categorías"
        descripcion="Organice los productos por tipo para facilitar búsquedas y reportes."
        acciones={<Button onClick={() => setEditando("nueva")}><Plus className="size-4" /> Nueva categoría</Button>}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {categorias.map((c) => {
          const cantidad = c.productos?.[0]?.count ?? 0;
          return (
            <div key={c.id} className="group rounded-2xl border bg-card p-5 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-success-soft text-success">
                  <FolderTree className="size-5" />
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" aria-label="Editar" onClick={() => setEditando(c)}><Pencil className="size-4" /></Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Eliminar"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      if (confirm(`¿Eliminar la categoría “${c.nombre}”? Sus productos quedarán sin categoría.`)) eliminar.mutate(c.id);
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
              <h3 className="mt-3 font-semibold">{c.nombre}</h3>
              <p className="mt-1 line-clamp-2 min-h-10 text-sm text-muted-foreground">{c.descripcion || "Sin descripción"}</p>
              <p className="mt-3 text-xs font-semibold text-primary">{cantidad} producto{cantidad === 1 ? "" : "s"}</p>
            </div>
          );
        })}
      </div>
      {categorias.length === 0 && <Vacio texto="No hay categorías registradas." />}
      {editando && <CategoriaDialog categoria={editando === "nueva" ? null : editando} onClose={() => setEditando(null)} />}
    </div>
  );
}

function CategoriaDialog({ categoria, onClose }: { categoria: Categoria | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [nombre, setNombre] = useState(categoria?.nombre ?? "");
  const [descripcion, setDescripcion] = useState(categoria?.descripcion ?? "");
  const guardar = useMutation({
    mutationFn: async () => {
      const datos = { nombre: nombre.trim(), descripcion: descripcion.trim() || null };
      const { error } = categoria
        ? await supabase.from("categorias").update(datos).eq("id", categoria.id)
        : await supabase.from("categorias").insert(datos);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(categoria ? "Categoría actualizada" : "Categoría creada");
      queryClient.invalidateQueries({ queryKey: ["categorias"] });
      queryClient.invalidateQueries({ queryKey: ["productos"] });
      onClose();
    },
    onError: (e) => toast.error(mensajeError(e)),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{categoria ? "Editar categoría" : "Nueva categoría"}</DialogTitle></DialogHeader>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); guardar.mutate(); }}>
          <div className="space-y-1.5"><Label htmlFor="n">Nombre</Label><Input id="n" required value={nombre} onChange={(e) => setNombre(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="d">Descripción</Label><Textarea id="d" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={guardar.isPending}>Guardar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
