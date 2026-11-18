import { describe, expect, it } from "vitest";
import { filtrarVentas, filtrosInicialesHistorial, resumenDemo } from "@/lib/historial-ventas";
const filtros = { desde: "", hasta: "", mes: "", producto: "", cajero: "", soloDemo: false };
const ventas = Array.from({ length: 30 }, (_, i) => ({
  created_at: `2026-${String(9 + Math.floor(i / 10)).padStart(2, "0")}-${String(1 + i % 10).padStart(2, "0")}T16:00:00Z`,
  total: 10, usuario_id: "cajero", demo_lote: "examen", venta_detalles: [{ producto_id: i % 2 ? "p1" : "p2" }],
}));
describe("Historial del examen", () => {
  it("muestra inicialmente las 30 demostraciones y 10 en noviembre sin incluir las dos ventas anteriores", () => {
    const anteriores = [1, 3].map((numero) => ({ created_at: `2026-11-${15 + numero}T16:00:00Z`, total: 2, usuario_id: "cajero", demo_lote: null, venta_detalles: [{ producto_id: "p1" }] }));
    const todas = [...ventas, ...anteriores];
    expect(filtrarVentas(todas, filtrosInicialesHistorial())).toHaveLength(30);
    expect(filtrarVentas(todas, { ...filtrosInicialesHistorial(), mes: "2026-11" })).toHaveLength(10);
    expect(filtrarVentas(todas, { ...filtrosInicialesHistorial(), mes: "2026-11", soloDemo: false })).toHaveLength(12);
    expect(resumenDemo(todas).map((r) => r.cantidad)).toEqual([10, 10, 10]);
    expect(todas).toHaveLength(32);
  });
  it("resume exactamente 30 transacciones, 10 por mes", () => {
    expect(resumenDemo(ventas).map((r) => [r.mes, r.cantidad, r.total])).toEqual([["2026-09", 10, 100], ["2026-10", 10, 100], ["2026-11", 10, 100]]);
  });
  it("consulta por mes", () => { expect(filtrarVentas(ventas, { ...filtros, mes: "2026-10" })).toHaveLength(10); });
  it("consulta por fecha en Managua", () => { expect(filtrarVentas(ventas, { ...filtros, desde: "2026-09-02", hasta: "2026-09-03" })).toHaveLength(2); });
  it("consulta por producto", () => { expect(filtrarVentas(ventas, { ...filtros, producto: "p1" })).toHaveLength(15); });
  it("consulta por cajero", () => { expect(filtrarVentas(ventas, { ...filtros, cajero: "otro" })).toHaveLength(0); });
  it("separa ventas ordinarias de demostraciones", () => {
    expect(filtrarVentas([...ventas, { created_at: "2026-11-18T16:00:00Z", total: 2, usuario_id: "cajero", venta_detalles: [{ producto_id: "p1" }], demo_lote: null }], { ...filtros, soloDemo: true })).toHaveLength(30);
  });
});