import axios from "axios"

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

const HTTP_MESSAGES: Record<number, string> = {
  400: "Dados inválidos. Verifique os campos e tente novamente.",
  401: "Credenciais inválidas",
  403: "Sem permissão para esta ação",
  404: "Recurso não encontrado",
  409: "Este registro já existe",
  422: "Dados inválidos. Verifique os campos e tente novamente.",
  429: "Muitas requisições. Aguarde um momento.",
  500: "Erro interno do servidor",
  502: "Servidor indisponível. Tente novamente em instantes.",
  503: "Servidor indisponível. Tente novamente em instantes.",
}

/**
 * Traduz erro HTTP para mensagem amigável em PT-BR.
 * Prioriza mensagem do backend, depois fallback por status code.
 */
export function getHttpErrorMessage(err: unknown): string {
  if (!axios.isAxiosError(err)) {
    return getErrorMessage(err)
  }

  // Network error (sem response)
  if (!err.response) {
    if (err.code === "ECONNABORTED") {
      return "Servidor demorou para responder. Tente novamente."
    }
    return "Sem conexão com o servidor. Verifique sua internet."
  }

  // Tenta usar mensagem do backend primeiro
  const backendMsg = err.response.data?.message
  if (backendMsg) {
    return Array.isArray(backendMsg) ? backendMsg.join(", ") : String(backendMsg)
  }

  // Fallback por status code
  return HTTP_MESSAGES[err.response.status] || `Erro ${err.response.status}. Tente novamente.`
}

/**
 * Verifica se é um erro de rede (sem response do servidor).
 */
export function isNetworkError(err: unknown): boolean {
  return axios.isAxiosError(err) && !err.response
}
