import { diasEntre } from "./format";

export const DIAS_ALERTA_VENCIMIENTO = 30;

export type ProductoAlertable = {
  existencia: number;
  stock_minimo: number;
  fecha_vencimiento: string | null;
};

/** Alerta roja: la existencia llegó o bajó del stock mínimo. */
export function tieneStockBajo(p: ProductoAlertable): boolean {
  return p.existencia <= p.stock_minimo;
}

/** Días que faltan para vencer (negativo si ya venció). null si no tiene fecha. */
export function diasParaVencer(p: ProductoAlertable, hoy: string): number | null {
  if (!p.fecha_vencimiento) return null;
  return diasEntre(hoy, p.fecha_vencimiento);
}

/** Alerta naranja: vence en menos de 30 días (incluye productos ya vencidos). */
export function porVencer(p: ProductoAlertable, hoy: string): boolean {
  const dias = diasParaVencer(p, hoy);
  return dias !== null && dias < DIAS_ALERTA_VENCIMIENTO;
}

export function textoVencimiento(dias: number): string {
  if (dias < 0) return `Vencido hace ${Math.abs(dias)} día${Math.abs(dias) === 1 ? "" : "s"}`;
  if (dias === 0) return "Vence hoy";
  return `Vence en ${dias} día${dias === 1 ? "" : "s"}`;
}
