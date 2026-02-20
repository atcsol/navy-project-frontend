"use client"

import { useEffect, useState, useCallback } from "react"
import {
  opportunitiesApi,
  templatesApi,
  scrapingApi,
  Opportunity,
  Template,
  ScrapingProgress,
  StatusCounts,
  STATUS_LABELS,
} from "@/lib/api"
import ExcelJS from "exceljs"
import { saveAs } from "file-saver"
import { getErrorMessage } from "@/lib/error-utils"
import { useWebSocket } from "@/hooks/useWebSocket"
import { WorkflowStatus } from "@/components/dashboard/StatusTabs"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UseOpportunitiesOptions {
  user: any
}

interface UseOpportunitiesReturn {
  // Data
  opportunities: Opportunity[]
  loading: boolean
  error: string
  setError: (error: string) => void

  // Tabs
  activeTab: WorkflowStatus
  setActiveTab: (tab: WorkflowStatus) => void
  statusCounts: StatusCounts | null

  // Pagination
  page: number
  setPage: (page: number) => void
  totalPages: number
  total: number

  // Filters
  siteFilter: string
  setSiteFilter: (value: string) => void
  searchFilter: string
  setSearchFilter: (value: string) => void
  templateFilter: string
  setTemplateFilter: (value: string) => void
  showExpired: boolean
  setShowExpired: (value: boolean) => void
  quotationPhaseFilter: string
  setQuotationPhaseFilter: (value: string) => void

  // Templates
  templates: Template[]

  // Bulk selection
  selectedIds: string[]
  setSelectedIds: (ids: string[]) => void
  toggleSelect: (id: string) => void
  toggleSelectAll: () => void

  // Actions
  actionLoadingId: string | null
  bulkActionLoading: boolean
  handleTransition: (id: string, toStatus: string) => Promise<void>
  handleQuotationPhaseChange: (id: string, phase: string) => Promise<void>
  handleBulkTransition: (toStatus: string) => Promise<void>

  // Scraping
  scrapingProgress: ScrapingProgress | null
  scrapingLoading: boolean
  scrapingPolling: boolean
  handleStartScraping: (rescrape?: boolean) => Promise<void>
  handleRetryFailed: () => Promise<void>
  handlePauseScraping: () => Promise<void>
  handleResumeScraping: () => Promise<void>
  handleCancelScraping: () => Promise<void>
  handleDrainScraping: () => Promise<void>
  fetchScrapingProgress: () => Promise<ScrapingProgress | null>

  // WebSocket
  wsConnected: boolean
  wsAlertCount: number | undefined

  // Excel export
  handleExportToExcel: () => Promise<void>

  // Refresh
  refreshOpportunities: () => Promise<void>
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useOpportunities({ user }: UseOpportunitiesOptions): UseOpportunitiesReturn {
  // Data
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Tabs
  const [activeTab, setActiveTab] = useState<WorkflowStatus>("nao_analisada")
  const [statusCounts, setStatusCounts] = useState<StatusCounts | null>(null)

  // Pagination
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 20

  // Filters
  const [siteFilter, setSiteFilter] = useState("")
  const [searchFilter, setSearchFilter] = useState("")
  const [templateFilter, setTemplateFilter] = useState("")
  const [showExpired, setShowExpired] = useState(false)
  const [quotationPhaseFilter, setQuotationPhaseFilter] = useState("")

  // Templates for filter dropdown
  const [templates, setTemplates] = useState<Template[]>([])

  // Bulk actions
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkActionLoading, setBulkActionLoading] = useState(false)

  // Per-row action loading
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  // Scraping queue
  const [scrapingProgress, setScrapingProgress] = useState<ScrapingProgress | null>(null)
  const [scrapingLoading, setScrapingLoading] = useState(false)
  const [scrapingPolling, setScrapingPolling] = useState(false)

