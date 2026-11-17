import { describe, expect, it } from "vitest";
import { puedeAcceder, puedeEditarProductos, puedeEliminarUsuario, rutaInicio } from "@/lib/permisos";
import { porVencer, tieneStockBajo } from "@/lib/inventario";
import { clasificarABC } from "@/lib/abc";
import { formatCordobas } from "@/lib/format";

describe("Roles", () => {
  it("el gerente no elimina su propia cuenta activa", () => {
    expect(puedeEliminarUsuario("gerente", "gerente-activo", "gerente-activo")).toBe(false);
    expect(puedeEliminarUsuario("gerente", "gerente-activo", "otro-usuario")).toBe(true);
  });
  it("el cajero no elimina usuarios", () => {
    expect(puedeEliminarUsuario("cajero", "cajero", "otro-usuario")).toBe(false);
  });
  it("el cajero no accede al dashboard", () => {
    expect(puedeAcceder("cajero", "dashboard")).toBe(false);
  });
  it("el cajero puede consultar productos y registrar ventas", () => {
    expect(puedeAcceder("cajero", "productos")).toBe(true);
    expect(puedeAcceder("cajero", "ventas")).toBe(true);
  });
  it("el cajero no puede modificar precios", () => {
    expect(puedeEditarProductos("cajero")).toBe(false);
    expect(puedeEditarProductos("gerente")).toBe(true);
  });
  it("el gerente accede a los 8 módulos", () => {
    const modulos = ["dashboard", "productos", "categorias", "clientes", "ventas", "reportes", "analisis-abc", "usuarios"] as const;
    expect(modulos.every((m) => puedeAcceder("gerente", m))).toBe(true);
  });
  it("sin rol no hay acceso y el cajero inicia en ventas", () => {
    expect(puedeAcceder(null, "productos")).toBe(false);
    expect(rutaInicio("cajero")).toBe("/ventas");
    expect(rutaInicio("gerente")).toBe("/dashboard");
  });
});

describe("Alertas de inventario", () => {
  const hoy = "2026-11-17";
  it("alerta roja cuando la existencia llega al stock mínimo", () => {
    expect(tieneStockBajo({ existencia: 5, stock_minimo: 5, fecha_vencimiento: null })).toBe(true);
    expect(tieneStockBajo({ existencia: 6, stock_minimo: 5, fecha_vencimiento: null })).toBe(false);
  });
  it("alerta naranja cuando vence en menos de 30 días", () => {
    expect(porVencer({ existencia: 10, stock_minimo: 1, fecha_vencimiento: "2026-12-16" }, hoy)).toBe(true); // 29 días
    expect(porVencer({ existencia: 10, stock_minimo: 1, fecha_vencimiento: "2026-12-17" }, hoy)).toBe(false); // 30 días
  });
});

describe("Análisis ABC", () => {
  it("clasifica A hasta 80% de ingresos, B hasta 95% y C el resto", () => {
    const base = { producto_id: null, codigo: null, categoria: null, cantidad: 1 };
    const filas = clasificarABC([
      { ...base, nombre: "p1", ingresos: 700 },
      { ...base, nombre: "p2", ingresos: 150 },
      { ...base, nombre: "p3", ingresos: 100 },
      { ...base, nombre: "p4", ingresos: 50 },
    ]);
    expect(filas.map((f) => f.clase)).toEqual(["A", "A", "B", "C"]);
  });
});

describe("Moneda", () => {
  it("muestra precios en córdobas", () => {
    expect(formatCordobas(1234.5)).toBe("C$ 1,234.50");
  });
});
