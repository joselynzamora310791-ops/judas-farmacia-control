export function calcularTicketPromedio(totalMes: number, transaccionesMes: number): number {
  return transaccionesMes > 0 ? totalMes / transaccionesMes : 0;
}