export type VentaFiltrable = {
  created_at: string; total: number; usuario_id: string | null; demo_lote: string | null;
  venta_detalles: { producto_id: string | null }[];
};
export type FiltrosVentas = { desde: string; hasta: string; mes: string; producto: string; cajero: string; soloDemo: boolean };

export function filtrosInicialesHistorial(): FiltrosVentas {
  return { desde: "", hasta: "", mes: "", producto: "", cajero: "", soloDemo: true };
}

export function fechaVenta(fecha: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Managua", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(fecha));
}

export function filtrarVentas<T extends VentaFiltrable>(ventas: T[], f: FiltrosVentas): T[] {
  return ventas.filter((v) => {
    const fecha = fechaVenta(v.created_at);
    return (!f.desde || fecha >= f.desde) && (!f.hasta || fecha <= f.hasta)
      && (!f.mes || fecha.startsWith(f.mes)) && (!f.cajero || v.usuario_id === f.cajero)
      && (!f.producto || v.venta_detalles.some((d) => d.producto_id === f.producto))
      && (!f.soloDemo || !!v.demo_lote);
  });
}

export function resumenDemo(ventas: VentaFiltrable[]) {
  const meses = new Map<string, { mes: string; cantidad: number; total: number }>();
  for (const venta of ventas.filter((v) => v.demo_lote)) {
    const mes = fechaVenta(venta.created_at).slice(0, 7);
    const fila = meses.get(mes) ?? { mes, cantidad: 0, total: 0 };
    fila.cantidad++;
    fila.total += Number(venta.total);
    meses.set(mes, fila);
  }
  return [...meses.values()].sort((a, b) => a.mes.localeCompare(b.mes));
}