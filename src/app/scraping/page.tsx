"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useAuth } from "@/contexts/AuthContext"
import {
  scrapingApi,
  ScrapingSettings,
  DomainConfig,
  ScrapingProgress,
  ScrapingLog,
  PaginatedResponse,
} from "@/lib/api"
import {
  Button,
  Card,
  Input,
  Toggle,
  PageHeader,
  PageShell,
} from "@/components/ui"
import ScrapingPanel from "@/components/dashboard/ScrapingPanel"
import {
  Save,
  Plus,
  Trash2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Database,
} from "lucide-react"

// ============================================================================
// Settings Card
// ============================================================================

function SettingsCard({
  settings,
  onSave,
  saving,
}: {
  settings: ScrapingSettings
  onSave: (data: Partial<ScrapingSettings>) => void
  saving: boolean
}) {
  const [form, setForm] = useState({
    minDelayMs: settings.minDelayMs,
    maxDelayMs: settings.maxDelayMs,
    globalTimeoutMs: settings.globalTimeoutMs,
    maxRetries: settings.maxRetries,
    retryDelayMs: settings.retryDelayMs,
    autoScrapeOnSync: settings.autoScrapeOnSync,
  })

  useEffect(() => {
    setForm({
      minDelayMs: settings.minDelayMs,
      maxDelayMs: settings.maxDelayMs,
      globalTimeoutMs: settings.globalTimeoutMs,
      maxRetries: settings.maxRetries,
      retryDelayMs: settings.retryDelayMs,
      autoScrapeOnSync: settings.autoScrapeOnSync,
    })
  }, [settings])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(form)
  }

  return (
    <Card>
      <h3 className="text-base font-semibold text-gray-900 mb-4">
        Configuracoes Gerais
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
        {/* Delay entre requests */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Delay entre requests (segundos)
          </label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={(form.minDelayMs / 1000).toFixed(1)}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  minDelayMs: Math.round(parseFloat(e.target.value || "0") * 1000),
                }))
              }
              min={1}
              max={60}
              step={0.5}
              className="w-24"
            />
            <span className="text-sm text-gray-500">a</span>
            <Input
              type="number"
              value={(form.maxDelayMs / 1000).toFixed(1)}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  maxDelayMs: Math.round(parseFloat(e.target.value || "0") * 1000),
                }))
              }
              min={1}
              max={60}
              step={0.5}
              className="w-24"
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Delay aleatorio entre requests para evitar bloqueio de IP
          </p>
        </div>

        {/* Timeout + Retries em grid */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Timeout (segundos)
            </label>
            <Input
              type="number"
              value={(form.globalTimeoutMs / 1000).toFixed(0)}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  globalTimeoutMs: Math.round(parseFloat(e.target.value || "0") * 1000),
                }))
              }
              min={5}
              max={120}
              step={5}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Retries
            </label>
            <Input
              type="number"
              value={form.maxRetries}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  maxRetries: parseInt(e.target.value || "1", 10),
                }))
              }
              min={1}
              max={10}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Delay retry (s)
            </label>
            <Input
              type="number"
              value={(form.retryDelayMs / 1000).toFixed(1)}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  retryDelayMs: Math.round(parseFloat(e.target.value || "0") * 1000),
                }))
              }
              min={0.5}
              max={30}
              step={0.5}
              className="w-full"
            />
          </div>
        </div>

        {/* Auto-scraping toggle */}
        <div className="pt-2 border-t border-gray-100">
          <Toggle
            checked={form.autoScrapeOnSync}
            onChange={(checked) =>
              setForm((f) => ({ ...f, autoScrapeOnSync: checked }))
            }
            label="Auto-scraping apos sync de email"
          />
          <p className="mt-1 text-xs text-gray-500 ml-11">
            Enfileira scraping automaticamente para novas oportunidades com sourceUrl
          </p>
        </div>

        <div className="pt-2">
          <Button type="submit" icon={Save} loading={saving}>
            Salvar Configuracoes
          </Button>
        </div>
      </form>
    </Card>
  )
}

