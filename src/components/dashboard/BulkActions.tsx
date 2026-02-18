"use client"

import React from "react"
import { WorkflowStatus } from "./StatusTabs"
import {
  CheckCircle2,
  Trash2,
  ArrowRight,
  Trophy,
  ThumbsDown,
  RotateCcw,
  XCircle,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface BulkActionsProps {
  selectedIds: string[]
  activeTab: WorkflowStatus
  onBulkTransition: (toStatus: string) => void
  bulkActionLoading: boolean
  onClearSelection: () => void
}

export default function BulkActions({
  selectedIds,
  activeTab,
  onBulkTransition,
  bulkActionLoading,
  onClearSelection,
}: BulkActionsProps) {
  if (selectedIds.length === 0) return null

  const bulkButtons: { label: string; toStatus: string; icon: React.ReactNode; color: string }[] = []

  switch (activeTab) {
    case "nao_analisada":
      bulkButtons.push(
        { label: "Analisar", toStatus: "analisada", icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: "bg-blue-600 hover:bg-blue-700 text-white" },
        { label: "Descartar", toStatus: "descartada", icon: <Trash2 className="w-3.5 h-3.5" />, color: "bg-gray-600 hover:bg-gray-700 text-white" }
      )
      break
    case "analisada":
      bulkButtons.push(
        { label: "Iniciar Cotacao", toStatus: "em_cotacao", icon: <ArrowRight className="w-3.5 h-3.5" />, color: "bg-amber-600 hover:bg-amber-700 text-white" },
        { label: "Descartar", toStatus: "descartada", icon: <Trash2 className="w-3.5 h-3.5" />, color: "bg-gray-600 hover:bg-gray-700 text-white" }
      )
      break
    case "lancada_bid":
      bulkButtons.push(
        { label: "Vencedora", toStatus: "vencedora_bid", icon: <Trophy className="w-3.5 h-3.5" />, color: "bg-emerald-600 hover:bg-emerald-700 text-white" },
        { label: "Nao Vencedora", toStatus: "nao_vencedora", icon: <ThumbsDown className="w-3.5 h-3.5" />, color: "bg-red-600 hover:bg-red-700 text-white" }
      )
      break
    case "descartada":
      bulkButtons.push(
        { label: "Restaurar", toStatus: "nao_analisada", icon: <RotateCcw className="w-3.5 h-3.5" />, color: "bg-purple-600 hover:bg-purple-700 text-white" }
      )
      break
  }

  if (bulkButtons.length === 0) return null

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-blue-900">
          {selectedIds.length} selecionada(s)
        </span>
        <div className="flex gap-2">
          {bulkButtons.map((btn) => (
            <button
              key={btn.toStatus}
              onClick={() => onBulkTransition(btn.toStatus)}
              disabled={bulkActionLoading}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md shadow-sm disabled:opacity-50 transition-colors ${btn.color}`}
            >
              {btn.icon}
              {btn.label}
            </button>
          ))}
          <button
            onClick={onClearSelection}
            disabled={bulkActionLoading}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            <XCircle className="w-3.5 h-3.5" />
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
