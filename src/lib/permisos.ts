export type Rol = "gerente" | "cajero";

export type Modulo =
  | "dashboard"
  | "productos"
  | "categorias"
  | "clientes"
  | "ventas"
  | "reportes"
  | "analisis-abc"
  | "usuarios";

const MODULOS_CAJERO: Modulo[] = ["productos", "ventas"];

export function puedeAcceder(rol: Rol | null | undefined, modulo: Modulo): boolean {
  if (rol === "gerente") return true;
  if (rol === "cajero") return MODULOS_CAJERO.includes(modulo);
  return false;
}

/** Solo el gerente crea, edita o elimina productos y precios. */
export function puedeEditarProductos(rol: Rol | null | undefined): boolean {
  return rol === "gerente";
}

export function puedeEliminarUsuario(rol: Rol | null | undefined, usuarioActivoId: string, usuarioId: string): boolean {
  return rol === "gerente" && usuarioActivoId !== usuarioId;
}

export function rutaInicio(rol: Rol | null | undefined): "/dashboard" | "/ventas" | "/sin-acceso" {
  if (rol === "gerente") return "/dashboard";
  if (rol === "cajero") return "/ventas";
  return "/sin-acceso";
}

export const NOMBRE_ROL: Record<Rol, string> = { gerente: "Gerente", cajero: "Cajero" };