// ============================================================================
// Domains Card
// ============================================================================

function DomainsCard({
  domains,
  onUpsert,
  onDelete,
  onRefresh,
  loading,
}: {
  domains: DomainConfig[]
  onUpsert: (data: { domain: string; enabled: boolean; requiresAuth?: boolean; reason?: string; timeoutMs?: number }) => void
  onDelete: (id: string) => void
  onRefresh: () => void
  loading: boolean
}) {
  const [newDomain, setNewDomain] = useState("")
  const [newTimeout, setNewTimeout] = useState(30)

  const handleAdd = () => {
    if (!newDomain.trim()) return
    onUpsert({
      domain: newDomain.trim().toLowerCase(),
      enabled: true,
      timeoutMs: newTimeout * 1000,
    })
    setNewDomain("")
    setNewTimeout(30)
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900">Dominios</h3>
        <button
          onClick={onRefresh}
          className="p-1 text-gray-400 hover:text-gray-600 rounded"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Add new domain */}
      <div className="flex items-end gap-2 mb-4 pb-4 border-b border-gray-100">
        <div className="flex-1">
          <Input
            label="Novo dominio"
            placeholder="ex: neco.navy.mil"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
        </div>
        <div className="w-24">
          <Input
            label="Timeout (s)"
            type="number"
            value={newTimeout}
            onChange={(e) => setNewTimeout(parseInt(e.target.value || "30", 10))}
            min={5}
            max={120}
          />
        </div>
        <Button
          icon={Plus}
          onClick={handleAdd}
          disabled={!newDomain.trim()}
          loading={loading}
        >
          Adicionar
        </Button>
      </div>

      {/* Domains table */}
      {domains.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">
          Nenhum dominio configurado
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-medium text-gray-500 uppercase border-b border-gray-100">
                <th className="pb-2 pr-4">Dominio</th>
                <th className="pb-2 pr-4 w-20 text-center">Habilitado</th>
                <th className="pb-2 pr-4 w-24">Timeout</th>
                <th className="pb-2 pr-4 w-20 text-center">Auth</th>
                <th className="pb-2 pr-4">Motivo</th>
                <th className="pb-2 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {domains.map((d) => (
                <DomainRow
                  key={d.id}
                  domain={d}
                  onUpsert={onUpsert}
                  onDelete={onDelete}
                  loading={loading}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

function DomainRow({
  domain,
  onUpsert,
  onDelete,
  loading,
}: {
  domain: DomainConfig
  onUpsert: (data: { domain: string; enabled: boolean; requiresAuth?: boolean; reason?: string; timeoutMs?: number }) => void
  onDelete: (id: string) => void
  loading: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [reason, setReason] = useState(domain.reason || "")
  const [timeoutSec, setTimeoutSec] = useState(domain.timeoutMs / 1000)
  const reasonRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing && reasonRef.current) {
      reasonRef.current.focus()
    }
  }, [editing])

  const handleToggleEnabled = (checked: boolean) => {
    onUpsert({
      domain: domain.domain,
      enabled: checked,
      requiresAuth: domain.requiresAuth,
      reason: domain.reason || undefined,
      timeoutMs: domain.timeoutMs,
    })
  }

  const handleToggleAuth = (checked: boolean) => {
    onUpsert({
      domain: domain.domain,
      enabled: domain.enabled,
      requiresAuth: checked,
      reason: domain.reason || undefined,
      timeoutMs: domain.timeoutMs,
    })
  }

  const handleSaveInline = () => {
    onUpsert({
      domain: domain.domain,
      enabled: domain.enabled,
      requiresAuth: domain.requiresAuth,
      reason: reason || undefined,
      timeoutMs: timeoutSec * 1000,
    })
    setEditing(false)
  }

  return (
    <tr className="group">
      <td className="py-2 pr-4">
        <span className="font-mono text-xs">{domain.domain}</span>
      </td>
      <td className="py-2 pr-4 text-center">
        <Toggle
          checked={domain.enabled}
          onChange={handleToggleEnabled}
          disabled={loading}
        />
      </td>
      <td className="py-2 pr-4">
        {editing ? (
          <input
            type="number"
            className="w-16 px-1.5 py-1 text-xs border border-gray-300 rounded"
            value={timeoutSec}
            onChange={(e) => setTimeoutSec(parseInt(e.target.value || "30", 10))}
            min={5}
            max={120}
          />
        ) : (
          <span className="text-xs text-gray-600">{domain.timeoutMs / 1000}s</span>
        )}
      </td>
      <td className="py-2 pr-4 text-center">
        <Toggle
          checked={domain.requiresAuth}
          onChange={handleToggleAuth}
          disabled={loading}
        />
      </td>
      <td className="py-2 pr-4">
        {editing ? (
          <div className="flex items-center gap-1">
            <input
              ref={reasonRef}
              type="text"
              className="flex-1 px-1.5 py-1 text-xs border border-gray-300 rounded"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Motivo..."
              onKeyDown={(e) => e.key === "Enter" && handleSaveInline()}
            />
            <button
              onClick={handleSaveInline}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              OK
            </button>
          </div>
        ) : (
          <span
            className="text-xs text-gray-500 cursor-pointer hover:text-gray-700"
            onClick={() => setEditing(true)}
          >
            {domain.reason || "-"}
          </span>
        )}
      </td>
      <td className="py-2 text-right">
        {!editing ? (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Editar
            </button>
            <button
              onClick={() => onDelete(domain.id)}
              className="p-1 text-gray-400 hover:text-red-600 rounded"
              disabled={loading}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(false)}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Cancelar
          </button>
        )}
      </td>
    </tr>
  )
}

