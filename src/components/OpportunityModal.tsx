"use client"

import { useEffect, useState, useCallback } from "react"
import { opportunitiesApi, scrapingApi, Opportunity, STATUS_LABELS, STATUS_COLORS } from "@/lib/api"
import { formatCurrency, formatDate, getUrgencyColor } from "@/lib/utils"
import { getErrorMessage } from "@/lib/error-utils"
import { Button } from "@/components/ui"
import {
  X,
  Pencil,
  Trash2,
  Save,
  Ban,
  ExternalLink,
  Globe,
  Clock,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react"
import ScrapedDataTabs from "./ScrapedDataTabs"

interface OpportunityModalProps {
  opportunityId: string
  onClose: () => void
  onUpdated: () => void
}

export default function OpportunityModal({
  opportunityId,
  onClose,
  onUpdated,
}: OpportunityModalProps) {
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isScraping, setIsScraping] = useState(false)

  const [formData, setFormData] = useState({
    purchasePrice: 0,
    profitMargin: 0,
    offeredPrice: 0,
    status: "nao_analisada" as string,
  })

  const fetchOpportunity = useCallback(async () => {
    try {
      setLoading(true)
      setError("")
      const response = await opportunitiesApi.get(opportunityId)
      setOpportunity(response.data)
      setFormData({
        purchasePrice: Number(response.data.purchasePrice) || 0,
        profitMargin: Number(response.data.profitMargin) || 0,
        offeredPrice: Number(response.data.offeredPrice) || 0,
        status: response.data.status,
      })
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Erro ao carregar oportunidade"))
    } finally {
      setLoading(false)
    }
  }, [opportunityId])

  useEffect(() => {
    fetchOpportunity()
  }, [fetchOpportunity])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [onClose])

  useEffect(() => {
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = ""
    }
  }, [])

  const calculateOfferedPrice = (purchase: number, margin: number) =>
    purchase * (1 + margin / 100)

  const calculateProfitMargin = (purchase: number, offered: number) =>
    purchase === 0 ? 0 : ((offered - purchase) / purchase) * 100

  const handlePurchasePriceChange = (value: number) => {
    const offeredPrice = calculateOfferedPrice(value, formData.profitMargin)
    setFormData({ ...formData, purchasePrice: value, offeredPrice })
  }

  const handleProfitMarginChange = (value: number) => {
    const offeredPrice = calculateOfferedPrice(formData.purchasePrice, value)
    setFormData({ ...formData, profitMargin: value, offeredPrice })
  }

  const handleOfferedPriceChange = (value: number) => {
    const profitMargin = calculateProfitMargin(formData.purchasePrice, value)
    setFormData({ ...formData, offeredPrice: value, profitMargin })
  }

  const handleSave = async () => {
    if (!opportunity) return
    setIsSaving(true)
    try {
      await opportunitiesApi.update(opportunityId, {
        purchasePrice: formData.purchasePrice,
        profitMargin: formData.profitMargin,
        offeredPrice: formData.offeredPrice,
        profitAmount: formData.offeredPrice - formData.purchasePrice,
        status: formData.status,
      })
      await fetchOpportunity()
      setIsEditing(false)
      onUpdated()
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Erro ao salvar"))
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Tem certeza que deseja excluir esta oportunidade?")) return
    try {
      await opportunitiesApi.delete(opportunityId)
      onUpdated()
      onClose()
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Erro ao excluir"))
    }
  }

  const handleScrapeOne = async () => {
    setIsScraping(true)
    setError("")
    try {
      await scrapingApi.scrapeOne(opportunityId)
      await fetchOpportunity()
      onUpdated()
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Erro ao sincronizar dados"))
    } finally {
      setIsScraping(false)
    }
  }

  const profitAmount = formData.offeredPrice - formData.purchasePrice

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center py-8" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <div
        className="relative bg-white rounded-lg shadow-2xl w-full max-w-[1100px] max-h-[85vh] overflow-y-auto mx-4 border border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        {loading && (
          <div className="p-12 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto mb-2" />
            <span className="text-sm text-gray-500">Carregando...</span>
          </div>
        )}

        {error && !loading && (
          <div className="p-6">
            <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2 text-sm text-red-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          </div>
        )}

        {opportunity && !loading && (
          <>
            {/* Header - Compact */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-2.5 flex justify-between items-center z-10">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-bold text-gray-900 font-mono">
                  {opportunity.solicitationNumber || "Sem numero"}
                </h2>
                <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${STATUS_COLORS[opportunity.status] || "bg-gray-100 text-gray-600"}`}>
                  {STATUS_LABELS[opportunity.status] || opportunity.status}
                </span>
                {opportunity.urgencyLevel && (
                  <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${getUrgencyColor(opportunity.urgencyLevel)}`}>
                    {opportunity.urgencyLevel === "critical" && "Critica"}
                    {opportunity.urgencyLevel === "high" && "Alta"}
                    {opportunity.urgencyLevel === "medium" && "Media"}
                    {opportunity.urgencyLevel === "low" && "Baixa"}
                    {opportunity.urgencyLevel === "expired" && "Expirada"}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {!isEditing ? (
                  <>
                    <Button
                      size="xs"
                      icon={Pencil}
                      onClick={() => setIsEditing(true)}
                    >
                      Editar
                    </Button>
                    <Button
                      size="xs"
                      variant="danger"
                      icon={Trash2}
                      onClick={handleDelete}
                      className="bg-red-50 text-red-600 hover:bg-red-100"
                    >
                      Excluir
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      size="xs"
                      variant="success"
                      icon={Save}
                      loading={isSaving}
                      onClick={handleSave}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      Salvar
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      icon={Ban}
                      disabled={isSaving}
                      onClick={() => {
                        setIsEditing(false)
                        setFormData({
                          purchasePrice: Number(opportunity.purchasePrice) || 0,
                          profitMargin: Number(opportunity.profitMargin) || 0,
                          offeredPrice: Number(opportunity.offeredPrice) || 0,
                          status: opportunity.status,
                        })
                      }}
                    >
                      Cancelar
                    </Button>
                  </>
                )}
                <button
                  onClick={onClose}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 ml-1 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {error && (
              <div className="mx-4 mt-3">
                <div className="bg-red-50 border border-red-200 rounded-md px-3 py-2 text-xs text-red-800 flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                  {error}
                </div>
              </div>
            )}

            {/* Body */}
            <div className="p-4 space-y-4">

              {/* ============================================================ */}
              {/* INFO GRID - Estilo planilha com bordas */}
              {/* ============================================================ */}
              <div className="border border-gray-200 rounded-md overflow-hidden">
                <div className="grid grid-cols-3 divide-x divide-gray-200">
                  <Cell label="Site" value={opportunity.site} />
                  <Cell label="NSN" value={opportunity.nsn} mono />
                  <Cell label="Part Number" value={opportunity.partNumber} mono />
                </div>
                <div className="grid grid-cols-3 divide-x divide-gray-200 border-t border-gray-200">
                  <Cell label="Fechamento" value={
                    opportunity.closingDate
                      ? `${formatDate(opportunity.closingDate)}${opportunity.daysUntilClosing !== null
                          ? ` (${opportunity.daysUntilClosing > 1
                              ? `${opportunity.daysUntilClosing}d`
                              : opportunity.daysUntilClosing >= 0
                              ? "Hoje"
                              : "Expirado"})`
                          : ""}`
                      : null
                  } />
                  <Cell label="Quantidade" value={opportunity.quantity} />
                  <Cell label="Condicao" value={opportunity.extractedData?.condition as string} />
                </div>
                <div className="border-t border-gray-200">
                  <Cell label="Descricao" value={opportunity.description} />
                </div>
                {opportunity.sourceUrl && (
                  <div className="border-t border-gray-200 px-3 py-1.5 flex items-center gap-2">
                    <Globe className="w-3 h-3 text-gray-400 flex-shrink-0" />
                    <a
                      href={opportunity.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline truncate flex-1"
                    >
                      {opportunity.sourceUrl}
                    </a>
                    <ExternalLink className="w-3 h-3 text-blue-400 flex-shrink-0" />

                    {/* Scraping status + botao sync */}
                    <div className="flex items-center gap-1.5 ml-2 flex-shrink-0 border-l border-gray-200 pl-2">
                      {opportunity.scrapingStatus && (
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          opportunity.scrapingStatus === 'success'
                            ? 'bg-emerald-50 text-emerald-600'
                            : opportunity.scrapingStatus === 'neco_error'
                            ? 'bg-orange-50 text-orange-600'
                            : opportunity.scrapingStatus === 'failed'
                            ? 'bg-red-50 text-red-600'
                            : opportunity.scrapingStatus === 'pending'
                            ? 'bg-blue-50 text-blue-600'
                            : 'bg-gray-50 text-gray-500'
                        }`}>
                          {opportunity.scrapingStatus === 'success' && <CheckCircle2 className="w-3 h-3" />}
                          {opportunity.scrapingStatus === 'neco_error' && <XCircle className="w-3 h-3" />}
                          {opportunity.scrapingStatus === 'failed' && <XCircle className="w-3 h-3" />}
                          {opportunity.scrapingStatus === 'pending' && <Clock className="w-3 h-3" />}
                          {opportunity.scrapingStatus === 'success' ? 'Sync' :
                           opportunity.scrapingStatus === 'neco_error' ? 'NECO Erro' :
                           opportunity.scrapingStatus === 'failed' ? 'Falhou' :
                           opportunity.scrapingStatus === 'pending' ? 'Pendente' :
                           opportunity.scrapingStatus}
                        </span>
                      )}
                      <Button
                        size="xs"
                        icon={isScraping ? undefined : RefreshCw}
                        loading={isScraping}
                        onClick={handleScrapeOne}
                        className="text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-[11px]"
                        title="Sincronizar dados do link"
                      >
                        Sync
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* ============================================================ */}
              {/* PRECIFICACAO - Grid de celulas */}
              {/* ============================================================ */}
              <div>
                <SectionHeader icon={<DollarSign className="w-3.5 h-3.5" />} title="Precificacao" />
                {isEditing ? (
                  <div className="border border-gray-200 rounded-md overflow-hidden">
                    <div className="grid grid-cols-5 divide-x divide-gray-200">
                      <div className="px-3 py-2">
                        <label className="text-[10px] font-medium text-gray-400 uppercase">Preco Compra</label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.purchasePrice}
                          onChange={(e) => handlePurchasePriceChange(parseFloat(e.target.value) || 0)}
                          className="w-full mt-0.5 px-2 py-1 text-sm font-medium border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div className="px-3 py-2">
                        <label className="text-[10px] font-medium text-gray-400 uppercase">Margem %</label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.profitMargin}
                          onChange={(e) => handleProfitMarginChange(parseFloat(e.target.value) || 0)}
                          className="w-full mt-0.5 px-2 py-1 text-sm font-medium border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div className="px-3 py-2">
                        <label className="text-[10px] font-medium text-gray-400 uppercase">Preco Ofertado</label>
                        <input
                          type="number"
                          step="0.01"
                          value={formData.offeredPrice}
                          onChange={(e) => handleOfferedPriceChange(parseFloat(e.target.value) || 0)}
                          className="w-full mt-0.5 px-2 py-1 text-sm font-medium border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div className="px-3 py-2">
                        <label className="text-[10px] font-medium text-gray-400 uppercase">Lucro</label>
                        <div className={`mt-1.5 text-sm font-bold ${profitAmount > 0 ? "text-emerald-600" : profitAmount < 0 ? "text-red-600" : "text-gray-400"}`}>
                          {formatCurrency(profitAmount)}
                        </div>
                      </div>
                      <div className="px-3 py-2">
                        <label className="text-[10px] font-medium text-gray-400 uppercase">Status</label>
                        <select
                          value={formData.status}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                          className="w-full mt-0.5 px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          {Object.entries(STATUS_LABELS).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-md overflow-hidden">
                    <div className="grid grid-cols-4 divide-x divide-gray-200">
                      <PriceCell label="Preco Compra" value={formatCurrency(opportunity.purchasePrice)} />
                      <PriceCell
                        label="Margem"
                        value={opportunity.profitMargin ? `${Number(opportunity.profitMargin).toFixed(2)}%` : "-"}
                        highlight={
                          opportunity.profitMargin
                            ? Number(opportunity.profitMargin) >= 20
                              ? "emerald"
                              : Number(opportunity.profitMargin) >= 10
                              ? "amber"
                              : "red"
                            : undefined
                        }
                      />
                      <PriceCell label="Preco Ofertado" value={formatCurrency(opportunity.offeredPrice)} />
                      <PriceCell
                        label="Lucro"
                        value={formatCurrency(opportunity.profitAmount)}
                        highlight={
                          opportunity.profitAmount
                            ? Number(opportunity.profitAmount) > 0
                              ? "emerald"
                              : "red"
                            : undefined
                        }
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* ============================================================ */}
              {/* DADOS - Tabs (Email + Scraped) */}
              {/* ============================================================ */}
              {(opportunity.extractedData || opportunity.scrapedData) && (
                <ScrapedDataTabs
                  scrapedData={opportunity.scrapedData || {}}
                  extractedData={opportunity.extractedData as Record<string, unknown> | null}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionHeader({ icon, title, children }: { icon: React.ReactNode; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-1.5">
      <span className="text-gray-400">{icon}</span>
      <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{title}</h3>
      {children}
    </div>
  )
}

function Cell({ label, value, mono, full }: { label: string; value: string | number | null | undefined; mono?: boolean; full?: boolean }) {
  return (
    <div className={`px-3 py-1.5 ${full ? "" : ""}`}>
      <div className="text-[10px] font-medium text-gray-400 uppercase truncate">{label}</div>
      <div className={`text-xs text-gray-900 mt-0.5 leading-tight ${mono ? "font-mono" : "font-medium"} ${!value ? "text-gray-300" : ""}`}>
        {value || "-"}
      </div>
    </div>
  )
}

function PriceCell({ label, value, highlight }: { label: string; value: string; highlight?: "emerald" | "amber" | "red" }) {
  const colorMap = {
    emerald: "text-emerald-700",
    amber: "text-amber-700",
    red: "text-red-600",
  }
  return (
    <div className="px-3 py-2">
      <div className="text-[10px] font-medium text-gray-400 uppercase">{label}</div>
      <div className={`text-base font-bold mt-0.5 ${highlight ? colorMap[highlight] : "text-gray-900"}`}>
        {value}
      </div>
    </div>
  )
}
