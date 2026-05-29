import axios from "axios"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002/api"

export const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
})

// Callback para toast global — setado pelo ToastProvider
let globalToastError: ((msg: string) => void) | null = null
export function setGlobalToastError(fn: ((msg: string) => void) | null) {
  globalToastError = fn
}

let isRefreshing = false
let failedQueue: Array<{
  resolve: (value?: unknown) => void
  reject: (reason?: any) => void
}> = []

const processQueue = (error: any = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve()
    }
  })
  failedQueue = []
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token")
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => {
    // Unwrap resposta padronizada { success, data, timestamp }
    if (response.data && typeof response.data === "object" && "success" in response.data && "data" in response.data) {
      response.data = response.data.data
    }
    return response
  },
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then(() => {
            const token = localStorage.getItem("token")
            originalRequest.headers.Authorization = `Bearer ${token}`
            return api(originalRequest)
          })
          .catch((err) => {
            return Promise.reject(err)
          })
      }

      originalRequest._retry = true
      isRefreshing = true

      const refreshToken = localStorage.getItem("refreshToken")

      if (!refreshToken) {
        localStorage.removeItem("token")
        localStorage.removeItem("refreshToken")
        localStorage.removeItem("user")
        window.location.href = "/login"
        return Promise.reject(error)
      }

      try {
        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken,
        })

        // Backend retorna { success, data: { accessToken, refreshToken, user }, timestamp }
        const responseData = response.data?.data ?? response.data
        const { accessToken, refreshToken: newRefreshToken } = responseData

        localStorage.setItem("token", accessToken)
        localStorage.setItem("refreshToken", newRefreshToken)

        originalRequest.headers.Authorization = `Bearer ${accessToken}`

        processQueue()
        isRefreshing = false

        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError)
        isRefreshing = false

        localStorage.removeItem("token")
        localStorage.removeItem("refreshToken")
        localStorage.removeItem("user")
        window.location.href = "/login"

        return Promise.reject(refreshError)
      }
    }

    // Toast global para erros de rede, timeout, 500, 403
    if (globalToastError) {
      if (!error.response) {
        // Network error ou timeout
        if (error.code === "ECONNABORTED") {
          globalToastError("Servidor demorou para responder. Tente novamente.")
        } else {
          globalToastError("Sem conexão com o servidor. Verifique sua internet.")
        }
      } else if (error.response.status === 500) {
        globalToastError("Erro interno do servidor. Tente novamente.")
      } else if (error.response.status === 403) {
        globalToastError("Sem permissão para esta ação.")
      }
    }

    return Promise.reject(error)
  }
)

// Tipos
export interface User {
  id: string
  email: string
  name: string
  roles: string[]
  permissions: string[]
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  user: User
}

export interface Opportunity {
  id: string
  solicitationNumber: string | null
  site: string | null
  description: string | null
  nsn: string | null
  partNumber: string | null
  manufacturer: string | null
  condition: string | null
  unit: string | null
  closingDate: string | null
  postedDate: string | null
  sourceUrl: string | null
  status: string
  purchasePrice: number | null
  profitMargin: number | null
  offeredPrice: number | null
  profitAmount: number | null
  wonPrice: number | null
  daysUntilClosing: number | null
  urgencyLevel: string | null
  isViewed: boolean
  createdAt: string
  quantity: number | null
  contactName: string | null
  contactEmail: string | null
  contactPhone: string | null
  link: string | null
  notes: string | null
  // Workflow fields
  quotationPhase: string | null
  purchaseStatus: string | null
  supplierName: string | null
  supplierContact: string | null
  purchaseOrderNo: string | null
  purchaseDate: string | null
  expectedDelivery: string | null
  actualDelivery: string | null
  deliveryOnTime: boolean | null
  bidSubmittedAt: string | null
  bidPrice: number | null
  bidResultAt: string | null
  bidNotes: string | null
  cancelledAt: string | null
  cancellationSource: string | null
  statusHistory: any[] | null
  scrapingStatus: string | null
  scrapingError: string | null
  scrapedAt: string | null
  extractedData: Record<string, any> | null
  scrapedData: Record<string, any> | null
  parentOpportunityId: string | null
  childrenCount: number
  template?: { id: string; name: string } | null
  gmailAccount?: { id: string; email: string } | null
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface StatusCounts {
  nao_analisada: number
  analisada: number
  em_cotacao: number
  lancada_bid: number
  vencedora_bid: number
  nao_vencedora: number
  cancelada: number
  descartada: number
  expirada: number
}

export interface Alert {
  id: string
  userId: string
  opportunityId: string
  type: string
  title: string
  message: string
  metadata: any
  isRead: boolean
  createdAt: string
  opportunity?: {
    id: string
    solicitationNumber: string | null
    status: string
  }
}

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    api.post<AuthResponse>("/auth/login", { email, password }),