// ============================================================================
// Queue Card (reusa ScrapingPanel)
// ============================================================================

function QueueCard({
  progress,
  polling,
  loading,
  onStart,
  onRetryFailed,
  onRefresh,
  onPause,
  onResume,
  onCancel,
  onDrain,
  stats,
}: {
  progress: ScrapingProgress | null
  polling: boolean
  loading: boolean
  onStart: (rescrape?: boolean) => void
  onRetryFailed: () => void
  onRefresh: () => void
  onPause: () => void
  onResume: () => void
  onCancel: () => void
  onDrain: () => void
  stats: Record<string, number> | null
}) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900">
          Fila de Scraping
        </h3>
        <button
          onClick={onRefresh}
          className="p-1 text-gray-400 hover:text-gray-600 rounded"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 mb-4">
          {[
            { label: "Total", value: progress?.total ?? 0, color: "text-gray-900" },
            { label: "Sucesso", value: progress?.success ?? 0, color: "text-emerald-600" },
            { label: "Pendente", value: progress?.pending ?? 0, color: "text-blue-600" },
            { label: "Falha", value: progress?.failed ?? 0, color: "text-red-600" },
            { label: "Bloqueado", value: progress?.blocked ?? 0, color: "text-amber-600" },
            { label: "Timeout", value: progress?.timeout ?? 0, color: "text-orange-600" },
            { label: "NECO Erro", value: progress?.necoError ?? 0, color: "text-orange-700" },
            { label: "Expiradas", value: progress?.expired ?? 0, color: "text-gray-400" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
              <div className="text-[10px] text-gray-500 uppercase">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ScrapingPanel component */}
      <ScrapingPanel
        scrapingProgress={progress}
        scrapingPolling={polling}
        scrapingLoading={loading}
        onStartScraping={onStart}
        onRetryFailed={onRetryFailed}
        onRefreshProgress={onRefresh}
        onPauseScraping={onPause}
        onResumeScraping={onResume}
        onCancelScraping={onCancel}
        onDrainScraping={onDrain}
      />

      {/* If queue is idle, show action buttons */}
      {progress && !progress.isPaused && progress.queue.waiting === 0 && progress.queue.active === 0 && (
        <div className="flex items-center gap-2 pt-2 flex-wrap">
          {(progress.failed > 0 || progress.blocked > 0 || progress.timeout > 0 || progress.necoError > 0) && (
            <Button
              variant="danger"
              onClick={onRetryFailed}
              loading={loading}
            >
              Tentar Novamente ({(progress.failed || 0) + (progress.blocked || 0) + (progress.timeout || 0) + (progress.necoError || 0)} falhas)
            </Button>
          )}
          {progress.pending === 0 && (
            <>
              <Button
                variant="primary"
                onClick={() => onStart(false)}
                loading={loading}
              >
                Enfileirar Pendentes
              </Button>
              <Button
                variant="secondary"
                onClick={() => onStart(true)}
                loading={loading}
              >
                Re-scrape Todos
              </Button>
            </>
          )}
        </div>
      )}
    </Card>
  )
}

