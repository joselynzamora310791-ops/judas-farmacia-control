import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
