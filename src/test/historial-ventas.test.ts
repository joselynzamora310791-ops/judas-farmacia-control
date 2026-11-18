import { describe, expect, it } from "vitest";
import { filtrarVentas, resumenDemo } from "@/lib/historial-ventas";
const filtros = { desde: "", hasta: "", mes: "", producto: "", cajero: "", soloDemo: false };
const ventas = Array.from({ length: 30 }, (_, i) => ({
  created_at: `2026-${String(9 + Math.floor(i / 10)).padStart(2, "0")}-${String(1 + i % 10).padStart(2, "0")}T16:00:00Z`,
  total: 10, usuario_id: "cajero", demo_lote: "examen", venta_detalles: [{ producto_id: i % 2 ? "p1" : "p2" }],
}));
describe("Historial del examen", () => {
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