// ============================================================================
// Reprocess Raw HTML Card
// ============================================================================

function ReprocessCard() {
  const [running, setRunning] = useState(false)
  const [onlyFailed, setOnlyFailed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{
    processed: number
    enriched: number
    errors: number
    childrenCreated: number
  } | null>(null)

  const handleReprocess = async () => {
    setRunning(true)
    setResult(null)
    setError(null)
    try {
      const res = await scrapingApi.reprocess({ onlyFailed })
      setResult({
        processed: res.data.processed,
        enriched: res.data.enriched,
        errors: res.data.errors,
        childrenCreated: res.data.childrenCreated,
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido"
      setError(msg)
      console.error("Failed to reprocess:", err)
    } finally {
      setRunning(false)
    }
  }

  return (
    <Card>
      <div className="flex items-center gap-2 mb-3">
        <Database className="w-5 h-5 text-indigo-600" />
        <h3 className="text-base font-semibold text-gray-900">
          Reprocessar HTML do Banco
        </h3>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Re-extrai dados do HTML ja salvo no banco usando o extrator melhorado.
        Nao faz requests HTTP — apenas reprocessa o rawHtml existente.
        Tambem cria oportunidades filhas para itens com multiplos line items.
      </p>

      <div className="flex items-center gap-4 mb-4">
        <Toggle
          checked={onlyFailed}
          onChange={setOnlyFailed}
          label="Apenas falhas"
        />
        <Button
          icon={Database}
          onClick={handleReprocess}
          loading={running}
          variant="primary"
          disabled={running}
        >
          {running ? "Reprocessando..." : "Reprocessar"}
        </Button>
      </div>

      {running && (
        <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg mb-4">
          <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin" />
          <span className="text-sm text-indigo-700">
            Reprocessando registros do banco... Isso pode levar alguns minutos.
          </span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 rounded-lg mb-4">
          <span className="text-sm text-red-700">Erro: {error}</span>
        </div>
      )}

      {result && (
        <div className="grid grid-cols-4 gap-3 p-3 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">{result.processed}</div>
            <div className="text-[10px] text-gray-500 uppercase">Processados</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-emerald-600">{result.enriched}</div>
            <div className="text-[10px] text-gray-500 uppercase">Enriquecidos</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-indigo-600">{result.childrenCreated}</div>
            <div className="text-[10px] text-gray-500 uppercase">Filhas criadas</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-red-600">{result.errors}</div>
            <div className="text-[10px] text-gray-500 uppercase">Erros</div>
          </div>
        </div>
      )}
    </Card>
  )
}

// ============================================================================
// Scraping Logs Card
// ============================================================================

const SCRAPING_STATUS_BADGES: Record<string, { label: string; className: string }> = {
  success: { label: "Sucesso", className: "bg-emerald-50 text-emerald-700" },
  failed: { label: "Falha", className: "bg-red-50 text-red-700" },
  blocked: { label: "Bloqueado", className: "bg-amber-50 text-amber-700" },
  timeout: { label: "Timeout", className: "bg-orange-50 text-orange-700" },
  neco_error: { label: "NECO Erro", className: "bg-orange-50 text-orange-800" },
  pending: { label: "Pendente", className: "bg-blue-50 text-blue-700" },
  requires_auth: { label: "Auth", className: "bg-purple-50 text-purple-700" },
  disabled: { label: "Desativado", className: "bg-gray-100 text-gray-500" },
  expired: { label: "Expirada", className: "bg-gray-50 text-gray-400" },
}

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "success", label: "Sucesso" },
  { value: "failed", label: "Falha" },
  { value: "blocked", label: "Bloqueado" },
  { value: "timeout", label: "Timeout" },
  { value: "neco_error", label: "NECO Erro" },
  { value: "pending", label: "Pendente" },
  { value: "expired", label: "Expiradas" },
]

function ScrapingLogsCard() {
  const [logs, setLogs] = useState<ScrapingLog[]>([])
  const [meta, setMeta] = useState<PaginatedResponse<ScrapingLog>["meta"] | null>(null)
  const [statusFilter, setStatusFilter] = useState("")
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [retryingId, setRetryingId] = useState<string | null>(null)

  const loadLogs = useCallback(async (p: number, status: string) => {
    setLoading(true)
    try {
      const res = await scrapingApi.getLogs({
        page: p,
        limit: 50,
        status: status || undefined,
      })
      setLogs(res.data.data)
      setMeta(res.data.meta)
    } catch (err) {
      console.error("Failed to load scraping logs:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadLogs(page, statusFilter)
  }, [page, statusFilter, loadLogs])

  const handleFilterChange = (val: string) => {
    setStatusFilter(val)
    setPage(1)
  }

  const FAIL_STATUSES = ["failed", "blocked", "timeout", "neco_error", "requires_auth"]

  const handleRetryOne = async (id: string) => {
    setRetryingId(id)
    try {
      await scrapingApi.scrapeOne(id)
      // Atualiza o log após um breve delay para dar tempo do job iniciar
      setTimeout(() => loadLogs(page, statusFilter), 1500)
    } catch (err) {
      console.error("Failed to retry scraping:", err)
    } finally {
      setRetryingId(null)
    }
  }

  const truncateUrl = (url: string, max = 50) => {
    if (url.length <= max) return url
    return url.slice(0, max) + "..."
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-"
    const d = new Date(dateStr)
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900">
          Logs de Scraping
        </h3>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="text-xs border border-gray-300 rounded px-2 py-1.5 text-gray-700 bg-white"
          >
            {STATUS_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => loadLogs(page, statusFilter)}
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
          Nenhum log de scraping encontrado
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase border-b border-gray-100">
                  <th className="pb-2 pr-3">Solicitacao</th>
                  <th className="pb-2 pr-3">URL</th>
                  <th className="pb-2 pr-3 w-24">Status</th>
                  <th className="pb-2 pr-3">Erro</th>
                  <th className="pb-2 pr-3 w-28">Data</th>
                  <th className="pb-2 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map((log) => {
                  const badge = SCRAPING_STATUS_BADGES[log.scrapingStatus || "pending"] || {
                    label: log.scrapingStatus || "N/A",
                    className: "bg-gray-100 text-gray-600",
                  }
                  const isExpanded = expandedId === log.id
                  const hasError = !!log.scrapingError

                  return (
                    <tr
                      key={log.id}
                      className={`group ${hasError ? "cursor-pointer hover:bg-gray-50" : ""}`}
                      onClick={() => hasError && setExpandedId(isExpanded ? null : log.id)}
                    >
                      <td className="py-2 pr-3">
                        <span className="font-mono text-xs">
                          {log.solicitationNumber || "-"}
                        </span>
                      </td>
                      <td className="py-2 pr-3">
                        {log.sourceUrl ? (
                          <a
                            href={log.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline font-mono"
                            onClick={(e) => e.stopPropagation()}
                            title={log.sourceUrl}
                          >
                            {truncateUrl(log.sourceUrl)}
                          </a>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-2 pr-3">
                        {hasError ? (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-red-600 truncate max-w-[200px]">
                              {isExpanded ? log.scrapingError : (log.scrapingError!.slice(0, 60) + (log.scrapingError!.length > 60 ? "..." : ""))}
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-3 h-3 text-gray-400 flex-shrink-0" />
                            ) : (
                              <ChevronDown className="w-3 h-3 text-gray-400 flex-shrink-0" />
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-xs text-gray-500 whitespace-nowrap">
                        {formatDate(log.scrapedAt)}
                      </td>
                      <td className="py-2 text-right">
                        {FAIL_STATUSES.includes(log.scrapingStatus || "") && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRetryOne(log.id)
                            }}
                            disabled={retryingId === log.id}
                            className="text-[10px] font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {retryingId === log.id ? "..." : "Retry"}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
              <span className="text-xs text-gray-500">
                {meta.total} registros - Pagina {meta.page} de {meta.totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1 rounded text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                  disabled={page >= meta.totalPages}
                  className="p-1 rounded text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
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

export default function ScrapingPage() {
  const { user, loading: authLoading } = useAuth()

  const [settings, setSettings] = useState<ScrapingSettings | null>(null)
  const [domains, setDomains] = useState<DomainConfig[]>([])
  const [progress, setProgress] = useState<ScrapingProgress | null>(null)
  const [stats, setStats] = useState<Record<string, number> | null>(null)

  const [loadingSettings, setLoadingSettings] = useState(true)
  const [savingSettings, setSavingSettings] = useState(false)
  const [loadingDomains, setLoadingDomains] = useState(false)
  const [loadingQueue, setLoadingQueue] = useState(false)
  const [polling, setPolling] = useState(false)

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Load data
  const loadSettings = useCallback(async () => {
    try {
      const res = await scrapingApi.getSettings()
      setSettings(res.data)
    } catch (err) {
      console.error("Failed to load settings:", err)
    } finally {
      setLoadingSettings(false)
    }
  }, [])

  const loadDomains = useCallback(async () => {
    setLoadingDomains(true)
    try {
      const res = await scrapingApi.getDomains()
      setDomains(res.data)
    } catch (err) {
      console.error("Failed to load domains:", err)
    } finally {
      setLoadingDomains(false)
    }
  }, [])

  const loadProgress = useCallback(async () => {
    try {
      const [progressRes, statsRes] = await Promise.all([
        scrapingApi.progress(),
        scrapingApi.statistics(),
      ])
      setProgress(progressRes.data)
      setStats((statsRes.data as any)?.byStatus ?? null)
    } catch (err) {
      console.error("Failed to load progress:", err)
    }
  }, [])

  useEffect(() => {
    if (user) {
      loadSettings()
      loadDomains()
      loadProgress()
    }
  }, [user, loadSettings, loadDomains, loadProgress])

  // Polling for queue progress
  useEffect(() => {
    if (!progress) return

    const isActive =
      progress.queue.waiting > 0 ||
      progress.queue.active > 0 ||
      progress.queue.delayed > 0

    if (isActive && !pollingRef.current) {
      setPolling(true)
      pollingRef.current = setInterval(loadProgress, 3000)
    } else if (!isActive && pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
      setPolling(false)
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [progress, loadProgress])

  // Handlers
  const handleSaveSettings = async (data: Partial<ScrapingSettings>) => {
    setSavingSettings(true)
    try {
      const res = await scrapingApi.updateSettings(data)
      setSettings(res.data)
    } catch (err) {
      console.error("Failed to save settings:", err)
    } finally {
      setSavingSettings(false)
    }
  }

  const handleUpsertDomain = async (data: {
    domain: string
    enabled: boolean
    requiresAuth?: boolean
    reason?: string
    timeoutMs?: number
  }) => {
    setLoadingDomains(true)
    try {
      await scrapingApi.upsertDomain(data)
      await loadDomains()
    } catch (err) {
      console.error("Failed to upsert domain:", err)
    } finally {
      setLoadingDomains(false)
    }
  }

  const handleDeleteDomain = async (id: string) => {
    setLoadingDomains(true)
    try {
      await scrapingApi.deleteDomain(id)
      setDomains((prev) => prev.filter((d) => d.id !== id))
    } catch (err) {
      console.error("Failed to delete domain:", err)
    } finally {
      setLoadingDomains(false)
    }
  }

  const handleStartScraping = async (rescrape?: boolean) => {
    setLoadingQueue(true)
    try {
      await scrapingApi.enqueue(rescrape)
      await loadProgress()
    } catch (err) {
      console.error("Failed to start scraping:", err)
    } finally {
      setLoadingQueue(false)
    }
  }

  const handleRetryFailed = async () => {
    setLoadingQueue(true)
    try {
      await scrapingApi.retryFailed()
      await loadProgress()
    } catch (err) {
      console.error("Failed to retry:", err)
    } finally {
      setLoadingQueue(false)
    }
  }

  const handlePause = async () => {
    setLoadingQueue(true)
    try {
      await scrapingApi.pause()
      await loadProgress()
    } catch (err) {
      console.error("Failed to pause:", err)
    } finally {
      setLoadingQueue(false)
    }
  }

  const handleResume = async () => {
    setLoadingQueue(true)
    try {
      await scrapingApi.resume()
      await loadProgress()
    } catch (err) {
      console.error("Failed to resume:", err)
    } finally {
      setLoadingQueue(false)
    }
  }

  const handleCancel = async () => {
    setLoadingQueue(true)
    try {
      await scrapingApi.cancel()
      await loadProgress()
    } catch (err) {
      console.error("Failed to cancel:", err)
    } finally {
      setLoadingQueue(false)
    }
  }

  const handleDrain = async () => {
    setLoadingQueue(true)
    try {
      await scrapingApi.drain()
      await loadProgress()
    } catch (err) {
      console.error("Failed to drain:", err)
    } finally {
      setLoadingQueue(false)
    }
  }

  return (
    <PageShell authLoading={authLoading} user={user}>
      <PageHeader
        title="Scraping de Links Externos"
        subtitle="Gerencie delays, dominios e fila de scraping das URLs de oportunidades"
      />

      <div className="space-y-6">
        {/* Card 1: Settings */}
        {loadingSettings || !settings ? (
          <Card>
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 rounded w-1/3" />
              <div className="h-10 bg-gray-100 rounded" />
              <div className="h-10 bg-gray-100 rounded" />
            </div>
          </Card>
        ) : (
          <SettingsCard
            settings={settings}
            onSave={handleSaveSettings}
            saving={savingSettings}
          />
        )}

        {/* Card 2: Domains */}
        <DomainsCard
          domains={domains}
          onUpsert={handleUpsertDomain}
          onDelete={handleDeleteDomain}
          onRefresh={loadDomains}
          loading={loadingDomains}
        />

        {/* Card 3: Queue Controls */}
        <QueueCard
          progress={progress}
          polling={polling}
          loading={loadingQueue}
          onStart={handleStartScraping}
          onRetryFailed={handleRetryFailed}
          onRefresh={loadProgress}
          onPause={handlePause}
          onResume={handleResume}
          onCancel={handleCancel}
          onDrain={handleDrain}
          stats={stats}
        />
        {/* Card 4: Reprocess Raw HTML */}
        <ReprocessCard />

        {/* Card 5: Scraping Logs */}
        <ScrapingLogsCard />
      </div>
    </PageShell>
  )
}