  // WebSocket
  const [wsAlertCount, setWsAlertCount] = useState<number | undefined>(undefined)

  // ---------------------------------------------------------------------------
  // Fetch templates
  // ---------------------------------------------------------------------------

  const fetchTemplates = useCallback(async () => {
    if (!user) return
    try {
      const response = await templatesApi.list()
      setTemplates(response.data)
    } catch {
      // Non-critical
    }
  }, [user])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  // ---------------------------------------------------------------------------
  // Status counts
  // ---------------------------------------------------------------------------

  const fetchStatusCounts = useCallback(async () => {
    if (!user) return
    try {
      const response = await opportunitiesApi.countsByStatus()
      setStatusCounts(response.data)
    } catch {
      // Non-critical
    }
  }, [user])

  useEffect(() => {
    fetchStatusCounts()
  }, [fetchStatusCounts])

  // ---------------------------------------------------------------------------
  // Scraping progress
  // ---------------------------------------------------------------------------

  const fetchScrapingProgress = useCallback(async (): Promise<ScrapingProgress | null> => {
    if (!user) return null
    try {
      const response = await scrapingApi.progress()
      setScrapingProgress(response.data)
      return response.data
    } catch {
      return null
    }
  }, [user])

  useEffect(() => {
    fetchScrapingProgress().then((data) => {
      if (data && (data.queue.waiting > 0 || data.queue.active > 0 || data.queue.delayed > 0)) {
        setScrapingPolling(true)
      }
    })
  }, [fetchScrapingProgress])

