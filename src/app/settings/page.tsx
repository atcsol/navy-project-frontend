"use client"

import { Suspense, useEffect, useState, useCallback } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { emailSyncApi, gmailApi, EmailSyncSettings } from "@/lib/api"
import {
  Button,
  Card,
  Input,
  Toggle,
  PageHeader,
  PageShell,
} from "@/components/ui"
import { Save, RefreshCw, CheckCircle } from "lucide-react"

// ============================================================================
// SyncSettingsCard
// ============================================================================

function SyncSettingsCard({
  settings,
  onSave,
  saving,
}: {
  settings: EmailSyncSettings
  onSave: (data: Partial<EmailSyncSettings>) => void
  saving: boolean
}) {
  const [form, setForm] = useState({
    autoSyncEnabled: settings.autoSyncEnabled,
    syncIntervalMinutes: settings.syncIntervalMinutes,
  })

  useEffect(() => {
    setForm({
      autoSyncEnabled: settings.autoSyncEnabled,
      syncIntervalMinutes: settings.syncIntervalMinutes,
    })
  }, [settings])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(form)
  }

  const formatLastSync = (dateStr: string | null) => {
    if (!dateStr) return "Nunca"
    const date = new Date(dateStr)
    return date.toLocaleString("pt-BR")
  }

  return (
    <Card>
      <h3 className="text-base font-semibold text-gray-900 mb-4">
        Sincronizacao Automatica de Emails
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Toggle auto-sync */}
        <div className="pb-2 border-b border-gray-100">
          <Toggle
            checked={form.autoSyncEnabled}
            onChange={(checked) =>
              setForm((f) => ({ ...f, autoSyncEnabled: checked }))
            }
            label="Ativar sincronizacao automatica"
          />
          <p className="mt-1 text-xs text-gray-500 ml-11">
            Quando ativado, o sistema sincroniza emails de todas as contas Gmail ativas automaticamente
          </p>
        </div>

        {/* Intervalo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Intervalo de sincronizacao (minutos)
          </label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={form.syncIntervalMinutes}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  syncIntervalMinutes: parseInt(e.target.value || "5", 10),
                }))
              }
              min={5}
              max={1440}
              step={5}
              className="w-28"
              disabled={!form.autoSyncEnabled}
            />
            <span className="text-xs text-gray-400">
              min: 5 | max: 1440 (24h)
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            O sistema verifica novos emails a cada intervalo configurado
          </p>
        </div>

        {/* Ultima sync */}
        <div className="pt-2 border-t border-gray-100">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Ultima sincronizacao automatica:</span>{" "}
            {formatLastSync(settings.lastAutoSync)}
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
// Gmail redirect handler
// ============================================================================

function GmailRedirect({ status }: { status: string }) {
  const router = useRouter()

  useEffect(() => {
    const timeout = status === "connected" ? 2000 : 3000
    const timer = setTimeout(() => {
      router.push("/gmail")
    }, timeout)
    return () => clearTimeout(timer)
  }, [status, router])

  if (status === "connected") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="mb-4">
            <svg
              className="mx-auto h-16 w-16 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Gmail Conectado!</h2>
          <p className="text-gray-600 mb-4">Sua conta Gmail foi conectada com sucesso.</p>
          <p className="text-sm text-gray-500">Redirecionando para suas contas Gmail...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        <div className="mb-4">
          <svg
            className="mx-auto h-16 w-16 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Erro na Conexao</h2>
        <p className="text-gray-600 mb-4">Ocorreu um erro ao conectar sua conta Gmail.</p>
        <p className="text-sm text-gray-500">Tente novamente em alguns instantes...</p>
      </div>
    </div>
  )
}

// ============================================================================
// Main content
// ============================================================================

function SettingsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const gmailStatus = searchParams.get("gmail")
  const { user, loading: authLoading } = useAuth()

  const [settings, setSettings] = useState<EmailSyncSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState("")

  const loadSettings = useCallback(async () => {
    try {
      const res = await emailSyncApi.getSettings()
      setSettings(res.data)
    } catch (err) {
      console.error("Failed to load email sync settings:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user && !gmailStatus) {
      loadSettings()
    }
  }, [user, gmailStatus, loadSettings])

  const handleSaveSettings = useCallback(
    async (data: Partial<EmailSyncSettings>) => {
      setSaving(true)
      setSaveSuccess(false)
      try {
        const res = await emailSyncApi.updateSettings(data)
        setSettings(res.data)
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
      } catch (err) {
        console.error("Failed to save email sync settings:", err)
      } finally {
        setSaving(false)
      }
    },
    []
  )

  const handleManualSync = useCallback(async () => {
    setSyncing(true)
    setSyncMessage("")
    try {
      const accountsRes = await gmailApi.accounts()
      const accounts = accountsRes.data as any[]
      const activeAccounts = accounts.filter((a: any) => a.isActive)
      if (activeAccounts.length === 0) {
        setSyncMessage("Nenhuma conta Gmail ativa encontrada")
        setSyncing(false)
        return
      }
      const jobIds: string[] = []
      for (const account of activeAccounts) {
        const res = await gmailApi.sync(account.id)
        jobIds.push(res.data.jobId)
      }
      // Salva jobIds para a página Gmail detectar
      localStorage.setItem("pendingSyncJobIds", JSON.stringify(jobIds))
      // Redireciona para a página Gmail para acompanhar o progresso
      router.push("/gmail")
    } catch (err) {
      console.error("Failed to trigger sync:", err)
      setSyncMessage("Erro ao iniciar sincronizacao")
      setSyncing(false)
    }
  }, [router])

  // Se veio do redirect do Gmail, mostra apenas o redirect handler
  if (gmailStatus) {
    return <GmailRedirect status={gmailStatus} />
  }

  return (
    <PageShell authLoading={authLoading} user={user}>
      <PageHeader
        title="Sincronizacao de Emails"
        subtitle="Configure a sincronizacao automatica de emails das contas Gmail conectadas"
      />

      <div className="max-w-2xl space-y-6">
        {loading ? (
          <Card>
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/3" />
              <div className="h-8 bg-gray-200 rounded w-full" />
              <div className="h-8 bg-gray-200 rounded w-1/2" />
            </div>
          </Card>
        ) : settings ? (
          <>
            <SyncSettingsCard
              settings={settings}
              onSave={handleSaveSettings}
              saving={saving}
            />

            {/* Mensagem de sucesso ao salvar */}
            {saveSuccess && (
              <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                <CheckCircle className="w-4 h-4" />
                Configuracoes salvas com sucesso!
              </div>
            )}

            {/* Card de resincronização manual */}
            <Card>
              <h3 className="text-base font-semibold text-gray-900 mb-2">
                Resincronizacao Manual
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                Forca a sincronizacao de todas as contas Gmail ativas agora. Emails novos serao processados pelos templates configurados.
              </p>
              <div className="flex items-center gap-3">
                <Button
                  icon={RefreshCw}
                  onClick={handleManualSync}
                  loading={syncing}
                  variant="secondary"
                >
                  Sincronizar Agora
                </Button>
                {syncMessage && (
                  <span className={`text-sm ${syncMessage.includes("Erro") ? "text-red-600" : "text-green-600"}`}>
                    {syncMessage}
                  </span>
                )}
              </div>
            </Card>
          </>
        ) : (
          <Card>
            <p className="text-sm text-gray-500">
              Erro ao carregar configuracoes. Tente recarregar a pagina.
            </p>
          </Card>
        )}
      </div>
    </PageShell>
  )
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-gray-600">Carregando...</div>
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  )
}
