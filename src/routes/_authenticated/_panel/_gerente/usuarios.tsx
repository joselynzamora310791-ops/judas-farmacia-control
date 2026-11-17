import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Pencil, ShieldCheck, Trash2, UserCog, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, StatCard, Vacio } from "@/components/app/PageHeader";
import { RolBadge } from "@/components/app/Badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { mensajeError, usuariosQuery, type UsuarioSistema } from "@/lib/queries";
import { formatFecha } from "@/lib/format";
import { NOMBRE_ROL, puedeEliminarUsuario, type Rol } from "@/lib/permisos";
import { crearUsuario, editarUsuario, eliminarUsuario } from "@/lib/usuarios.functions";

export const Route = createFileRoute("/_authenticated/_panel/_gerente/usuarios")({
  head: () => ({
    meta: [
      { title: "Usuarios y roles · Farmacia San Judas SIG" },
      { name: "description", content: "Administración del personal y sus permisos en el sistema." },
      { property: "og:title", content: "Usuarios y roles · Farmacia San Judas SIG" },
      { property: "og:description", content: "Administración del personal y sus permisos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(usuariosQuery()),
  component: UsuariosPage,
});

const PERMISOS: { modulo: string; gerente: boolean; cajero: boolean | string }[] = [
  { modulo: "Dashboard", gerente: true, cajero: false },
  { modulo: "Productos e inventario", gerente: true, cajero: "Solo consulta" },
  { modulo: "Modificar precios", gerente: true, cajero: false },
  { modulo: "Categorías", gerente: true, cajero: false },
  { modulo: "Clientes", gerente: true, cajero: false },
  { modulo: "Ventas", gerente: true, cajero: "Registrar y ver las suyas" },
  { modulo: "Reportes", gerente: true, cajero: false },
  { modulo: "Análisis ABC", gerente: true, cajero: false },
  { modulo: "Usuarios y roles", gerente: true, cajero: false },
];

function UsuariosPage() {
  const { perfil } = Route.useRouteContext();
  const { data: usuarios } = useSuspenseQuery(usuariosQuery());
  const [creando, setCreando] = useState(false);
  const [editando, setEditando] = useState<UsuarioSistema | null>(null);
  const [eliminando, setEliminando] = useState<UsuarioSistema | null>(null);
  const eliminar = useServerFn(eliminarUsuario);
  const queryClient = useQueryClient();

  const borrar = useMutation({
    mutationFn: (id: string) => eliminar({ data: { id } }),
    onSuccess: () => {
      toast.success("Usuario eliminado");
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      setEliminando(null);
    },
    onError: (e) => toast.error(mensajeError(e)),
  });

  const cambiarRol = useMutation({
    mutationFn: async ({ userId, rol }: { userId: string; rol: Rol | "ninguno" }) => {
      const { error: e1 } = await supabase.from("user_roles").delete().eq("user_id", userId);
      if (e1) throw e1;
      if (rol !== "ninguno") {
        const { error: e2 } = await supabase.from("user_roles").insert({ user_id: userId, role: rol });
        if (e2) throw e2;
      }
    },
    onSuccess: () => {
      toast.success("Rol actualizado");
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
    },
    onError: (e) => toast.error(mensajeError(e)),
  });

  const gerentes = usuarios.filter((u) => u.rol === "gerente").length;
  const cajeros = usuarios.filter((u) => u.rol === "cajero").length;

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Usuarios y roles"
        descripcion="Cree cuentas para el personal y defina qué puede hacer cada uno."
        acciones={<Button onClick={() => setCreando(true)}><UserPlus className="size-4" /> Nuevo usuario</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard titulo="Usuarios" valor={usuarios.length} icon={Users} />
        <StatCard titulo="Gerentes" valor={gerentes} icon={ShieldCheck} />
        <StatCard titulo="Cajeros" valor={cajeros} icon={UserCog} tono="success" />
      </div>

      <div className="rounded-2xl border bg-card shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-semibold">Nombre</th>
                <th className="px-4 py-3 font-semibold">Correo</th>
                <th className="px-4 py-3 font-semibold">Rol actual</th>
                <th className="px-4 py-3 font-semibold">Registrado</th>
                <th className="px-4 py-3 font-semibold">Cambiar rol</th>
                <th className="px-4 py-3 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {usuarios.map((u) => {
                const esYo = u.id === perfil.id;
                return (
                  <tr key={u.id} className="hover:bg-muted/40">
                    <td className="px-4 py-3 font-medium">
                      {u.nombre || "—"} {esYo && <span className="ml-1 text-xs text-muted-foreground">(usted)</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3">
                      {u.rol ? <RolBadge rol={u.rol} /> : <span className="text-xs font-semibold text-warning">Sin acceso</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatFecha(u.created_at)}</td>
                    <td className="px-4 py-3">
                      <Select
                        value={u.rol ?? "ninguno"}
                        disabled={esYo || cambiarRol.isPending}
                        onValueChange={(v) => cambiarRol.mutate({ userId: u.id, rol: v as Rol | "ninguno" })}
                      >
                        <SelectTrigger className="h-8 w-40" aria-label={`Rol de ${u.nombre || u.email}`}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="gerente">Gerente</SelectItem>
                          <SelectItem value="cajero">Cajero</SelectItem>
                          <SelectItem value="ninguno">Sin acceso</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setEditando(u)} disabled={borrar.isPending || cambiarRol.isPending}>
                          <Pencil className="size-4" /> Editar
                        </Button>
                        <Button variant="outline" size="sm" className="text-destructive" disabled={!puedeEliminarUsuario(perfil.rol, perfil.id, u.id) || borrar.isPending || cambiarRol.isPending}
                          title={esYo ? "No puede eliminar su propia cuenta durante una sesión activa" : `Eliminar a ${u.nombre || u.email}`}
                          onClick={() => setEliminando(u)}>
                          <Trash2 className="size-4" /> Eliminar
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {usuarios.length === 0 && <Vacio texto="No hay usuarios registrados." />}
        </div>
        <p className="border-t px-4 py-3 text-xs text-muted-foreground">
          Por seguridad, no puede cambiar su propio rol. “Sin acceso” bloquea la entrada al sistema sin borrar la cuenta.
        </p>
      </div>

      <div className="rounded-2xl border bg-card shadow-card">
        <div className="border-b px-5 py-3.5"><h2 className="text-base font-semibold">Permisos por rol</h2></div>
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-5 py-2.5 font-semibold">Módulo</th>
              <th className="px-5 py-2.5 font-semibold">{NOMBRE_ROL.gerente}</th>
              <th className="px-5 py-2.5 font-semibold">{NOMBRE_ROL.cajero}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {PERMISOS.map((p) => (
              <tr key={p.modulo}>
                <td className="px-5 py-2.5">{p.modulo}</td>
                <td className="px-5 py-2.5 font-semibold text-success">Sí</td>
                <td className={`px-5 py-2.5 font-semibold ${p.cajero ? "text-success" : "text-destructive"}`}>
                  {p.cajero === true ? "Sí" : p.cajero === false ? "No" : p.cajero}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {creando && <NuevoUsuarioDialog onClose={() => setCreando(false)} />}
      {editando && <EditarUsuarioDialog usuario={editando} onClose={() => setEditando(null)} />}
      <AlertDialog open={!!eliminando} onOpenChange={(open) => { if (!open && !borrar.isPending) setEliminando(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará la cuenta de {eliminando?.nombre || eliminando?.email}. Ya no podrá iniciar sesión.
              Esta acción no se puede deshacer. Las ventas registradas se conservarán.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" disabled={borrar.isPending} onClick={() => setEliminando(null)}>Cancelar</Button>
            <Button variant="destructive" disabled={borrar.isPending} onClick={() => { if (eliminando) borrar.mutate(eliminando.id); }}>
              <Trash2 className="size-4" /> {borrar.isPending ? "Eliminando…" : "Eliminar usuario"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function EditarUsuarioDialog({ usuario, onClose }: { usuario: UsuarioSistema; onClose: () => void }) {
  const queryClient = useQueryClient();
  const editar = useServerFn(editarUsuario);
  const [f, setF] = useState({ nombre: usuario.nombre, email: usuario.email ?? "", password: "" });
  const guardar = useMutation({
    mutationFn: () => editar({ data: { id: usuario.id, ...f } }),
    onSuccess: () => {
      toast.success("Usuario actualizado");
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      queryClient.invalidateQueries({ queryKey: ["perfil", usuario.id] });
      onClose();
    },
    onError: (e) => {
      const msg = mensajeError(e);
      try {
        const lista = JSON.parse(msg) as { message: string }[];
        toast.error(lista[0]?.message ?? msg);
      } catch { toast.error(msg); }
    },
  });
  return (
    <Dialog open onOpenChange={(open) => { if (!open && !guardar.isPending) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar usuario</DialogTitle>
          <DialogDescription>El rol y los permisos actuales se conservarán.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); guardar.mutate(); }}>
          <div className="space-y-1.5">
            <Label htmlFor="editar-nombre">Nombre completo</Label>
            <Input id="editar-nombre" required minLength={2} maxLength={100} value={f.nombre} disabled={guardar.isPending} onChange={(e) => setF({ ...f, nombre: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="editar-correo">Correo electrónico</Label>
            <Input id="editar-correo" type="email" required maxLength={255} value={f.email} disabled={guardar.isPending} onChange={(e) => setF({ ...f, email: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="editar-password">Nueva contraseña (opcional)</Label>
            <Input id="editar-password" type="password" autoComplete="new-password" minLength={6} maxLength={72} value={f.password} disabled={guardar.isPending} onChange={(e) => setF({ ...f, password: e.target.value })} />
            <p className="text-xs text-muted-foreground">Deje este campo vacío para conservar la contraseña actual.</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={guardar.isPending} onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={guardar.isPending}>{guardar.isPending ? "Guardando…" : "Guardar cambios"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function NuevoUsuarioDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const crear = useServerFn(crearUsuario);
  const [f, setF] = useState({ nombre: "", email: "", password: "", rol: "cajero" as Rol });

  const guardar = useMutation({
    mutationFn: () => crear({ data: f }),
    onSuccess: () => {
      toast.success(`Usuario creado. Ya puede ingresar con ${f.email}`);
      queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      onClose();
    },
    onError: (e) => {
      const msg = (e as Error).message;
      // Los errores de validación llegan como lista JSON; mostramos el primero
      try {
        const lista = JSON.parse(msg) as { message: string }[];
        toast.error(lista[0]?.message ?? msg);
      } catch {
        toast.error(msg);
      }
    },
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo usuario</DialogTitle>
          <DialogDescription>La cuenta queda activa de inmediato. Comparta la contraseña con la persona de forma segura.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); guardar.mutate(); }}>
          <div className="space-y-1.5">
            <Label htmlFor="un">Nombre completo</Label>
            <Input id="un" required value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ue">Correo electrónico</Label>
            <Input id="ue" type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="up">Contraseña</Label>
              <Input id="up" type="password" minLength={6} required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Rol</Label>
              <Select value={f.rol} onValueChange={(v) => setF({ ...f, rol: v as Rol })}>
                <SelectTrigger aria-label="Rol del nuevo usuario"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cajero">Cajero</SelectItem>
                  <SelectItem value="gerente">Gerente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={guardar.isPending}>{guardar.isPending ? "Creando…" : "Crear usuario"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