  useEffect(() => {
    if (!scrapingPolling) return
    const interval = setInterval(async () => {
      const data = await fetchScrapingProgress()
      if (data && data.queue.waiting === 0 && data.queue.active === 0 && data.queue.delayed === 0) {
        setScrapingPolling(false)
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [scrapingPolling, fetchScrapingProgress])

  const handleStartScraping = async (rescrape = false) => {
    setScrapingLoading(true)
    try {
      await scrapingApi.enqueue(rescrape)
      setScrapingPolling(true)
      await fetchScrapingProgress()
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Erro ao iniciar scraping"))
    } finally {
      setScrapingLoading(false)
    }
  }

  const handleRetryFailed = async () => {
    setScrapingLoading(true)
    try {
      const response = await scrapingApi.retryFailed()
      if (response.data.enqueued > 0) {
        setScrapingPolling(true)
      }
      await fetchScrapingProgress()
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Erro ao re-tentar scraping"))
    } finally {
      setScrapingLoading(false)
    }
  }

  const handlePauseScraping = async () => {
    setScrapingLoading(true)
    try {
      await scrapingApi.pause()
      await fetchScrapingProgress()
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Erro ao pausar scraping"))
    } finally {
      setScrapingLoading(false)
    }
  }

  const handleResumeScraping = async () => {
    setScrapingLoading(true)
    try {
      await scrapingApi.resume()
      setScrapingPolling(true)
      await fetchScrapingProgress()
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Erro ao retomar scraping"))
    } finally {
      setScrapingLoading(false)
    }
  }

  const handleCancelScraping = async () => {
    setScrapingLoading(true)
    try {
      await scrapingApi.cancel()
      setScrapingPolling(false)
      await fetchScrapingProgress()
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Erro ao cancelar scraping"))
    } finally {
      setScrapingLoading(false)
    }
  }

  const handleDrainScraping = async () => {
    setScrapingLoading(true)
    try {
      await scrapingApi.drain()
      setScrapingPolling(false)
      await fetchScrapingProgress()
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Erro ao limpar fila"))
    } finally {
      setScrapingLoading(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Fetch opportunities
  // ---------------------------------------------------------------------------

  const fetchOpportunities = useCallback(async () => {
    if (!user) return
    try {
      setLoading(true)
      setError("")

      const response = await opportunitiesApi.list({
        page,
        limit,
        status: activeTab,
        site: siteFilter || undefined,
        search: searchFilter || undefined,
        templateId: templateFilter || undefined,
        includeExpired: showExpired ? "true" : undefined,
        quotationPhase: activeTab === "em_cotacao" && quotationPhaseFilter ? quotationPhaseFilter : undefined,
      })

      setOpportunities(response.data.data)
      setTotalPages(response.data.meta.totalPages)
      setTotal(response.data.meta.total)
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Erro ao carregar oportunidades"))
    } finally {
      setLoading(false)
    }
  }, [user, page, activeTab, siteFilter, searchFilter, templateFilter, showExpired, quotationPhaseFilter])

  useEffect(() => {
    fetchOpportunities()
  }, [fetchOpportunities])

  useEffect(() => {
    setPage(1)
    setSelectedIds([])
  }, [activeTab, siteFilter, searchFilter, templateFilter, showExpired, quotationPhaseFilter])

  useEffect(() => {
    if (activeTab !== "em_cotacao") {
      setQuotationPhaseFilter("")
    }
  }, [activeTab])

  // ---------------------------------------------------------------------------
  // Refresh helpers
  // ---------------------------------------------------------------------------

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchOpportunities(), fetchStatusCounts()])
  }, [fetchOpportunities, fetchStatusCounts])

  const refreshOpportunities = useCallback(async () => {
    await refreshAll()
  }, [refreshAll])

  // ---------------------------------------------------------------------------
  // WebSocket
  // ---------------------------------------------------------------------------

  const { connected: wsConnected } = useWebSocket({
    onAlert: () => {
      setWsAlertCount((prev) => (prev ?? 0) + 1)
    },
    onOpportunityUpdate: () => {
      refreshAll()
    },
    onCountsUpdate: (counts) => {
      setStatusCounts(counts as unknown as StatusCounts)
    },
    onCancellation: (data) => {
      setError(`CANCELAMENTO detectado: ${data.solicitationNumber}`)
      setTimeout(() => setError(""), 8000)
    },
  })

  // ---------------------------------------------------------------------------
  // Workflow actions
  // ---------------------------------------------------------------------------

  const handleTransition = async (id: string, toStatus: string) => {
    setActionLoadingId(id)
    try {
      await opportunitiesApi.transitionStatus(id, toStatus)
      await refreshAll()
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Erro ao alterar status"))
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleQuotationPhaseChange = async (id: string, phase: string) => {
    setActionLoadingId(id)
    try {
      await opportunitiesApi.updateQuotationPhase(id, phase)
      await refreshAll()
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Erro ao alterar fase"))
    } finally {
      setActionLoadingId(null)
    }
  }

  // ---------------------------------------------------------------------------
  // Bulk actions
  // ---------------------------------------------------------------------------

  const toggleSelectAll = () => {
    if (selectedIds.length === opportunities.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(opportunities.map((o) => o.id))
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const handleBulkTransition = async (toStatus: string) => {
    if (selectedIds.length === 0) return
    setBulkActionLoading(true)
    try {
      await Promise.all(
        selectedIds.map((id) => opportunitiesApi.transitionStatus(id, toStatus))
      )
      setSelectedIds([])
      await refreshAll()
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Erro ao executar ação em massa"))
    } finally {
      setBulkActionLoading(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Export to Excel
  // ---------------------------------------------------------------------------

  const handleExportToExcel = async () => {
    try {
      const response = await opportunitiesApi.list({
        page: 1,
        limit: 10000,
        status: activeTab,
        site: siteFilter || undefined,
        search: searchFilter || undefined,
        templateId: templateFilter || undefined,
        includeExpired: showExpired ? "true" : undefined,
        quotationPhase: activeTab === "em_cotacao" && quotationPhaseFilter ? quotationPhaseFilter : undefined,
      })

      const allOpportunities = response.data.data
      const workbook = new ExcelJS.Workbook()
      const selectedTemplate = templates.find((t) => t.id === templateFilter)
      const sheetName = selectedTemplate ? selectedTemplate.name : STATUS_LABELS[activeTab] || "Oportunidades"
      const worksheet = workbook.addWorksheet(sheetName.substring(0, 31))

      const columns = [
        { header: "Solicitacao", key: "solicitationNumber", width: 15 },
        { header: "Site", key: "site", width: 12 },
        { header: "Descricao", key: "description", width: 40 },
        { header: "NSN", key: "nsn", width: 15 },
        { header: "Part Number", key: "partNumber", width: 15 },
        { header: "Preco Compra", key: "purchasePrice", width: 12 },
        { header: "Margem %", key: "profitMargin", width: 10 },
        { header: "Preco Ofertado", key: "offeredPrice", width: 12 },
        { header: "Lucro", key: "profitAmount", width: 12 },
        { header: "Data Fechamento", key: "closingDate", width: 15 },
        { header: "Urgencia", key: "urgencyLevel", width: 10 },
        { header: "Status", key: "status", width: 15 },
      ]

      worksheet.columns = columns

      const urgencyLabels: Record<string, string> = {
        critical: "Critica",
        high: "Alta",
        medium: "Media",
        low: "Baixa",
        expired: "Expirada",
      }

      for (const opp of allOpportunities) {
        worksheet.addRow({
          solicitationNumber: opp.solicitationNumber || "-",
          site: opp.site || "-",
          description: opp.description || "-",
          nsn: opp.nsn || "-",
          partNumber: opp.partNumber || "-",
          purchasePrice: opp.purchasePrice || 0,
          profitMargin: opp.profitMargin ? `${opp.profitMargin}%` : "-",
          offeredPrice: opp.offeredPrice || 0,
          profitAmount: opp.profitAmount || 0,
          closingDate: opp.closingDate
            ? new Date(opp.closingDate).toLocaleDateString("pt-BR", { timeZone: "UTC" })
            : "-",
          urgencyLevel: urgencyLabels[opp.urgencyLevel || ""] || "-",
          status: STATUS_LABELS[opp.status] || opp.status,
        })
      }

      worksheet.getRow(1).font = { bold: true }
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE2E8F0" },
      }

      const buffer = await workbook.xlsx.writeBuffer()
      const now = new Date()
      const prefix = selectedTemplate
        ? selectedTemplate.name.replace(/\s+/g, "_")
        : STATUS_LABELS[activeTab]?.replace(/\s+/g, "_") || "oportunidades"
      const filename = `${prefix}_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}.xlsx`

      saveAs(new Blob([buffer]), filename)
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Erro ao exportar para Excel"))
    }
  }

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    // Data
    opportunities,
    loading,
    error,
    setError,

    // Tabs
    activeTab,
    setActiveTab,
    statusCounts,

    // Pagination
    page,
    setPage,
    totalPages,
    total,

    // Filters
    siteFilter,
    setSiteFilter,
    searchFilter,
    setSearchFilter,
    templateFilter,
    setTemplateFilter,
    showExpired,
    setShowExpired,
    quotationPhaseFilter,
    setQuotationPhaseFilter,

    // Templates
    templates,

    // Bulk selection
    selectedIds,
    setSelectedIds,
    toggleSelect,
    toggleSelectAll,

    // Actions
    actionLoadingId,
    bulkActionLoading,
    handleTransition,
    handleQuotationPhaseChange,
    handleBulkTransition,

    // Scraping
    scrapingProgress,
    scrapingLoading,
    scrapingPolling,
    handleStartScraping,
    handleRetryFailed,
    handlePauseScraping,
    handleResumeScraping,
    handleCancelScraping,
    handleDrainScraping,
    fetchScrapingProgress,

    // WebSocket
    wsConnected,
    wsAlertCount,

    // Excel export
    handleExportToExcel,

    // Refresh
    refreshOpportunities,
  }
}