  register: (name: string, email: string, password: string) =>
    api.post<AuthResponse>("/auth/register", { name, email, password }),

  me: () => api.get<User>("/auth/me"),
}

// Opportunities API
export const opportunitiesApi = {
  list: (params?: {
    page?: number
    limit?: number
    status?: string
    site?: string
    templateId?: string
    search?: string
    closingBefore?: string
    closingAfter?: string
    includeExpired?: string
    quotationPhase?: string
    purchaseStatus?: string
  }) => api.get<PaginatedResponse<Opportunity>>("/opportunities", { params }),

  // Export: traz TODAS as oportunidades dos filtros (sem o teto de 100 da listagem)
  export: (params?: {
    status?: string
    site?: string
    templateId?: string
    search?: string
    closingBefore?: string
    closingAfter?: string
    includeExpired?: string
    quotationPhase?: string
    purchaseStatus?: string
  }) =>
    api.get<{
      data: Opportunity[]
      meta: { total: number; returned: number; capped: boolean; maxRows: number }
    }>("/opportunities/export", { params }),

  get: (id: string) => api.get<Opportunity>(`/opportunities/${id}`),

  getChildren: (id: string) => api.get<Opportunity[]>(`/opportunities/${id}/children`),

  update: (id: string, data: Partial<Opportunity>) =>
    api.patch<Opportunity>(`/opportunities/${id}`, data),

  delete: (id: string) => api.delete(`/opportunities/${id}`),

  restore: (id: string) => api.post(`/opportunities/${id}/restore`),

  countsByStatus: () =>
    api.get<StatusCounts>("/opportunities/counts-by-status"),

  // Workflow endpoints
  transitionStatus: (id: string, toStatus: string, reason?: string) =>
    api.patch(`/opportunities/${id}/status`, { toStatus, reason }),

  updateQuotationPhase: (id: string, phase: string) =>
    api.patch(`/opportunities/${id}/quotation-phase`, { phase }),

  updateBid: (id: string, data: { bidPrice?: number; bidSubmittedAt?: string; bidNotes?: string }) =>
    api.patch(`/opportunities/${id}/bid`, data),

  updateBidResult: (id: string, data: { result: string; bidResultAt?: string; wonPrice?: number; bidNotes?: string }) =>
    api.patch(`/opportunities/${id}/bid-result`, data),

  updatePurchase: (id: string, data: {
    supplierName?: string; supplierContact?: string; purchaseOrderNo?: string;
    purchasePrice?: number; purchaseDate?: string; expectedDelivery?: string;
    purchaseStatus?: string;
  }) => api.patch(`/opportunities/${id}/purchase`, data),

  updateDelivery: (id: string, data: { actualDelivery?: string; deliveryOnTime?: boolean }) =>
    api.patch(`/opportunities/${id}/delivery`, data),
}

