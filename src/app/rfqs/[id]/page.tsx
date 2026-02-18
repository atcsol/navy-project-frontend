"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { useAuthRedirect } from "@/hooks/useAuthRedirect"
import {
  rfqsApi,
  Rfq,
  RfqItem,
  RFQ_STATUS_LABELS,
  RFQ_STATUS_COLORS,
  RFQ_ITEM_STATUS_LABELS,
  RFQ_ITEM_STATUS_COLORS,
} from "@/lib/api"
import PermissionGate from "@/components/PermissionGate"
import {
  PageShell,
  PageHeader,
  ErrorBanner,
  LoadingCard,
  Modal,
  Button,
  Card,
  Input,
  Textarea,
} from "@/components/ui"
import {
  ArrowLeft,
  Send,
  CheckCircle,
  XCircle,
  DollarSign,
  Save,
  X,
  Star,
} from "lucide-react"

export default function RfqDetailPage() {
  const { user, authLoading } = useAuthRedirect()
  const { can } = useAuth()
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [rfq, setRfq] = useState<Rfq | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [actionLoading, setActionLoading] = useState("")

  // Quote modal
  const [quoteItem, setQuoteItem] = useState<RfqItem | null>(null)
  const [quoteForm, setQuoteForm] = useState({
    quotedPrice: "",
    quotedDeliveryDays: "",
    quotedCondition: "",
    quotedNotes: "",
  })
  const [savingQuote, setSavingQuote] = useState(false)

  const fetchRfq = async () => {
    try {
      setLoading(true)
      const res = await rfqsApi.get(id)
      setRfq(res.data)
    } catch (err: any) {
      setError(err.response?.data?.message || "Erro ao carregar cotacao")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!user || !id) return
    fetchRfq()
  }, [user, id])

  const handleSend = async () => {
    if (!confirm("Enviar emails para todos os fornecedores?")) return
    setActionLoading("send")
    try {
      await rfqsApi.send(id)
      await fetchRfq()
    } catch (err: any) {
      setError(err.response?.data?.message || "Erro ao enviar")
    } finally {
      setActionLoading("")
    }
  }

  const handleFinalize = async () => {
    if (!confirm("Finalizar esta cotacao?")) return
    setActionLoading("finalize")
    try {
      await rfqsApi.finalize(id)
      await fetchRfq()
    } catch (err: any) {
      setError(err.response?.data?.message || "Erro ao finalizar")
    } finally {
      setActionLoading("")
    }
  }

  const handleCancel = async () => {
    if (!confirm("Cancelar esta cotacao?")) return
    setActionLoading("cancel")
    try {
      await rfqsApi.cancel(id)
      await fetchRfq()
    } catch (err: any) {
      setError(err.response?.data?.message || "Erro ao cancelar")
    } finally {
      setActionLoading("")
    }
  }

  const openQuoteModal = (item: RfqItem) => {
    setQuoteItem(item)
    setQuoteForm({
      quotedPrice: item.quotedPrice != null ? String(item.quotedPrice) : "",
      quotedDeliveryDays: item.quotedDeliveryDays != null ? String(item.quotedDeliveryDays) : "",
      quotedCondition: item.quotedCondition || "",
      quotedNotes: item.quotedNotes || "",
    })
  }

  const handleSaveQuote = async () => {
    if (!quoteItem || !rfq) return
    setSavingQuote(true)
    try {
      await rfqsApi.updateItem(rfq.id, quoteItem.id, {
        quotedPrice: quoteForm.quotedPrice ? Number(quoteForm.quotedPrice) : undefined,
        quotedDeliveryDays: quoteForm.quotedDeliveryDays
          ? Number(quoteForm.quotedDeliveryDays)
          : undefined,
        quotedCondition: quoteForm.quotedCondition || undefined,
        quotedNotes: quoteForm.quotedNotes || undefined,
      })
      setQuoteItem(null)
      await fetchRfq()
    } catch (err: any) {
      setError(err.response?.data?.message || "Erro ao salvar cotacao")
    } finally {
      setSavingQuote(false)
    }
  }

  const handleSelectWinner = async (item: RfqItem) => {
    if (!rfq) return
    try {
      await rfqsApi.updateItem(rfq.id, item.id, { isSelected: true })
      await fetchRfq()
    } catch (err: any) {
      setError(err.response?.data?.message || "Erro ao selecionar vencedor")
    }
  }

  if (loading) {
    return (
      <PageShell authLoading={authLoading} user={user}>
        <LoadingCard message="Carregando cotacao..." />
      </PageShell>
    )
  }

  if (!rfq) {
    return (
      <PageShell authLoading={authLoading} user={user}>
        <ErrorBanner message="Cotacao nao encontrada" onDismiss={() => router.push("/rfqs")} />
      </PageShell>
    )
  }

  // Summary calculations
  const quotedItems = rfq.items.filter((i) => i.quotedPrice != null)
  const lowestPrice = quotedItems.length > 0
    ? Math.min(...quotedItems.map((i) => Number(i.quotedPrice)))
    : null
  const avgPrice = quotedItems.length > 0
    ? quotedItems.reduce((sum, i) => sum + Number(i.quotedPrice), 0) / quotedItems.length
    : null
  const respondedCount = rfq.items.filter((i) =>
    ["resposta_recebida", "cotado"].includes(i.status)
  ).length

  return (
    <PageShell authLoading={authLoading} user={user}>
      <PageHeader
        title={rfq.title}
        subtitle={`${rfq.referenceNumber || ""} - ${RFQ_STATUS_LABELS[rfq.status] || rfq.status}`}
      >
        <div className="flex gap-2">
          <Button
            variant="secondary"
            icon={ArrowLeft}
            onClick={() => router.push("/rfqs")}
          >
            Voltar
          </Button>
          {rfq.status === "rascunho" && (
            <PermissionGate permission="rfqs.send">
              <Button
                icon={Send}
                loading={actionLoading === "send"}
                disabled={!!actionLoading}
                onClick={handleSend}
              >
                Enviar
              </Button>
            </PermissionGate>
          )}
          {["enviada", "parcialmente_respondida", "respondida"].includes(rfq.status) && (
            <PermissionGate permission="rfqs.update">
              <Button
                variant="success"
                icon={CheckCircle}
                loading={actionLoading === "finalize"}
                disabled={!!actionLoading}
                onClick={handleFinalize}
              >
                Finalizar
              </Button>
            </PermissionGate>
          )}
          {!["finalizada", "cancelada"].includes(rfq.status) && (
            <PermissionGate permission="rfqs.update">
              <Button
                variant="secondary"
                icon={XCircle}
                loading={actionLoading === "cancel"}
                disabled={!!actionLoading}
                onClick={handleCancel}
                className="text-red-700 border-red-200 hover:bg-red-50"
              >
                Cancelar
              </Button>
            </PermissionGate>
          )}
        </div>
      </PageHeader>

      <ErrorBanner message={error} onDismiss={() => setError("")} />

      {/* Info cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card padding="sm">
          <div className="text-xs text-gray-500 mb-1">Status</div>
          <span
            className={`inline-flex px-2 py-0.5 text-xs font-medium rounded border ${
              RFQ_STATUS_COLORS[rfq.status] || ""
            }`}
          >
            {RFQ_STATUS_LABELS[rfq.status] || rfq.status}
          </span>
        </Card>
        <Card padding="sm">
          <div className="text-xs text-gray-500 mb-1">Respostas</div>
          <div className="text-lg font-semibold text-gray-900">
            {respondedCount}/{rfq.items.length}
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-xs text-gray-500 mb-1">Menor Cotacao</div>
          <div className="text-lg font-semibold text-green-600">
            {lowestPrice != null ? `$${lowestPrice.toFixed(2)}` : "-"}
          </div>
        </Card>
        <Card padding="sm">
          <div className="text-xs text-gray-500 mb-1">Media</div>
          <div className="text-lg font-semibold text-gray-900">
            {avgPrice != null ? `$${avgPrice.toFixed(2)}` : "-"}
          </div>
        </Card>
      </div>

      {/* Opportunity info */}
      {rfq.opportunity && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-sm">
          <span className="font-medium text-blue-900">Oportunidade:</span>{" "}
          <span className="text-blue-700">
            {rfq.opportunity.solicitationNumber} - {(rfq.opportunity as any)?.site || ""} -{" "}
            {rfq.opportunity.description || ""}
          </span>
        </div>
      )}

      {/* Comparison table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <table className="min-w-full">
          <thead>
            <tr>
              {["Fornecedor", "Status", "Preco", "Prazo (dias)", "Condicao", "Notas", "Acoes"].map((h) => (
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
            {rfq.items.map((item, idx) => {
              const isLowest =
                item.quotedPrice != null && Number(item.quotedPrice) === lowestPrice
              return (
                <tr
                  key={item.id}
                  className={`${
                    item.isSelected
                      ? "bg-green-50"
                      : item.status === "resposta_recebida"
                      ? "bg-yellow-50/50"
                      : isLowest
                      ? "bg-green-50/30"
                      : idx % 2 === 0
                      ? "bg-white"
                      : "bg-gray-100/60"
                  } hover:bg-blue-50/40 transition-colors`}
                >
                  <td className="px-3 py-2 text-[13px] border-b border-gray-200 border-r border-r-gray-200">
                    <div className="flex items-center gap-2">
                      {item.isSelected && (
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      )}
                      <div>
                        <div className="font-medium text-gray-900">{item.supplier.name}</div>
                        <div className="text-xs text-gray-500">{item.supplier.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-[13px] border-b border-gray-200 border-r border-r-gray-200">
                    <span
                      className={`inline-flex px-2 py-0.5 text-xs font-medium rounded border ${
                        RFQ_ITEM_STATUS_COLORS[item.status] || ""
                      }`}
                    >
                      {RFQ_ITEM_STATUS_LABELS[item.status] || item.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-[13px] border-b border-gray-200 border-r border-r-gray-200">
                    {item.quotedPrice != null ? (
                      <span className={`font-medium ${isLowest ? "text-green-600" : "text-gray-900"}`}>
                        ${Number(item.quotedPrice).toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-[13px] border-b border-gray-200 border-r border-r-gray-200 text-gray-600">
                    {item.quotedDeliveryDays ?? "-"}
                  </td>
                  <td className="px-3 py-2 text-[13px] border-b border-gray-200 border-r border-r-gray-200 text-gray-600">
                    {item.quotedCondition || "-"}
                  </td>
                  <td className="px-3 py-2 text-[13px] border-b border-gray-200 border-r border-r-gray-200 text-gray-600 max-w-[200px] truncate">
                    {item.quotedNotes || "-"}
                  </td>
                  <td className="px-3 py-2 text-[13px] border-b border-gray-200 border-r border-r-gray-200">
                    <div className="flex gap-1.5">
                      {!["finalizada", "cancelada"].includes(rfq.status) && (
                        <PermissionGate permission="rfqs.update">
                          <Button
                            size="xs"
                            icon={DollarSign}
                            className="text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100"
                            onClick={() => openQuoteModal(item)}
                          >
                            Cotar
                          </Button>
                          {item.quotedPrice != null && !item.isSelected && (
                            <Button
                              size="xs"
                              icon={Star}
                              className="text-yellow-700 bg-yellow-50 border border-yellow-200 hover:bg-yellow-100"
                              onClick={() => handleSelectWinner(item)}
                            >
                              Selecionar
                            </Button>
                          )}
                        </PermissionGate>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Quote Modal */}
      <Modal
        open={!!quoteItem}
        onClose={() => setQuoteItem(null)}
        title={`Cotacao - ${quoteItem?.supplier.name ?? ""}`}
      >
        <div className="space-y-3 mb-6">
          <Input
            label="Preco ($)"
            type="number"
            step="0.01"
            value={quoteForm.quotedPrice}
            onChange={(e) =>
              setQuoteForm((p) => ({ ...p, quotedPrice: e.target.value }))
            }
          />
          <Input
            label="Prazo de Entrega (dias)"
            type="number"
            value={quoteForm.quotedDeliveryDays}
            onChange={(e) =>
              setQuoteForm((p) => ({ ...p, quotedDeliveryDays: e.target.value }))
            }
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Condicao</label>
            <select
              value={quoteForm.quotedCondition}
              onChange={(e) =>
                setQuoteForm((p) => ({ ...p, quotedCondition: e.target.value }))
              }
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecionar...</option>
              <option value="New">New</option>
              <option value="OH">OH (Overhauled)</option>
              <option value="AR">AR (As Removed)</option>
              <option value="SV">SV (Serviceable)</option>
              <option value="NE">NE (New Excess)</option>
              <option value="NS">NS (New Surplus)</option>
            </select>
          </div>
          <Textarea
            label="Notas"
            value={quoteForm.quotedNotes}
            onChange={(e) =>
              setQuoteForm((p) => ({ ...p, quotedNotes: e.target.value }))
            }
            rows={2}
          />
        </div>
        <Modal.Footer>
          <Button
            variant="secondary"
            icon={X}
            onClick={() => setQuoteItem(null)}
          >
            Cancelar
          </Button>
          <Button
            icon={Save}
            loading={savingQuote}
            onClick={handleSaveQuote}
          >
            {savingQuote ? "Salvando..." : "Salvar"}
          </Button>
        </Modal.Footer>
      </Modal>
    </PageShell>
  )
}
