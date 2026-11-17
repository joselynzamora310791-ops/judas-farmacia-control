import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { puedeEliminarUsuario } from "@/lib/permisos";

const esquemaUsuario = z.object({
  nombre: z.string().trim().min(2, "El nombre es muy corto").max(100),
  email: z.string().trim().toLowerCase().email("Correo no válido").max(255),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres").max(72),
  rol: z.enum(["gerente", "cajero"]),
});

/** El gerente crea cuentas del personal ya confirmadas y con su rol asignado. */
export const crearUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => esquemaUsuario.parse(d))
  .handler(async ({ data, context }) => {
    const { data: esGerente, error } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "gerente",
    });
    if (error || !esGerente) throw new Error("Solo el gerente puede crear usuarios");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: creado, error: errCrear } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { nombre: data.nombre },
    });
    if (errCrear || !creado.user) {
      const msg = errCrear?.message ?? "No se pudo crear el usuario";
      if (/already|registered|exists/i.test(msg)) throw new Error("Ya existe un usuario con ese correo");
      if (/weak|guess|pwned|leaked/i.test(msg))
        throw new Error("La contraseña es muy común o fácil de adivinar. Elija una más segura.");
      throw new Error(msg);
    }

    const { error: errRol } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: creado.user.id, role: data.rol }, { onConflict: "user_id,role" });
    if (errRol) throw new Error("El usuario se creó pero no se pudo asignar el rol: " + errRol.message);

    return { id: creado.user.id };
  });

const esquemaEdicion = esquemaUsuario.pick({ nombre: true, email: true }).extend({
  id: z.string().uuid(),
  password: z.union([z.literal(""), esquemaUsuario.shape.password]).optional(),
});

function errorCuenta(message: string): Error {
  if (/already|registered|exists/i.test(message)) return new Error("Ya existe un usuario con ese correo");
  if (/weak|guess|pwned|leaked/i.test(message)) return new Error("La contraseña es muy común o fácil de adivinar. Elija una más segura.");
  return new Error("No se pudo actualizar la cuenta. Compruebe los datos e intente nuevamente.");
}

export const editarUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => esquemaEdicion.parse(d))
  .handler(async ({ data, context }) => {
    const { data: esGerente, error } = await context.supabase.rpc("has_role", {
      _user_id: context.userId, _role: "gerente",
    });
    if (error || !esGerente) throw new Error("Solo el gerente puede editar usuarios");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: actual, error: errActual } = await supabaseAdmin.auth.admin.getUserById(data.id);
    if (errActual || !actual.user) throw new Error("El usuario ya no existe");
    const { error: errCuenta } = await supabaseAdmin.auth.admin.updateUserById(data.id, {
      email: data.email,
      ...(data.email !== actual.user.email ? { email_confirm: true } : {}),
      user_metadata: { ...actual.user.user_metadata, nombre: data.nombre },
      ...(data.password ? { password: data.password } : {}),
    });
    if (errCuenta) throw errorCuenta(errCuenta.message);
    const { data: perfil, error: errPerfil } = await supabaseAdmin.from("profiles")
      .update({ nombre: data.nombre, email: data.email }).eq("id", data.id).select("id").single();
    if (errPerfil || !perfil) {
      // Reconcile a retry against the auth account; do not report partial writes as success.
      throw new Error("La cuenta se actualizó, pero no su nombre y correo en la lista. Intente guardar nuevamente.");
    }
    return { id: data.id };
  });

export const eliminarUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: esGerente, error } = await context.supabase.rpc("has_role", {
      _user_id: context.userId, _role: "gerente",
    });
    if (error || !esGerente) throw new Error("Solo el gerente puede eliminar usuarios");
    if (!puedeEliminarUsuario("gerente", context.userId, data.id))
      throw new Error("No puede eliminar su propia cuenta mientras tiene una sesión activa");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: errEliminar } = await supabaseAdmin.auth.admin.deleteUser(data.id);
    if (errEliminar) throw new Error("No se pudo eliminar el usuario. Intente nuevamente.");
    return { id: data.id };
  });
