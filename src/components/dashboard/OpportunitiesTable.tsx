"use client"

import React, { useRef, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Opportunity,
  QUOTATION_PHASE_LABELS,
  PURCHASE_STATUS_LABELS,
} from "@/lib/api"
import { formatCurrency, formatDate, getUrgencyColor } from "@/lib/utils"
import { WorkflowStatus } from "./StatusTabs"
import {
  Eye,
  ExternalLink,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Trash2,
  RotateCcw,
  ArrowRight,
  Gavel,
  Trophy,
  ThumbsDown,
  ShoppingCart,
  FileSpreadsheet,
  Inbox,
  CircleDot,
  Loader2,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OpportunitiesTableProps {
  opportunities: Opportunity[]
  activeTab: WorkflowStatus
  selectedIds: string[]
  actionLoadingId: string | null
  onToggleSelect: (id: string) => void
  onToggleSelectAll: () => void
  onTransition: (id: string, toStatus: string) => void
  onQuotationPhaseChange: (id: string, phase: string) => void
  onOpenModal: (id: string) => void
  loading: boolean
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function OpportunitiesTable({
  opportunities,
  activeTab,
  selectedIds,
  actionLoadingId,
  onToggleSelect,
  onToggleSelectAll,
  onTransition,
  onQuotationPhaseChange,
  onOpenModal,
  loading,
}: OpportunitiesTableProps) {
  const router = useRouter()

  // Dropdown for quotation phase per row
  const [openPhaseDropdownId, setOpenPhaseDropdownId] = useState<string | null>(null)
  const phaseDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (phaseDropdownRef.current && !phaseDropdownRef.current.contains(e.target as Node)) {
        setOpenPhaseDropdownId(null)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const renderUrgencyBadge = (opp: Opportunity) => {
    if (!opp.urgencyLevel) return <span className="text-gray-300">-</span>
    const labels: Record<string, string> = {
      critical: "Critica",
      high: "Alta",
      medium: "Media",
      low: "Baixa",
      expired: "Expirada",
    }
    const icons: Record<string, React.ReactNode> = {
      critical: <AlertTriangle className="w-3 h-3" />,
      high: <AlertTriangle className="w-3 h-3" />,
      medium: <Clock className="w-3 h-3" />,
      low: <CheckCircle2 className="w-3 h-3" />,
      expired: <XCircle className="w-3 h-3" />,
    }
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${getUrgencyColor(opp.urgencyLevel)}`}>
        {icons[opp.urgencyLevel]}
        {labels[opp.urgencyLevel] || opp.urgencyLevel}
      </span>
    )
  }

  const handlePhaseChange = (id: string, phase: string) => {
    setOpenPhaseDropdownId(null)
    onQuotationPhaseChange(id, phase)
  }

  /** Per-tab action buttons for a single row */
  const renderRowActions = (opp: Opportunity) => {
    const isLoading = actionLoadingId === opp.id
    const btnBase = "inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-all disabled:opacity-40"

    if (isLoading) {
      return (
        <div className="flex items-center justify-center">
          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        </div>
      )
    }

    switch (activeTab) {
      case "nao_analisada":
        return (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onTransition(opp.id, "analisada")}
              disabled={isLoading}
              className={`${btnBase} text-white bg-blue-600 hover:bg-blue-700 shadow-sm`}
            >
              <CheckCircle2 className="w-3 h-3" />
              Analisar
            </button>
            <button
              onClick={() => onTransition(opp.id, "descartada")}
              disabled={isLoading}
              className={`${btnBase} text-gray-600 bg-gray-100 hover:bg-gray-200`}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )

      case "analisada":
        return (
          <div className="flex items-center gap-1">
            <button
              onClick={() => router.push(`/rfqs/new?opportunityId=${opp.id}`)}
              disabled={isLoading}
              className={`${btnBase} text-white bg-amber-600 hover:bg-amber-700 shadow-sm`}
              title="Pedir Cotacao (RFQ)"
            >
              <FileSpreadsheet className="w-3 h-3" />
              RFQ
            </button>
            <button
              onClick={() => onTransition(opp.id, "em_cotacao")}
              disabled={isLoading}
              className={`${btnBase} text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200`}
            >
              <ArrowRight className="w-3 h-3" />
              Cotar
            </button>
            <button
              onClick={() => onTransition(opp.id, "descartada")}
              disabled={isLoading}
              className={`${btnBase} text-gray-600 bg-gray-100 hover:bg-gray-200`}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )

      case "em_cotacao":
        return (
          <div className="flex items-center gap-1 relative" ref={openPhaseDropdownId === opp.id ? phaseDropdownRef : undefined}>
            <button
              onClick={() => router.push(`/rfqs/new?opportunityId=${opp.id}`)}
              disabled={isLoading}
              className={`${btnBase} text-white bg-amber-600 hover:bg-amber-700 shadow-sm`}
              title="Pedir Cotacao (RFQ)"
            >
              <FileSpreadsheet className="w-3 h-3" />
              RFQ
            </button>
            <button
              onClick={() => setOpenPhaseDropdownId(openPhaseDropdownId === opp.id ? null : opp.id)}
              disabled={isLoading}
              className={`${btnBase} text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200`}
            >
              <CircleDot className="w-3 h-3" />
              Fase
              <ChevronDown className="w-3 h-3" />
            </button>
            {openPhaseDropdownId === opp.id && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-20 min-w-[160px] py-1 overflow-hidden">
                {Object.entries(QUOTATION_PHASE_LABELS).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => handlePhaseChange(opp.id, key)}
                    className={`flex items-center gap-2 w-full text-left px-3 py-2 text-xs hover:bg-gray-50 transition-colors ${
                      opp.quotationPhase === key ? "bg-amber-50 font-semibold text-amber-700" : "text-gray-700"
                    }`}
                  >
                    {opp.quotationPhase === key && <CheckCircle2 className="w-3 h-3 text-amber-600" />}
                    {label}
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => onTransition(opp.id, "lancada_bid")}
              disabled={isLoading}
              className={`${btnBase} text-white bg-orange-600 hover:bg-orange-700 shadow-sm`}
            >
              <Gavel className="w-3 h-3" />
              BID
            </button>
          </div>
        )

      case "lancada_bid":
        return (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onTransition(opp.id, "vencedora_bid")}
              disabled={isLoading}
              className={`${btnBase} text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm`}
            >
              <Trophy className="w-3 h-3" />
              Won
            </button>
            <button
              onClick={() => onTransition(opp.id, "nao_vencedora")}
              disabled={isLoading}
              className={`${btnBase} text-white bg-red-600 hover:bg-red-700 shadow-sm`}
            >
              <ThumbsDown className="w-3 h-3" />
              Lost
            </button>
          </div>
        )

      case "vencedora_bid":
        return (
          <div className="flex items-center gap-1">
            {opp.purchaseStatus && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                opp.purchaseStatus === "entregue"
                  ? "bg-emerald-50 text-emerald-700"
                  : opp.purchaseStatus === "comprada"
                  ? "bg-blue-50 text-blue-700"
                  : "bg-gray-50 text-gray-600"
              }`}>
                <ShoppingCart className="w-3 h-3" />
                {PURCHASE_STATUS_LABELS[opp.purchaseStatus] || opp.purchaseStatus}
              </span>
            )}
            <button
              onClick={() => router.push(`/opportunities/${opp.id}`)}
              disabled={isLoading}
              className={`${btnBase} text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200`}
            >
              <ExternalLink className="w-3 h-3" />
              Detalhes
            </button>
          </div>
        )

      case "nao_vencedora":
      case "cancelada":
        return (
          <button
            onClick={() => router.push(`/opportunities/${opp.id}`)}
            className={`${btnBase} text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200`}
          >
            <Eye className="w-3 h-3" />
            Ver
          </button>
        )

      case "descartada":
        return (
          <button
            onClick={() => onTransition(opp.id, "nao_analisada")}
            disabled={isLoading}
            className={`${btnBase} text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200`}
          >
            <RotateCcw className="w-3 h-3" />
            Restaurar
          </button>
        )

      default:
        return null
    }
  }

  /** Build table column headers based on active tab */
  const renderTableHeaders = () => {
    const thClass = "px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/80 border-b-2 border-gray-200 border-r border-r-gray-200 whitespace-nowrap"
    const thLast = "px-3 py-2.5 text-center text-[11px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/80 border-b-2 border-gray-200 whitespace-nowrap"

    const checkboxTh = (
      <th className={`${thClass} w-10 text-center`}>
        <input
          type="checkbox"
          checked={selectedIds.length === opportunities.length && opportunities.length > 0}
          onChange={onToggleSelectAll}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
        />
      </th>
    )

    const solicitationTh = <th className={`${thClass} min-w-[160px]`}>Solicitacao</th>
    const siteTh = <th className={`${thClass} min-w-[100px]`}>Site</th>
    const descriptionTh = <th className={`${thClass} min-w-[180px]`}>Descricao</th>
    const nsnTh = <th className={`${thClass} min-w-[130px]`}>NSN</th>
    const cageTh = <th className={`${thClass} min-w-[70px]`}>CAGE</th>
    const leadTimeTh = <th className={`${thClass} min-w-[70px]`}>Lead</th>
    const closingDateTh = <th className={`${thClass} min-w-[110px]`}>Fechamento</th>
    const urgencyTh = <th className={`${thClass} min-w-[90px]`}>Urgencia</th>
    const actionsTh = <th className={`${thLast} min-w-[160px]`}>Acoes</th>

    switch (activeTab) {
      case "analisada":
        return (
          <tr>
            {checkboxTh}
            {solicitationTh}
            {siteTh}
            {descriptionTh}
            {nsnTh}
            <th className={`${thClass} min-w-[100px]`}>Compra</th>
            <th className={`${thClass} min-w-[80px]`}>Margem</th>
            <th className={`${thClass} min-w-[100px]`}>Ofertado</th>
            {closingDateTh}
            {urgencyTh}
            {actionsTh}
          </tr>
        )

      case "em_cotacao":
        return (
          <tr>
            {checkboxTh}
            {solicitationTh}
            {siteTh}
            {descriptionTh}
            {nsnTh}
            <th className={`${thClass} min-w-[110px]`}>Fase</th>
            {closingDateTh}
            {urgencyTh}
            {actionsTh}
          </tr>
        )

      case "vencedora_bid":
        return (
          <tr>
            {checkboxTh}
            {solicitationTh}
            {siteTh}
            {descriptionTh}
            {nsnTh}
            <th className={`${thClass} min-w-[100px]`}>Preco Won</th>
            <th className={`${thClass} min-w-[110px]`}>Compra</th>
            <th className={`${thClass} min-w-[120px]`}>Fornecedor</th>
            <th className={`${thClass} min-w-[100px]`}>Entrega</th>
            {actionsTh}
          </tr>
        )

      case "cancelada":
        return (
          <tr>
            {checkboxTh}
            {solicitationTh}
            {siteTh}
            {descriptionTh}
            {nsnTh}
            {closingDateTh}
            <th className={`${thClass} min-w-[110px]`}>Cancelada Em</th>
            <th className={`${thClass} min-w-[80px]`}>Origem</th>
            {actionsTh}
          </tr>
        )

      default:
        return (
          <tr>
            {checkboxTh}
            {solicitationTh}
            {siteTh}
            {descriptionTh}
            {nsnTh}
            {cageTh}
            {leadTimeTh}
            {closingDateTh}
            {urgencyTh}
            {actionsTh}
          </tr>
        )
    }
  }

  const getColSpan = (): number => {
    switch (activeTab) {
      case "analisada": return 11
      case "em_cotacao": return 9
      case "vencedora_bid": return 10
      case "cancelada": return 9
      default: return 10
    }
  }

  /** Render table row per tab */
  const renderTableRow = (opp: Opportunity, index: number) => {
    const isSelected = selectedIds.includes(opp.id)
    const openModal = () => onOpenModal(opp.id)
    const isEven = index % 2 === 0
    const rowBg = isSelected
      ? "bg-blue-50/70"
      : isEven
      ? "bg-white"
      : "bg-gray-100/60"

    const tdClass = "px-3 py-2 text-[13px] border-b border-gray-200 border-r border-r-gray-200"
    const tdClickable = `${tdClass} cursor-pointer`

    const checkboxTd = (
      <td className={`${tdClass} text-center w-10`} onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(opp.id)}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
        />
      </td>
    )

    const solicitationTd = (
      <td className={`${tdClickable} font-mono text-gray-900 font-medium`} onClick={openModal}>
        {opp.solicitationNumber || "-"}
        {opp.childrenCount > 0 && (
          <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-600">
            {opp.childrenCount} items
          </span>
        )}
      </td>
    )

    const siteTd = (
      <td className={tdClickable} onClick={openModal}>
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600">
          {opp.site || "-"}
        </span>
      </td>
    )

    const descriptionTd = (
      <td className={`${tdClickable} text-gray-700 max-w-[280px] truncate`} onClick={openModal}>
        {opp.description || "-"}
      </td>
    )

    const nsnTd = (
      <td className={`${tdClickable} font-mono text-gray-500 text-xs`} onClick={openModal}>
        {opp.nsn || "-"}
      </td>
    )

    const closingDateTd = (
      <td className={tdClickable} onClick={openModal}>
        <div className="text-gray-700 text-xs">{formatDate(opp.closingDate)}</div>
        {opp.daysUntilClosing !== null && (
          <div className={`text-[11px] ${
            opp.daysUntilClosing <= 0
              ? "text-red-500 font-medium"
              : opp.daysUntilClosing <= 3
              ? "text-orange-500"
              : "text-gray-400"
          }`}>
            {opp.daysUntilClosing > 1
              ? `${opp.daysUntilClosing}d`
              : opp.daysUntilClosing >= 0
              ? "Hoje"
              : "Expirado"}
          </div>
        )}
      </td>
    )

    const urgencyTd = (
      <td className={tdClickable} onClick={openModal}>
        {renderUrgencyBadge(opp)}
      </td>
    )

    const actionsTd = (
      <td className="px-3 py-2 text-[13px] border-b border-gray-200 text-center" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-center gap-1">
          {renderRowActions(opp)}
          <button
            onClick={openModal}
            className="p-1 text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Ver resumo"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => router.push(`/opportunities/${opp.id}`)}
            className="p-1 text-gray-300 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
            title="Abrir detalhes"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    )

    switch (activeTab) {
      case "analisada":
        return (
          <tr key={opp.id} className={`${rowBg} hover:bg-blue-50/40 transition-colors`}>
            {checkboxTd}
            {solicitationTd}
            {siteTd}
            {descriptionTd}
            {nsnTd}
            <td className={`${tdClickable} text-gray-900 font-medium`} onClick={openModal}>
              {formatCurrency(opp.purchasePrice)}
            </td>
            <td className={tdClickable} onClick={openModal}>
              {opp.profitMargin ? (
                <span className={`text-xs font-semibold ${
                  opp.profitMargin >= 20 ? "text-emerald-600" : opp.profitMargin >= 10 ? "text-amber-600" : "text-red-600"
                }`}>
                  {opp.profitMargin}%
                </span>
              ) : (
                <span className="text-gray-300">-</span>
              )}
            </td>
            <td className={`${tdClickable} text-gray-900 font-medium`} onClick={openModal}>
              {formatCurrency(opp.offeredPrice)}
            </td>
            {closingDateTd}
            {urgencyTd}
            {actionsTd}
          </tr>
        )

      case "em_cotacao":
        return (
          <tr key={opp.id} className={`${rowBg} hover:bg-blue-50/40 transition-colors`}>
            {checkboxTd}
            {solicitationTd}
            {siteTd}
            {descriptionTd}
            {nsnTd}
            <td className={tdClickable} onClick={openModal}>
              {opp.quotationPhase ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  <CircleDot className="w-3 h-3" />
                  {QUOTATION_PHASE_LABELS[opp.quotationPhase] || opp.quotationPhase}
                </span>
              ) : (
                <span className="text-gray-300">-</span>
              )}
            </td>
            {closingDateTd}
            {urgencyTd}
            {actionsTd}
          </tr>
        )

      case "vencedora_bid":
        return (
          <tr key={opp.id} className={`${rowBg} hover:bg-blue-50/40 transition-colors`}>
            {checkboxTd}
            {solicitationTd}
            {siteTd}
            {descriptionTd}
            {nsnTd}
            <td className={`${tdClickable} text-emerald-700 font-semibold`} onClick={openModal}>
              {formatCurrency(opp.wonPrice)}
            </td>
            <td className={tdClickable} onClick={openModal}>
              {opp.purchaseStatus ? (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                  opp.purchaseStatus === "entregue"
                    ? "bg-emerald-50 text-emerald-700"
                    : opp.purchaseStatus === "comprada"
                    ? "bg-blue-50 text-blue-700"
                    : "bg-gray-100 text-gray-600"
                }`}>
                  {opp.purchaseStatus === "entregue" && <CheckCircle2 className="w-3 h-3" />}
                  {opp.purchaseStatus === "comprada" && <ShoppingCart className="w-3 h-3" />}
                  {opp.purchaseStatus === "pendente" && <Clock className="w-3 h-3" />}
                  {PURCHASE_STATUS_LABELS[opp.purchaseStatus] || opp.purchaseStatus}
                </span>
              ) : (
                <span className="text-gray-300">-</span>
              )}
            </td>
            <td className={`${tdClickable} text-gray-700 text-xs`} onClick={openModal}>
              {opp.supplierName || <span className="text-gray-300">-</span>}
            </td>
            <td className={`${tdClickable} text-xs`} onClick={openModal}>
              {formatDate(opp.expectedDelivery)}
            </td>
            {actionsTd}
          </tr>
        )

      case "cancelada":
        return (
          <tr key={opp.id} className={`${rowBg} hover:bg-blue-50/40 transition-colors`}>
            {checkboxTd}
            {solicitationTd}
            {siteTd}
            {descriptionTd}
            {nsnTd}
            {closingDateTd}
            <td className={`${tdClickable} text-xs text-gray-500`} onClick={openModal}>
              {formatDate(opp.cancelledAt)}
            </td>
            <td className={tdClickable} onClick={openModal}>
              {opp.cancellationSource ? (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${
                  opp.cancellationSource === "email_auto"
                    ? "bg-orange-50 text-orange-700"
                    : "bg-gray-100 text-gray-600"
                }`}>
                  {opp.cancellationSource === "email_auto" ? "Auto" : "Manual"}
                </span>
              ) : (
                <span className="text-gray-300">-</span>
              )}
            </td>
            {actionsTd}
          </tr>
        )

      default:
        return (
          <tr key={opp.id} className={`${rowBg} hover:bg-blue-50/40 transition-colors`}>
            {checkboxTd}
            {solicitationTd}
            {siteTd}
            {descriptionTd}
            {nsnTd}
            <td className={`${tdClickable} font-mono text-gray-500 text-xs`} onClick={openModal}>
              {(opp as any).scrapedData?.vendorCode || <span className="text-gray-200">-</span>}
            </td>
            <td className={`${tdClickable} text-xs text-gray-500`} onClick={openModal}>
              {(opp as any).scrapedData?.leadTimeDays ? (
                <span className="font-semibold">{(opp as any).scrapedData.leadTimeDays}d</span>
              ) : (
                <span className="text-gray-200">-</span>
              )}
            </td>
            {closingDateTd}
            {urgencyTd}
            {actionsTd}
          </tr>
        )
    }
  }

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto mb-2" />
        <span className="text-sm text-gray-500">Carregando oportunidades...</span>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            {renderTableHeaders()}
          </thead>
          <tbody>
            {opportunities.length === 0 ? (
              <tr>
                <td colSpan={getColSpan()} className="px-4 py-12 text-center">
                  <Inbox className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <span className="text-sm text-gray-400">Nenhuma oportunidade encontrada</span>
                </td>
              </tr>
            ) : (
              opportunities.map((opp, idx) => renderTableRow(opp, idx))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
