"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { useAuthRedirect } from "@/hooks/useAuthRedirect"
import {
  rfqsApi,
  Rfq,
  RFQ_STATUS_LABELS,
  RFQ_STATUS_COLORS,
} from "@/lib/api"
import PermissionGate from "@/components/PermissionGate"
import {
  PageShell,
  PageHeader,
  ErrorBanner,
  LoadingCard,
  EmptyState,
  Button,
} from "@/components/ui"
import {
  FileSpreadsheet,
  Plus,
  Eye,
  Search,
} from "lucide-react"

const STATUS_TABS = [
  { value: "", label: "Todas" },
  { value: "rascunho", label: "Rascunho" },
  { value: "enviada", label: "Enviadas" },
  { value: "parcialmente_respondida", label: "Parc. Respondidas" },
  { value: "respondida", label: "Respondidas" },
  { value: "finalizada", label: "Finalizadas" },
  { value: "cancelada", label: "Canceladas" },
]

export default function RfqsPage() {
  const { user, authLoading } = useAuthRedirect()
  const { can } = useAuth()
  const router = useRouter()
  const [rfqs, setRfqs] = useState<Rfq[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [search, setSearch] = useState("")

  const fetchRfqs = async () => {
    try {
      setLoading(true)
      const res = await rfqsApi.list({
        status: statusFilter || undefined,
        search: search || undefined,
      })
      setRfqs(res.data)
    } catch (err: any) {
      setError(err.response?.data?.message || "Erro ao carregar cotacoes")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!user || !can("rfqs.view")) return
    fetchRfqs()
  }, [user, can, statusFilter])

  useEffect(() => {
    if (!user) return
    const timer = setTimeout(() => fetchRfqs(), 300)
    return () => clearTimeout(timer)
  }, [search])

  const getResponseCount = (rfq: Rfq) => {
    const responded = rfq.items.filter((i) =>
      ["resposta_recebida", "cotado"].includes(i.status)
    ).length
    const sent = rfq.items.filter((i) =>
      ["enviado", "resposta_recebida", "cotado", "sem_resposta"].includes(i.status)
    ).length
    return { responded, sent }
  }

  return (
    <PageShell authLoading={authLoading} user={user}>
      <PageHeader
        title="Cotacoes (RFQ)"
        subtitle="Gerencie solicitacoes de cotacao com fornecedores"
      >
        <PermissionGate permission="rfqs.create">
          <Button onClick={() => router.push("/rfqs/new")} icon={Plus}>
            Nova Cotacao
          </Button>
        </PermissionGate>
      </PageHeader>

      <ErrorBanner message={error} onDismiss={() => setError("")} />

      {/* Filters */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex gap-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                statusFilter === tab.value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {loading ? (
        <LoadingCard message="Carregando cotacoes..." />
      ) : rfqs.length === 0 ? (
        <EmptyState icon={FileSpreadsheet} message="Nenhuma cotacao encontrada" />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <table className="min-w-full">
            <thead>
              <tr>
                {["Ref#", "Titulo", "Oportunidade", "Fornecedores", "Status", "Enviada", "Respostas", "Acoes"].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/80 border-b-2 border-gray-200 border-r border-r-gray-200 whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rfqs.map((rfq, idx) => {
                const { responded, sent } = getResponseCount(rfq)
                return (
                  <tr
                    key={rfq.id}
                    className={`${
                      idx % 2 === 0 ? "bg-white" : "bg-gray-100/60"
                    } hover:bg-blue-50/40 transition-colors cursor-pointer`}
                    onClick={() => router.push(`/rfqs/${rfq.id}`)}
                  >
                    <td className="px-3 py-2 text-[13px] border-b border-gray-200 border-r border-r-gray-200 font-mono text-gray-500">
                      {rfq.referenceNumber || "-"}
                    </td>
                    <td className="px-3 py-2 text-[13px] border-b border-gray-200 border-r border-r-gray-200 font-medium text-gray-900">
                      {rfq.title}
                    </td>
                    <td className="px-3 py-2 text-[13px] border-b border-gray-200 border-r border-r-gray-200 text-gray-600">
                      {rfq.opportunity?.solicitationNumber || (
                        <span className="text-gray-400 italic">Avulsa</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-[13px] border-b border-gray-200 border-r border-r-gray-200 text-center">
                      {rfq.items.length}
                    </td>
                    <td className="px-3 py-2 text-[13px] border-b border-gray-200 border-r border-r-gray-200">
                      <span
                        className={`inline-flex px-2 py-0.5 text-xs font-medium rounded border ${
                          RFQ_STATUS_COLORS[rfq.status] || "bg-gray-50 text-gray-700 border-gray-200"
                        }`}
                      >
                        {RFQ_STATUS_LABELS[rfq.status] || rfq.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[13px] border-b border-gray-200 border-r border-r-gray-200 text-gray-600">
                      {rfq.sentAt
                        ? new Date(rfq.sentAt).toLocaleDateString("pt-BR")
                        : "-"}
                    </td>
                    <td className="px-3 py-2 text-[13px] border-b border-gray-200 border-r border-r-gray-200">
                      {sent > 0 ? (
                        <span className={`font-medium ${responded === sent ? "text-green-600" : responded > 0 ? "text-yellow-600" : "text-gray-500"}`}>
                          {responded}/{sent}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-[13px] border-b border-gray-200 border-r border-r-gray-200">
                      <Button
                        size="xs"
                        icon={Eye}
                        className="text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/rfqs/${rfq.id}`)
                        }}
                      >
                        Ver
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  )
}
