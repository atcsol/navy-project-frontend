"use client"

import React from "react"
import { StatusCounts } from "@/lib/api"
import {
  Inbox,
  FileSearch,
  Clock,
  Gavel,
  Trophy,
  ThumbsDown,
  Ban,
  Trash2,
  CalendarX2,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

export type WorkflowStatus =
  | "nao_analisada"
  | "analisada"
  | "em_cotacao"
  | "lancada_bid"
  | "vencedora_bid"
  | "nao_vencedora"
  | "cancelada"
  | "descartada"
  | "expirada"

export const TABS: { key: WorkflowStatus; label: string; icon: React.ReactNode }[] = [
  { key: "nao_analisada", label: "Nao Analisadas", icon: <Inbox className="w-4 h-4" /> },
  { key: "analisada", label: "Analisadas", icon: <FileSearch className="w-4 h-4" /> },
  { key: "em_cotacao", label: "Em Cotacao", icon: <Clock className="w-4 h-4" /> },
  { key: "lancada_bid", label: "Lancada no BID", icon: <Gavel className="w-4 h-4" /> },
  { key: "vencedora_bid", label: "Vencedoras", icon: <Trophy className="w-4 h-4" /> },
  { key: "nao_vencedora", label: "Nao Vencedoras", icon: <ThumbsDown className="w-4 h-4" /> },
  { key: "cancelada", label: "Canceladas", icon: <Ban className="w-4 h-4" /> },
  { key: "descartada", label: "Descartadas", icon: <Trash2 className="w-4 h-4" /> },
  { key: "expirada", label: "Expiradas", icon: <CalendarX2 className="w-4 h-4" /> },
]

export const TAB_STYLES: Record<WorkflowStatus, { bg: string; bgActive: string; text: string; border: string; badge: string; badgeActive: string }> = {
  nao_analisada: {
    bg: "hover:bg-purple-50",
    bgActive: "bg-white",
    text: "text-purple-700",
    border: "border-purple-500",
    badge: "bg-gray-100 text-gray-600",
    badgeActive: "bg-purple-100 text-purple-700",
  },
  analisada: {
    bg: "hover:bg-blue-50",
    bgActive: "bg-white",
    text: "text-blue-700",
    border: "border-blue-500",
    badge: "bg-gray-100 text-gray-600",
    badgeActive: "bg-blue-100 text-blue-700",
  },
  em_cotacao: {
    bg: "hover:bg-amber-50",
    bgActive: "bg-white",
    text: "text-amber-700",
    border: "border-amber-500",
    badge: "bg-gray-100 text-gray-600",
    badgeActive: "bg-amber-100 text-amber-700",
  },
  lancada_bid: {
    bg: "hover:bg-orange-50",
    bgActive: "bg-white",
    text: "text-orange-700",
    border: "border-orange-500",
    badge: "bg-gray-100 text-gray-600",
    badgeActive: "bg-orange-100 text-orange-700",
  },
  vencedora_bid: {
    bg: "hover:bg-emerald-50",
    bgActive: "bg-white",
    text: "text-emerald-700",
    border: "border-emerald-500",
    badge: "bg-gray-100 text-gray-600",
    badgeActive: "bg-emerald-100 text-emerald-700",
  },
  nao_vencedora: {
    bg: "hover:bg-red-50",
    bgActive: "bg-white",
    text: "text-red-700",
    border: "border-red-500",
    badge: "bg-gray-100 text-gray-600",
    badgeActive: "bg-red-100 text-red-700",
  },
  cancelada: {
    bg: "hover:bg-gray-100",
    bgActive: "bg-white",
    text: "text-gray-600",
    border: "border-gray-500",
    badge: "bg-gray-100 text-gray-500",
    badgeActive: "bg-gray-200 text-gray-600",
  },
  descartada: {
    bg: "hover:bg-gray-50",
    bgActive: "bg-white",
    text: "text-gray-500",
    border: "border-gray-400",
    badge: "bg-gray-100 text-gray-400",
    badgeActive: "bg-gray-100 text-gray-500",
  },
  expirada: {
    bg: "hover:bg-rose-50",
    bgActive: "bg-white",
    text: "text-rose-600",
    border: "border-rose-400",
    badge: "bg-gray-100 text-gray-500",
    badgeActive: "bg-rose-100 text-rose-600",
  },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface StatusTabsProps {
  activeTab: WorkflowStatus
  onTabChange: (tab: WorkflowStatus) => void
  statusCounts: StatusCounts | null
}

export default function StatusTabs({ activeTab, onTabChange, statusCounts }: StatusTabsProps) {
  return (
    <div className="mb-5">
      <div className="flex items-end gap-0.5 overflow-x-auto pb-px">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key
          const styles = TAB_STYLES[tab.key]
          const count = statusCounts ? statusCounts[tab.key] : 0

          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`
                relative flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-lg border border-b-0 transition-all whitespace-nowrap
                ${isActive
                  ? `${styles.bgActive} ${styles.text} ${styles.border} border-t-2 shadow-sm z-10 -mb-px`
                  : `bg-gray-50 text-gray-500 border-transparent ${styles.bg} hover:text-gray-700`
                }
              `}
            >
              {tab.icon}
              <span>{tab.label}</span>
              <span
                className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold ${
                  isActive ? styles.badgeActive : styles.badge
                }`}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>
      <div className="border-b border-gray-200" />
    </div>
  )
}
