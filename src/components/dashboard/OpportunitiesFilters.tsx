"use client"

import React from "react"
import { Template, QUOTATION_PHASE_LABELS } from "@/lib/api"
import { Button } from "@/components/ui"
import { WorkflowStatus } from "./StatusTabs"
import { Search, Filter, Download } from "lucide-react"

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface OpportunitiesFiltersProps {
  siteFilter: string
  onSiteFilterChange: (value: string) => void
  searchFilter: string
  onSearchFilterChange: (value: string) => void
  templateFilter: string
  onTemplateFilterChange: (value: string) => void
  quotationPhaseFilter: string
  onQuotationPhaseFilterChange: (value: string) => void
  templates: Template[]
  total: number
  activeTab: WorkflowStatus
  onExport: () => void
}

export default function OpportunitiesFilters({
  siteFilter,
  onSiteFilterChange,
  searchFilter,
  onSearchFilterChange,
  templateFilter,
  onTemplateFilterChange,
  quotationPhaseFilter,
  onQuotationPhaseFilterChange,
  templates,
  total,
  activeTab,
  onExport,
}: OpportunitiesFiltersProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm px-4 py-3 mb-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-gray-400">
          <Filter className="w-4 h-4" />
        </div>

        <select
          value={templateFilter}
          onChange={(e) => onTemplateFilterChange(e.target.value)}
          className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Todos Templates</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>

        <select
          value={siteFilter}
          onChange={(e) => onSiteFilterChange(e.target.value)}
          className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Todos Sites</option>
          <option value="NECO">NECO</option>
          <option value="SAM.gov">SAM.gov</option>
          <option value="DIBBS">DIBBS</option>
        </select>

        {activeTab === "em_cotacao" && (
          <select
            value={quotationPhaseFilter}
            onChange={(e) => onQuotationPhaseFilterChange(e.target.value)}
            className="px-2.5 py-1.5 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todas Fases</option>
            {Object.entries(QUOTATION_PHASE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        )}

        <div className="relative flex-1 min-w-[200px] max-w-[320px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar NSN, Part Number, Descricao..."
            value={searchFilter}
            onChange={(e) => onSearchFilterChange(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-gray-400">
            {total} resultado{total !== 1 ? "s" : ""}
          </span>
          <Button
            size="sm"
            icon={Download}
            onClick={onExport}
            className="text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100"
          >
            Excel
          </Button>
        </div>
      </div>
    </div>
  )
}
