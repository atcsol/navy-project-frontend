/**
 * Extrai mensagem de erro de qualquer tipo de exceção.
 * Substitui o padrão repetitivo `catch (err: any) { err.response?.data?.message || ... }`
 */
export function getErrorMessage(err: unknown, fallback = "Ocorreu um erro"): string {
  if (err instanceof Error) {
    // Axios error
    const axiosErr = err as any
    if (axiosErr.response?.data?.message) {
      const msg = axiosErr.response.data.message
      return Array.isArray(msg) ? msg.join(", ") : String(msg)
    }
    return err.message
  }
  if (typeof err === "string") {
    return err
  }
  return fallback
}
