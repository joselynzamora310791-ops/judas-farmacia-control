export type ClaseABC = "A" | "B" | "C";

export type FilaVentaProducto = {
  producto_id: string | null;
  codigo: string | null;
  nombre: string;
  categoria: string | null;
  cantidad: number;
  ingresos: number;
};

export type FilaABC = FilaVentaProducto & {
  porcentaje: number;
  acumulado: number;
  clase: ClaseABC;
};

/** Límites del análisis ABC (Pareto): A hasta 80% de ingresos, B hasta 95%, C el resto. */
export const LIMITE_A = 80;
export const LIMITE_B = 95;

export function clasificarABC(filas: FilaVentaProducto[]): FilaABC[] {
  const ordenadas = [...filas].filter((f) => f.ingresos > 0).sort((a, b) => b.ingresos - a.ingresos);
  const total = ordenadas.reduce((s, f) => s + f.ingresos, 0);
  if (total <= 0) return [];
  let acumuladoPrevio = 0;
  return ordenadas.map((f) => {
    const porcentaje = (f.ingresos / total) * 100;
    // La clase se decide con el acumulado ANTES del producto: el producto que cruza el 80% sigue siendo A.
    const clase: ClaseABC = acumuladoPrevio < LIMITE_A ? "A" : acumuladoPrevio < LIMITE_B ? "B" : "C";
    acumuladoPrevio += porcentaje;
    return { ...f, porcentaje, acumulado: Math.min(acumuladoPrevio, 100), clase };
  });
}

export function resumenABC(filas: FilaABC[]) {
  const totalIngresos = filas.reduce((s, f) => s + f.ingresos, 0);
  return (["A", "B", "C"] as ClaseABC[]).map((clase) => {
    const grupo = filas.filter((f) => f.clase === clase);
    const ingresos = grupo.reduce((s, f) => s + f.ingresos, 0);
    return {
      clase,
      productos: grupo.length,
      ingresos,
      pctProductos: filas.length ? (grupo.length / filas.length) * 100 : 0,
      pctIngresos: totalIngresos ? (ingresos / totalIngresos) * 100 : 0,
    };
  });
}