// Templates API
export interface Template {
  id: string
  name: string
  description?: string
  senderEmail: string
  subjectFilter?: string
  extractionConfig: any
  outputSchema: any
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export const templatesApi = {
  list: () => api.get<Template[]>("/templates"),
  get: (id: string) => api.get<Template>(`/templates/${id}`),
  create: (data: Partial<Template>) => api.post<Template>("/templates", data),
  update: (id: string, data: Partial<Template>) =>
    api.patch<Template>(`/templates/${id}`, data),
  toggle: (id: string, isActive: boolean) =>
    api.patch<Template>(`/templates/${id}`, { isActive }),
  delete: (id: string) => api.delete(`/templates/${id}`),
  sync: (templateId: string) =>
    api.post<{ jobIds: string[]; templateName: string }>(
      `/templates/${templateId}/sync`
    ),
}

// Gmail API
export interface SyncJobStatus {
  jobId: string
  state: string
  progress: {
    step: string
    templatesTotal: number
    templatesProcessed: number
    currentTemplate: string | null
    emailsFound: number
    emailsEnqueued: number
    opportunityJobIds: string[]
    errors: string[]
  } | null
  result: {
    success: boolean
    templatesMatched: number
    emailsFound: number
    jobsEnqueued: number
    errors: string[]
  } | null
  failedReason: string | null
  opportunityJobs: Array<{
    jobId: string
    state: string
    result: {
      created: number
      updated: number
      duplicates: number
      errors: number
    } | null
  }>
}

export const gmailApi = {
  accounts: () => api.get("/gmail/accounts"),
  toggle: (id: string, isActive: boolean) =>
    api.patch(`/gmail/accounts/${id}`, { isActive }),
  remove: (id: string) => api.delete(`/gmail/accounts/${id}`),
  sync: (accountId: string) =>
    api.post<{ jobId: string; gmailAccountId: string }>(
      `/gmail/accounts/${accountId}/sync`
    ),
  syncStatus: (jobId: string) =>
    api.get<SyncJobStatus>(`/gmail/sync-status/${jobId}`),
  connect: () => {
    const token = localStorage.getItem("token")
    if (!token) {
      window.location.href = "/login"
      return
    }
    window.location.href = `${API_URL}/gmail/auth?token=${token}`
  },
}

// Alerts API
export const alertsApi = {
  list: (params?: { page?: number; limit?: number; unreadOnly?: string; type?: string }) =>
    api.get<PaginatedResponse<Alert>>("/alerts", { params }),
  unreadCount: () =>
    api.get<{ count: number }>("/alerts/unread-count"),
  markAsRead: (id: string) =>
    api.patch(`/alerts/${id}/read`),
  markAllAsRead: () =>
    api.post("/alerts/mark-all-read"),
}

// Roles API
export interface Role {
  id: string
  name: string
  guardName: string
  isSystem: boolean
  rolePermissions: Array<{
    roleId: string
    permissionId: string
    permission: Permission
  }>
  _count: { userRoles: number }
  createdAt: string
  updatedAt: string
}

export interface Permission {
  id: string
  name: string
  guardName: string
}

export interface UserWithRoles {
  id: string
  email: string
  name: string
  roles: string[]
  directPermissions: string[]
  createdAt: string
  updatedAt: string
}

export const rolesApi = {
  list: () => api.get<Role[]>("/roles"),
  get: (id: string) => api.get<Role>(`/roles/${id}`),
  create: (data: { name: string; permissions?: string[] }) =>
    api.post<Role>("/roles", data),
  update: (id: string, data: { name?: string; permissions?: string[] }) =>
    api.patch<Role>(`/roles/${id}`, data),
  delete: (id: string) => api.delete(`/roles/${id}`),
  permissions: () => api.get<Permission[]>("/roles/permissions"),
  syncPermissions: (id: string, permissions: string[]) =>
    api.post(`/roles/${id}/permissions`, { permissions }),
}

// Email Sync Settings
export interface EmailSyncSettings {
  id: string
  autoSyncEnabled: boolean
  syncIntervalMinutes: number
  lastAutoSync: string | null
}

export const emailSyncApi = {
  getSettings: () =>
    api.get<EmailSyncSettings>("/email-sync/settings"),
  updateSettings: (data: Partial<EmailSyncSettings>) =>
    api.put<EmailSyncSettings>("/email-sync/settings", data),
}

// Sync Log types
export interface SyncLog {
  id: string
  queue: string
  jobId: string | null
  status: string
  gmailAccountId: string | null
  templateId: string | null
  durationMs: number | null
  error: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
}

export const syncLogsApi = {
  getLogs: (params?: { queue?: string; status?: string; page?: number; limit?: number }) =>
    api.get<PaginatedResponse<SyncLog>>("/queues/sync/logs", { params }),
}

// Scraping Settings & Domain types
export interface ScrapingSettings {
  id: string
  minDelayMs: number
  maxDelayMs: number
  globalTimeoutMs: number
  maxRetries: number
  retryDelayMs: number
  autoScrapeOnSync: boolean
}

export interface DomainConfig {
  id: string
  domain: string
  enabled: boolean
  requiresAuth: boolean
  reason: string | null
  timeoutMs: number
  customHeaders: Record<string, string> | null
}

// Scraping / Queue API
export interface ScrapingProgress {
  total: number
  expired: number
  success: number
  pending: number
  failed: number
  blocked: number
  timeout: number
  necoError: number
  isPaused?: boolean
  queue: {
    waiting: number
    active: number
    completed: number
    failed: number
    delayed: number
  }
}

export interface ScrapingLog {
  id: string
  solicitationNumber: string | null
  sourceUrl: string | null
  scrapingStatus: string | null
  scrapingError: string | null
  scrapedAt: string | null
}

export const scrapingApi = {
  // Settings
  getSettings: () =>
    api.get<ScrapingSettings>("/scraping/settings"),
  updateSettings: (data: Partial<ScrapingSettings>) =>
    api.put<ScrapingSettings>("/scraping/settings", data),

  // Domain configs
  getDomains: () =>
    api.get<DomainConfig[]>("/scraping/domains"),
  upsertDomain: (data: { domain: string; enabled: boolean; requiresAuth?: boolean; reason?: string; timeoutMs?: number }) =>
    api.put<DomainConfig>("/scraping/domains", data),
  deleteDomain: (id: string) =>
    api.delete(`/scraping/domains/${id}`),

  // Queue controls
  enqueue: (rescrape?: boolean) =>
    api.post<{ enqueued: number; totalPending: number }>(
      "/queues/scraping/enqueue",
      { rescrape: rescrape || false }
    ),
  retryFailed: () =>
    api.post<{ enqueued: number; byStatus: Record<string, number> }>(
      "/queues/scraping/retry-failed"
    ),
  progress: () =>
    api.get<ScrapingProgress>("/queues/scraping/progress"),
  scrapeOne: (opportunityId: string) =>
    api.post(`/scraping/opportunities/${opportunityId}`),
  statistics: () =>
    api.get("/scraping/statistics"),
  pause: () =>
    api.post<{ paused: boolean }>("/queues/scraping/pause"),
  resume: () =>
    api.post<{ resumed: boolean }>("/queues/scraping/resume"),
  drain: () =>
    api.post<{ drained: boolean; removed: number }>("/queues/scraping/drain"),
  cancel: () =>
    api.post<{ cancelled: boolean; removed: number; resetInDb: number }>("/queues/scraping/cancel"),
  getLogs: (params?: { status?: string; page?: number; limit?: number }) =>
    api.get<PaginatedResponse<ScrapingLog>>("/queues/scraping/logs", { params }),
  reprocess: (params?: { onlyFailed?: boolean; limit?: number }) =>
    api.post<{
      processed: number
      enriched: number
      errors: number
      childrenCreated: number
      results: Array<{ id: string; totalLineItems: number; success: boolean; error?: string }>
    }>("/scraping/reprocess", {}, {
      params: {
        onlyFailed: params?.onlyFailed ? "true" : undefined,
        limit: params?.limit || undefined,
      },
      timeout: 300000, // 5 min — pode processar milhares de registros
    }),
}

export const usersApi = {
  list: () => api.get<User[]>("/users"),
  get: (id: string) => api.get<User>(`/users/${id}`),
  create: (data: { name: string; email: string; password: string }) =>
    api.post<User>("/users", data),
  update: (id: string, data: { name?: string; email?: string; password?: string }) =>
    api.patch<User>(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
  getRoles: (id: string) => api.get<UserWithRoles>(`/users/${id}/roles`),
  assignRoles: (id: string, roles: string[]) =>
    api.post<UserWithRoles>(`/users/${id}/roles`, { roles }),
}

// Status labels
export const STATUS_LABELS: Record<string, string> = {
  nao_analisada: "Nao Analisadas",
  analisada: "Analisadas",
  em_cotacao: "Em Cotacao",
  lancada_bid: "Lancada no BID",
  vencedora_bid: "Vencedoras",
  nao_vencedora: "Nao Vencedoras",
  cancelada: "Canceladas",
  descartada: "Descartadas",
}

export const STATUS_COLORS: Record<string, string> = {
  nao_analisada: "bg-purple-50 text-purple-700 border-purple-200",
  analisada: "bg-blue-50 text-blue-700 border-blue-200",
  em_cotacao: "bg-yellow-50 text-yellow-700 border-yellow-200",
  lancada_bid: "bg-orange-50 text-orange-700 border-orange-200",
  vencedora_bid: "bg-green-50 text-green-700 border-green-200",
  nao_vencedora: "bg-red-50 text-red-700 border-red-200",
  cancelada: "bg-gray-100 text-gray-600 border-gray-300",
  descartada: "bg-gray-50 text-gray-500 border-gray-200",
}

export const QUOTATION_PHASE_LABELS: Record<string, string> = {
  enviada: "Enviada",
  recebida: "Recebida",
  em_negociacao: "Em Negociacao",
  finalizada: "Finalizada",
}

export const PURCHASE_STATUS_LABELS: Record<string, string> = {
  pendente: "Pendente",
  comprada: "Comprada",
  entregue: "Entregue",
}

// =====================================================================
// SUPPLIERS
// =====================================================================

export interface Supplier {
  id: string
  name: string
  email: string
  phone: string | null
  contactName: string | null
  street: string | null
  city: string | null
  state: string | null
  zipCode: string | null
  country: string
  tags: string[]
  notes: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export const suppliersApi = {
  list: (params?: { search?: string; tags?: string; isActive?: string }) =>
    api.get<Supplier[]>("/suppliers", { params }),
  get: (id: string) => api.get<Supplier>(`/suppliers/${id}`),
  create: (data: Partial<Supplier>) => api.post<Supplier>("/suppliers", data),
  update: (id: string, data: Partial<Supplier>) =>
    api.patch<Supplier>(`/suppliers/${id}`, data),
  delete: (id: string) => api.delete(`/suppliers/${id}`),
}

// =====================================================================
// RFQ (Cotações)
// =====================================================================

export interface RfqItem {
  id: string
  rfqId: string
  supplierId: string
  emailMessageId: string | null
  emailThreadId: string | null
  sentAt: string | null
  status: string
  quotedPrice: number | null
  quotedDeliveryDays: number | null
  quotedCondition: string | null
  quotedNotes: string | null
  respondedAt: string | null
  quotedAt: string | null
  isSelected: boolean
  supplier: Supplier
  createdAt: string
  updatedAt: string
}

export interface Rfq {
  id: string
  userId: string
  gmailAccountId: string
  opportunityId: string | null
  title: string
  referenceNumber: string | null
  emailSubject: string
  emailBody: string
  opportunityData: any
  status: string
  sentAt: string | null
  deadline: string | null
  notes: string | null
  items: RfqItem[]
  opportunity: {
    id: string
    solicitationNumber: string | null
    site: string | null
    description: string | null
  } | null
  gmailAccount?: { id: string; email: string }
  createdAt: string
  updatedAt: string
}

export interface RfqEmailTemplate {
  id: string
  userId: string
  name: string
  subject: string
  body: string
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export const rfqsApi = {
  list: (params?: { status?: string; opportunityId?: string; search?: string }) =>
    api.get<Rfq[]>("/rfqs", { params }),
  get: (id: string) => api.get<Rfq>(`/rfqs/${id}`),
  create: (data: {
    gmailAccountId: string
    opportunityId?: string
    title: string
    emailSubject: string
    emailBody: string
    supplierIds: string[]
    opportunityData?: any
    deadline?: string
    notes?: string
  }) => api.post<Rfq>("/rfqs", data),
  send: (id: string) =>
    api.post<{ rfqId: string; totalSent: number; totalFailed: number; results: any[] }>(
      `/rfqs/${id}/send`
    ),
  updateItem: (rfqId: string, itemId: string, data: {
    quotedPrice?: number
    quotedDeliveryDays?: number
    quotedCondition?: string
    quotedNotes?: string
    isSelected?: boolean
  }) => api.patch<RfqItem>(`/rfqs/${rfqId}/items/${itemId}`, data),
  finalize: (id: string) => api.post(`/rfqs/${id}/finalize`),
  cancel: (id: string) => api.post(`/rfqs/${id}/cancel`),

  // Email Templates
  emailTemplates: {
    list: () => api.get<RfqEmailTemplate[]>("/rfqs/email-templates"),
    create: (data: { name: string; subject: string; body: string; isDefault?: boolean }) =>
      api.post<RfqEmailTemplate>("/rfqs/email-templates", data),
    update: (id: string, data: { name?: string; subject?: string; body?: string; isDefault?: boolean }) =>
      api.patch<RfqEmailTemplate>(`/rfqs/email-templates/${id}`, data),
    delete: (id: string) => api.delete(`/rfqs/email-templates/${id}`),
  },
}

export const RFQ_STATUS_LABELS: Record<string, string> = {
  rascunho: "Rascunho",
  enviada: "Enviada",
  parcialmente_respondida: "Parc. Respondida",
  respondida: "Respondida",
  finalizada: "Finalizada",
  cancelada: "Cancelada",
}

export const RFQ_STATUS_COLORS: Record<string, string> = {
  rascunho: "bg-gray-50 text-gray-700 border-gray-200",
  enviada: "bg-blue-50 text-blue-700 border-blue-200",
  parcialmente_respondida: "bg-yellow-50 text-yellow-700 border-yellow-200",
  respondida: "bg-green-50 text-green-700 border-green-200",
  finalizada: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelada: "bg-red-50 text-red-700 border-red-200",
}

export const RFQ_ITEM_STATUS_LABELS: Record<string, string> = {
  pendente: "Pendente",
  enviado: "Enviado",
  resposta_recebida: "Resposta Recebida",
  cotado: "Cotado",
  sem_resposta: "Sem Resposta",
  erro_envio: "Erro no Envio",
}

export const RFQ_ITEM_STATUS_COLORS: Record<string, string> = {
  pendente: "bg-gray-50 text-gray-700 border-gray-200",
  enviado: "bg-blue-50 text-blue-700 border-blue-200",
  resposta_recebida: "bg-yellow-50 text-yellow-700 border-yellow-200",
  cotado: "bg-green-50 text-green-700 border-green-200",
  sem_resposta: "bg-orange-50 text-orange-700 border-orange-200",
  erro_envio: "bg-red-50 text-red-700 border-red-200",
}
