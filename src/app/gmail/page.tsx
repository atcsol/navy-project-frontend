"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuthRedirect } from "@/hooks/useAuthRedirect"
import { gmailApi, SyncJobStatus } from "@/lib/api"
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
} from "lucide-react"

interface GmailAccount {
  id: string
  email: string
  isActive: boolean
  lastSync?: string
  createdAt: string
}

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
    } catch (err: any) {
      setError(err.response?.data?.message || "Erro ao carregar contas Gmail")
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
    } catch (err: any) {
      setError(err.response?.data?.message || "Erro ao atualizar conta")
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
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Erro ao iniciar sincronização"
      )
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
    } catch (err: any) {
      setError(err.response?.data?.message || "Erro ao remover conta")
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
        </>
      )}
    </PageShell>
  )
}
