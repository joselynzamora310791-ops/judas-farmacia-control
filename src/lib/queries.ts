import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Rol } from "./permisos";

export type Perfil = { id: string; nombre: string; email: string | null; rol: Rol | null };

export const perfilQuery = (userId: string) =>
  queryOptions({
    queryKey: ["perfil", userId],
    staleTime: 60_000,
    queryFn: async (): Promise<Perfil> => {
      const [{ data: perfil, error: e1 }, { data: roles, error: e2 }] = await Promise.all([
        supabase.from("profiles").select("id, nombre, email").eq("id", userId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      const lista = (roles ?? []).map((r) => r.role as Rol);
      const rol: Rol | null = lista.includes("gerente") ? "gerente" : lista.includes("cajero") ? "cajero" : null;
      return { id: userId, nombre: perfil?.nombre ?? "", email: perfil?.email ?? null, rol };
    },
  });

/** Trae todas las filas paginando de 1000 en 1000 (límite por consulta). */
async function traerTodo<T>(consulta: (desde: number, hasta: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const resultado: T[] = [];
  const paso = 1000;
  for (let desde = 0; ; desde += paso) {
    const { data, error } = await consulta(desde, desde + paso - 1);
    if (error) throw error;
    resultado.push(...(data ?? []));
    if (!data || data.length < paso) break;
  }
  return resultado;
}

export type Producto = {
  id: string;
  codigo: string;
  nombre: string;
  categoria_id: string | null;
  precio: number;
  existencia: number;
  stock_minimo: number;
  fecha_vencimiento: string | null;
  categorias: { nombre: string } | null;
};

export const productosQuery = () =>
  queryOptions({
    queryKey: ["productos"],
    queryFn: () =>
      traerTodo<Producto>((d, h) =>
        supabase
          .from("productos")
          .select("id, codigo, nombre, categoria_id, precio, existencia, stock_minimo, fecha_vencimiento, categorias(nombre)")
          .order("nombre")
          .range(d, h) as unknown as PromiseLike<{ data: Producto[] | null; error: unknown }>,
      ),
  });

export type Categoria = { id: string; nombre: string; descripcion: string | null; productos: { count: number }[] };

export const categoriasQuery = () =>
  queryOptions({
    queryKey: ["categorias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categorias")
        .select("id, nombre, descripcion, productos(count)")
        .order("nombre");
      if (error) throw error;
      return (data ?? []) as unknown as Categoria[];
    },
  });

export type Cliente = {
  id: string;
  nombre: string;
  cedula: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  created_at: string;
};

export const clientesQuery = () =>
  queryOptions({
    queryKey: ["clientes"],
    queryFn: () =>
      traerTodo<Cliente>((d, h) =>
        supabase
          .from("clientes")
          .select("id, nombre, cedula, telefono, email, direccion, created_at")
          .order("nombre")
          .range(d, h),
      ),
  });

export type Venta = {
  id: string;
  numero: number;
  total: number;
  metodo_pago: string;
  created_at: string;
  clientes: { nombre: string } | null;
  profiles: { nombre: string } | null;
  usuario_id: string | null;
  usuario_nombre: string | null;
  demo_lote: string | null;
  venta_detalles: { producto_id: string | null; producto_nombre: string; cantidad: number; precio_unitario: number; subtotal: number }[];
};

export const ventasRecientesQuery = () =>
  queryOptions({
    queryKey: ["ventas", "recientes"],
    queryFn: async () => {
      return traerTodo<Venta>((d, h) => supabase
        .from("ventas")
        .select("id, numero, total, metodo_pago, created_at, usuario_id, usuario_nombre, demo_lote, clientes(nombre), profiles(nombre), venta_detalles(producto_id, producto_nombre, cantidad, precio_unitario, subtotal)")
        .order("created_at", { ascending: false }).order("numero", { ascending: false })
        .range(d, h) as unknown as PromiseLike<{ data: Venta[] | null; error: unknown }>);
    },
  });

export type DetalleVenta = {
  id: string;
  producto_nombre: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
};

export const detalleVentaQuery = (ventaId: string) =>
  queryOptions({
    queryKey: ["ventas", "detalle", ventaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("venta_detalles")
        .select("id, producto_nombre, cantidad, precio_unitario, subtotal")
        .eq("venta_id", ventaId);
      if (error) throw error;
      return (data ?? []) as DetalleVenta[];
    },
  });

export type ResumenDashboard = {
  ventas_hoy: number;
  num_ventas_hoy: number;
  ventas_mes: number;
  num_ventas_mes: number;
  total_productos: number;
  valor_inventario: number;
  stock_bajo: number;
  por_vencer: number;
  total_clientes: number;
};

export const dashboardQuery = () =>
  queryOptions({
    queryKey: ["dashboard", "resumen"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("dashboard_resumen");
      if (error) throw error;
      return data as unknown as ResumenDashboard;
    },
  });

export const ventasDiariasQuery = (desde: string, hasta: string) =>
  queryOptions({
    queryKey: ["reportes", "diarias", desde, hasta],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("reporte_ventas_diarias", { _desde: desde, _hasta: hasta });
      if (error) throw error;
      return (data ?? []).map((r) => ({ dia: r.dia, total: Number(r.total), num_ventas: Number(r.num_ventas) }));
    },
  });

export const ventasPorProductoQuery = (desde: string, hasta: string) =>
  queryOptions({
    queryKey: ["reportes", "productos", desde, hasta],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("reporte_productos", { _desde: desde, _hasta: hasta });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        producto_id: r.producto_id,
        codigo: r.codigo,
        nombre: r.nombre,
        categoria: r.categoria,
        cantidad: Number(r.cantidad),
        ingresos: Number(r.ingresos),
      }));
    },
  });

export const ventasPorCategoriaQuery = (desde: string, hasta: string) =>
  queryOptions({
    queryKey: ["reportes", "categorias", desde, hasta],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("reporte_categorias", { _desde: desde, _hasta: hasta });
      if (error) throw error;
      return (data ?? []).map((r) => ({ categoria: r.categoria, cantidad: Number(r.cantidad), ingresos: Number(r.ingresos) }));
    },
  });

export type UsuarioSistema = { id: string; nombre: string; email: string | null; created_at: string; rol: Rol | null };

export const usuariosQuery = () =>
  queryOptions({
    queryKey: ["usuarios"],
    queryFn: async (): Promise<UsuarioSistema[]> => {
      const [{ data: perfiles, error: e1 }, { data: roles, error: e2 }] = await Promise.all([
        supabase.from("profiles").select("id, nombre, email, created_at").order("created_at"),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      return (perfiles ?? []).map((p) => {
        const r = (roles ?? []).filter((x) => x.user_id === p.id).map((x) => x.role as Rol);
        return { ...p, rol: r.includes("gerente") ? "gerente" : r.includes("cajero") ? "cajero" : null };
      });
    },
  });

/** Convierte un error de la base de datos en un mensaje entendible en español. */
export function mensajeError(error: unknown): string {
  const e = error as { message?: string; code?: string } | null;
  if (!e) return "Ocurrió un error inesperado";
  if (e.code === "23505") return "Ya existe un registro con ese valor (código o nombre duplicado)";
  if (e.code === "42501" || /row-level security|permission denied/i.test(e.message ?? ""))
    return "No tiene permiso para realizar esta acción";
  if (e.code === "23514") return "Hay valores no válidos (por ejemplo, números negativos)";
  return e.message ?? "Ocurrió un error inesperado";
}
