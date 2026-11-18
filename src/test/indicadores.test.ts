import { describe, expect, it } from "vitest";
import { calcularTicketPromedio } from "@/lib/indicadores";

describe("Ticket promedio mensual", () => {
  it("calcula 240.50 con 2,405.00 entre 10 transacciones", () => {
    expect(calcularTicketPromedio(2405, 10)).toBe(240.5);
  });
  it("recalcula cuando se agrega una venta al mes", () => {
    expect(calcularTicketPromedio(2405 + 345, 10 + 1)).toBe(250);
  });
  it("devuelve cero cuando no hay transacciones", () => {
    expect(calcularTicketPromedio(0, 0)).toBe(0);
  });
});