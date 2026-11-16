const numero = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const entero = new Intl.NumberFormat("en-US");

/** Formatea un monto en córdobas nicaragüenses: C$ 1,234.50 */
export function formatCordobas(valor: number | string | null | undefined): string {
  const n = Number(valor ?? 0);
  return `C$ ${numero.format(Number.isFinite(n) ? n : 0)}`;
}

export function formatEntero(valor: number | string | null | undefined): string {
  return entero.format(Number(valor ?? 0));
}

export function formatPorcentaje(valor: number, decimales = 1): string {
  return `${valor.toFixed(decimales)}%`;
}

export const ZONA_HORARIA = "America/Managua";

/** Fecha de hoy en Managua como YYYY-MM-DD */
export function hoyManagua(base: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_HORARIA }).format(base);
}

export function sumarDias(fechaISO: string, dias: number): string {
  const d = new Date(`${fechaISO}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

export function inicioDeMes(fechaISO: string): string {
  return `${fechaISO.slice(0, 7)}-01`;
}

/** Días entre dos fechas YYYY-MM-DD (b - a) */
export function diasEntre(a: string, b: string): number {
  const ms = new Date(`${b}T12:00:00Z`).getTime() - new Date(`${a}T12:00:00Z`).getTime();
  return Math.round(ms / 86_400_000);
}

export function formatFecha(fechaISO: string | null | undefined): string {
  if (!fechaISO) return "—";
  const d = new Date(`${fechaISO.slice(0, 10)}T12:00:00Z`);
  return new Intl.DateTimeFormat("es-NI", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(d);
}

export function formatFechaHora(ts: string | null | undefined): string {
  if (!ts) return "—";
  return new Intl.DateTimeFormat("es-NI", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: ZONA_HORARIA,
  }).format(new Date(ts));
}

export function formatDiaCorto(fechaISO: string): string {
  const d = new Date(`${fechaISO}T12:00:00Z`);
  return new Intl.DateTimeFormat("es-NI", { day: "2-digit", month: "short", timeZone: "UTC" }).format(d);
}

export function descargarCSV(nombreArchivo: string, filas: (string | number | null | undefined)[][]) {
  const contenido = filas
    .map((fila) =>
      fila
        .map((celda) => {
          const s = String(celda ?? "");
          return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(","),
    )
    .join("\n");
  const blob = new Blob(["\ufeff" + contenido], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  a.click();
  URL.revokeObjectURL(url);
}
