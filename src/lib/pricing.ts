/**
 * Calcula o preço oferecido com base no preço de compra e margem de lucro
 */
export function calculateOfferedPrice(
  purchasePrice: number,
  profitMargin: number
): { offeredPrice: number; profitAmount: number } {
  const offeredPrice = purchasePrice * (1 + profitMargin / 100)
  const profitAmount = offeredPrice - purchasePrice
  return {
    offeredPrice: Math.round(offeredPrice * 100) / 100,
    profitAmount: Math.round(profitAmount * 100) / 100,
  }
}

/**
 * Formata valor em dólares
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "-"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value)
}

/**
 * Formata data para exibição
 */
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-"
  return new Date(dateStr).toLocaleDateString("pt-BR", { timeZone: "UTC" })
}
