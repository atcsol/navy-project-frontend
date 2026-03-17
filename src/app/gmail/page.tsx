"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuthRedirect } from "@/hooks/useAuthRedirect"
import { gmailApi, syncLogsApi, SyncJobStatus, SyncLog, PaginatedResponse } from "@/lib/api"
import { getErrorMessage } from "@/lib/error-utils"
import SyncProgressPanel from "@/components/SyncProgressPanel"
import { PageShell, PageHeader, ErrorBanner, LoadingCard, EmptyState, Button, Badge, Card } from "@/components/ui"
import {
  Mail,
  Plus,
  CheckCircle2,
  XCircle,
  Calendar,
  Clock,
  RefreshCw,
  Power,
  Trash2,
  ChevronLeft,
  ChevronRight,
  FileText,
} from "lucide-react"

interface GmailAccount {
  id: string
  email: string
  isActive: boolean
  lastSync?: string
  createdAt: string
}

// ============================================================================
// Sync Logs Card
// ============================================================================

function SyncLogsCard() {
  const [logs, setLogs] = useState<SyncLog[]>([])
  const [meta, setMeta] = useState<PaginatedResponse<SyncLog>["meta"] | null>(null)
  const [queueFilter, setQueueFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)

  const loadLogs = useCallback(async (p: number, queue: string, status: string) => {
    setLoading(true)
    try {
      const res = await syncLogsApi.getLogs({
        page: p,
        limit: 30,
        queue: queue || undefined,
        status: status || undefined,
      })
      setLogs(res.data.data)
      setMeta(res.data.meta)
    } catch (err) {
      console.error("Failed to load sync logs:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadLogs(page, queueFilter, statusFilter)
  }, [page, queueFilter, statusFilter, loadLogs])

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatDuration = (ms: number | null) => {
    if (!ms) return "-"
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const queueLabel = (q: string) => {
    switch (q) {
      case "email-sync": return "Email Sync"
      case "opportunity-processing": return "Processamento"
      case "scraping": return "Scraping"
      default: return q
    }
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">Concluído</span>
      case "failed":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">Falhou</span>
      case "skipped":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">Pulado</span>
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">{status}</span>
    }
  }

  const metadata = (log: SyncLog) => {
    if (!log.metadata) return null
    const m = log.metadata as Record<string, unknown>
    const parts: string[] = []
    if (m.emailsFound != null) parts.push(`${m.emailsFound} emails`)
    if (m.emailsEnqueued != null) parts.push(`${m.emailsEnqueued} enfileirados`)
    if (m.templatesMatched != null) parts.push(`${m.templatesMatched} templates`)
    if (m.created != null) parts.push(`${m.created} criadas`)
    if (m.duplicates != null) parts.push(`${m.duplicates} duplicatas`)
    if (m.scrapingJobsEnqueued != null) parts.push(`${m.scrapingJobsEnqueued} scraping`)
    return parts.length > 0 ? parts.join(" · ") : null
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Logs de Sincronização
        </h3>
        <div className="flex items-center gap-2">
          <select
            value={queueFilter}
            onChange={(e) => { setQueueFilter(e.target.value); setPage(1) }}
            className="text-xs border border-gray-300 rounded px-2 py-1.5 text-gray-700 bg-white"
          >
            <option value="">Todas as filas</option>
            <option value="email-sync">Email Sync</option>
            <option value="opportunity-processing">Processamento</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            className="text-xs border border-gray-300 rounded px-2 py-1.5 text-gray-700 bg-white"
          >
            <option value="">Todos os status</option>
            <option value="completed">Concluído</option>
            <option value="failed">Falhou</option>
          </select>
          <button
            onClick={() => loadLogs(page, queueFilter, statusFilter)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {loading && logs.length === 0 ? (
        <div className="animate-pulse space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-8 bg-gray-100 rounded" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">
          Nenhum log de sincronização encontrado. Os logs aparecerão após a próxima sincronização.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase border-b border-gray-100">
                  <th className="pb-2 pr-3">Fila</th>
                  <th className="pb-2 pr-3 w-24">Status</th>
                  <th className="pb-2 pr-3">Detalhes</th>
                  <th className="pb-2 pr-3 w-20">Duração</th>
                  <th className="pb-2 pr-3">Erro</th>
                  <th className="pb-2 w-28">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50">
                    <td className="py-2 pr-3">
                      <span className="text-xs font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                        {queueLabel(log.queue)}
                      </span>
                    </td>
                    <td className="py-2 pr-3">{statusBadge(log.status)}</td>
                    <td className="py-2 pr-3 text-xs text-gray-600 max-w-xs truncate">
                      {metadata(log) || "-"}
                    </td>
                    <td className="py-2 pr-3 text-xs text-gray-500 font-mono">
                      {formatDuration(log.durationMs)}
                    </td>
                    <td className="py-2 pr-3 text-xs text-red-600 max-w-xs truncate" title={log.error || ""}>
                      {log.error ? log.error.substring(0, 60) + (log.error.length > 60 ? "..." : "") : "-"}
                    </td>
                    <td className="py-2 text-xs text-gray-500">{formatDate(log.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
              <span className="text-xs text-gray-500">
                {meta.total} registro(s) · Página {meta.page} de {meta.totalPages}
              </span>
              <div className="flex gap-1">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="p-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage(page + 1)}
                  className="p-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  )
}

// ============================================================================
// Main Page
// ============================================================================

export default function GmailAccountsPage() {
  const { user, authLoading } = useAuthRedirect()
  const router = useRouter()
  const [accounts, setAccounts] = useState<GmailAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [syncingAccountIds, setSyncingAccountIds] = useState<Set<string>>(
    new Set()
  )

  // Sync status tracking
  const [syncJobId, setSyncJobId] = useState<string | null>(null)
  const [syncStatus, setSyncStatus] = useState<SyncJobStatus | null>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchAccounts = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)
      setError("")
      const response = await gmailApi.accounts()
      setAccounts(response.data)
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Erro ao carregar contas Gmail"))
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  // Polling for sync status
  const startPolling = useCallback((jobId: string) => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
    }

    const poll = async () => {
      try {
        const response = await gmailApi.syncStatus(jobId)
        setSyncStatus(response.data)

        const { state, opportunityJobs } = response.data
        const allOppsDone =
          opportunityJobs.length === 0 ||
          opportunityJobs.every(
            (j) =>
              j.state === "completed" ||
              j.state === "failed" ||
              j.state === "not_found"
          )

        const syncDone =
          state === "completed" || state === "failed" || state === "not_found"

        if (syncDone && allOppsDone) {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
          }
          fetchAccounts()
        }
      } catch {
        // Silently ignore polling errors
      }
    }

    poll()
    pollIntervalRef.current = setInterval(poll, 2000)
  }, [fetchAccounts])

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [])

  // Detecta sync iniciado de outra página (ex: Settings)
  useEffect(() => {
    const pendingJobIds = localStorage.getItem("pendingSyncJobIds")
    if (pendingJobIds) {
      localStorage.removeItem("pendingSyncJobIds")
      try {
        const jobIds = JSON.parse(pendingJobIds) as string[]
        if (jobIds.length > 0) {
          setSyncJobId(jobIds[0])
          startPolling(jobIds[0])
        }
      } catch {}
    }
  }, [startPolling])

  const handleConnect = () => {
    gmailApi.connect()
  }

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await gmailApi.toggle(id, !currentStatus)
      setAccounts((prev) =>
        prev.map((acc) =>
          acc.id === id ? { ...acc, isActive: !currentStatus } : acc
        )
      )
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Erro ao atualizar conta"))
    }
  }

  const handleSync = async (accountId: string) => {
    if (syncingAccountIds.has(accountId)) return

    setSyncingAccountIds((prev) => new Set(prev).add(accountId))
    setError("")
    setSyncStatus(null)
    setSyncJobId(null)

    try {
      const response = await gmailApi.sync(accountId)
      const { jobId } = response.data

      setSyncJobId(jobId)
      startPolling(jobId)
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Erro ao iniciar sincronização"))
    } finally {
      setSyncingAccountIds((prev) => {
        const next = new Set(prev)
        next.delete(accountId)
        return next
      })
    }
  }

  const handleCloseSyncPanel = () => {
    setSyncStatus(null)
    setSyncJobId(null)
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja remover esta conta Gmail?")) return

    try {
      await gmailApi.remove(id)
      setAccounts((prev) => prev.filter((acc) => acc.id !== id))
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Erro ao remover conta"))
    }
  }

  return (
    <PageShell
      authLoading={authLoading}
      user={user}
      containerClassName="h-screen flex flex-col bg-slate-50"
      className="flex-1 overflow-y-auto w-full px-4 sm:px-6 lg:px-8 py-8"
    >
      <PageHeader
        title="Contas Gmail Conectadas"
        subtitle="Gerencie as contas Gmail para receber emails de oportunidades"
        action={{ label: "Conectar Nova Conta", icon: Plus, onClick: handleConnect }}
      />

      {/* Sync Progress Panel */}
      {syncStatus && (
        <SyncProgressPanel
          statuses={[syncStatus]}
          onClose={handleCloseSyncPanel}
          onGoToDashboard={() => router.push("/")}
        />
      )}

      <ErrorBanner message={error} onDismiss={() => setError("")} />

      {loading ? (
        <LoadingCard message="Carregando contas..." />
      ) : (
        <>
          {accounts.length === 0 ? (
            <EmptyState
              icon={Mail}
              message="Nenhuma conta Gmail conectada"
              action={{ label: "Conectar Primeira Conta", icon: Plus, onClick: handleConnect }}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {accounts.map((account) => (
                <Card key={account.id} hover padding="md">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {account.email}
                        </h3>
                        <Badge
                          variant={account.isActive ? "success" : "default"}
                          icon={account.isActive ? CheckCircle2 : XCircle}
                        >
                          {account.isActive ? "Ativa" : "Inativa"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          Conectada em:{" "}
                          {new Date(account.createdAt).toLocaleDateString(
                            "pt-BR"
                          )}
                        </div>
                        {account.lastSync && (
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            Última sincronização:{" "}
                            {new Date(account.lastSync).toLocaleString(
                              "pt-BR"
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      {account.isActive && (
                        <Button
                          onClick={() => handleSync(account.id)}
                          disabled={syncingAccountIds.has(account.id) || !!syncJobId}
                          size="sm"
                          loading={syncingAccountIds.has(account.id)}
                          icon={syncingAccountIds.has(account.id) ? undefined : RefreshCw}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                        >
                          {syncingAccountIds.has(account.id)
                            ? "Iniciando..."
                            : "Sincronizar Emails"}
                        </Button>
                      )}
                      <Button
                        variant={account.isActive ? "secondary" : "success"}
                        size="sm"
                        icon={Power}
                        onClick={() =>
                          handleToggleActive(account.id, account.isActive)
                        }
                      >
                        {account.isActive ? "Desativar" : "Ativar"}
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        icon={Trash2}
                        onClick={() => handleDelete(account.id)}
                      >
                        Remover
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Sync Logs */}
          <div className="mt-8">
            <SyncLogsCard />
          </div>
        </>
      )}
    </PageShell>
  )
}
