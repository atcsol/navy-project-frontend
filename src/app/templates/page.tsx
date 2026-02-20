"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuthRedirect } from "@/hooks/useAuthRedirect"
import { templatesApi, gmailApi, Template, SyncJobStatus } from "@/lib/api"
import { getErrorMessage } from "@/lib/error-utils"
import SyncProgressPanel from "@/components/SyncProgressPanel"
import { PageShell, PageHeader, ErrorBanner, LoadingCard, EmptyState, Button, Badge, Card } from "@/components/ui"
import {
  Inbox,
  Plus,
  CheckCircle2,
  XCircle,
  Mail,
  Hash,
  Calendar,
  RefreshCw,
  Pencil,
  ToggleRight,
  ToggleLeft,
  Trash2,
} from "lucide-react"

export default function TemplatesPage() {
  const { user, authLoading } = useAuthRedirect()
  const router = useRouter()
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Sync state
  const [syncingTemplateId, setSyncingTemplateId] = useState<string | null>(null)
  const [syncStatuses, setSyncStatuses] = useState<SyncJobStatus[]>([])
  const [syncJobIds, setSyncJobIds] = useState<string[]>([])
  const [syncTemplateName, setSyncTemplateName] = useState("")
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchTemplates = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)
      setError("")
      const response = await templatesApi.list()
      setTemplates(response.data)
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Erro ao carregar templates"))
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  // Polling for sync statuses
  const startPolling = useCallback((jobIds: string[]) => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
    }

    const poll = async () => {
      try {
        const responses = await Promise.all(
          jobIds.map((id) => gmailApi.syncStatus(id))
        )
        const statuses = responses.map((r) => r.data)
        setSyncStatuses(statuses)

        const allDone = statuses.every((s) => {
          const syncDone =
            s.state === "completed" ||
            s.state === "failed" ||
            s.state === "not_found"
          const oppsDone =
            s.opportunityJobs.length === 0 ||
            s.opportunityJobs.every(
              (j) =>
                j.state === "completed" ||
                j.state === "failed" ||
                j.state === "not_found"
            )
          return syncDone && oppsDone
        })

        if (allDone) {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
          }
          setSyncingTemplateId(null)
        }
      } catch {
        // Silently ignore polling errors
      }
    }

    poll()
    pollIntervalRef.current = setInterval(poll, 2000)
  }, [])

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [])

  const handleSync = async (templateId: string) => {
    if (syncingTemplateId) return

    setSyncingTemplateId(templateId)
    setSyncStatuses([])
    setSyncJobIds([])
    setError("")

    try {
      const response = await templatesApi.sync(templateId)
      const { jobIds, templateName } = response.data

      if (jobIds.length === 0) {
        setError("Nenhuma conta Gmail ativa encontrada. Conecte uma conta Gmail primeiro.")
        setSyncingTemplateId(null)
        return
      }

      setSyncJobIds(jobIds)
      setSyncTemplateName(templateName)
      startPolling(jobIds)
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Erro ao iniciar sincronização"))
      setSyncingTemplateId(null)
    }
  }

  const handleCloseSyncPanel = () => {
    setSyncStatuses([])
    setSyncJobIds([])
    setSyncingTemplateId(null)
    setSyncTemplateName("")
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
  }

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await templatesApi.toggle(id, !currentStatus)
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, isActive: !currentStatus } : t
        )
      )
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Erro ao atualizar template"))
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este template?")) return

    try {
      await templatesApi.delete(id)
      setTemplates((prev) => prev.filter((t) => t.id !== id))
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Erro ao excluir template"))
    }
  }

  return (
    <PageShell authLoading={authLoading} user={user}>
      <PageHeader
        title="Templates de Parsing"
        subtitle="Gerencie os templates para extração de dados de emails"
        action={{ label: "Novo Template", icon: Plus, onClick: () => router.push("/templates/new") }}
      />

      {/* Sync Progress Panel */}
      {syncStatuses.length > 0 && (
        <div className="mb-6">
          {syncTemplateName && (
            <div className="text-sm font-medium text-gray-700 mb-2">
              Sincronizando: {syncTemplateName}
            </div>
          )}
          <SyncProgressPanel
            statuses={syncStatuses}
            onClose={handleCloseSyncPanel}
            onGoToDashboard={() => router.push("/")}
          />
        </div>
      )}

      <ErrorBanner message={error} onDismiss={() => setError("")} />

      {loading ? (
        <LoadingCard message="Carregando templates..." />
      ) : (
        <>
          {templates.length === 0 ? (
            <EmptyState
              icon={Inbox}
              message="Nenhum template encontrado"
              action={{ label: "Criar Primeiro Template", icon: Plus, onClick: () => router.push("/templates/new") }}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {templates.map((template) => (
                <Card key={template.id} hover padding="md">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {template.name}
                        </h3>
                        <Badge
                          variant={template.isActive ? "success" : "default"}
                          icon={template.isActive ? CheckCircle2 : XCircle}
                        >
                          {template.isActive ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                      {template.description && (
                        <p className="text-sm text-gray-600 mb-3">
                          {template.description}
                        </p>
                      )}
                      <div className="space-y-1 mb-3">
                        <div className="flex items-center gap-1.5 text-sm text-gray-500">
                          <Mail className="w-3.5 h-3.5" />
                          <span className="font-medium">Remetente:</span>{" "}
                          {template.senderEmail}
                        </div>
                        {template.subjectFilter && (
                          <div className="flex items-center gap-1.5 text-sm text-gray-500">
                            <Mail className="w-3.5 h-3.5" />
                            <span className="font-medium">Assunto contém:</span>{" "}
                            {template.subjectFilter}
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 text-sm text-gray-500">
                          <Hash className="w-3.5 h-3.5" />
                          <span className="font-medium">Campos extraídos:</span>{" "}
                          {template.extractionConfig?.fields?.length || 0} campos
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          Criado em:{" "}
                          {new Date(template.createdAt).toLocaleDateString(
                            "pt-BR"
                          )}
                        </div>
                        {template.updatedAt !== template.createdAt && (
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            Atualizado em:{" "}
                            {new Date(template.updatedAt).toLocaleDateString(
                              "pt-BR"
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      {template.isActive && (
                        <Button
                          onClick={() => handleSync(template.id)}
                          disabled={!!syncingTemplateId}
                          size="sm"
                          loading={syncingTemplateId === template.id}
                          icon={RefreshCw}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                        >
                          {syncingTemplateId === template.id
                            ? "Sincronizando..."
                            : "Sincronizar"}
                        </Button>
                      )}
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={Pencil}
                        onClick={() =>
                          router.push(`/templates/${template.id}/edit`)
                        }
                      >
                        Editar
                      </Button>
                      <Button
                        variant={template.isActive ? "secondary" : "success"}
                        size="sm"
                        icon={template.isActive ? ToggleRight : ToggleLeft}
                        onClick={() =>
                          handleToggleActive(template.id, template.isActive)
                        }
                      >
                        {template.isActive ? "Desativar" : "Ativar"}
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        icon={Trash2}
                        onClick={() => handleDelete(template.id)}
                      >
                        Excluir
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
