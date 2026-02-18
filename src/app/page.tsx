"use client"

import { useState } from "react"
import { useAuthRedirect, useOpportunities } from "@/hooks"
import OpportunityModal from "@/components/OpportunityModal"
import AlertsBell from "@/components/AlertsBell"
import Navigation from "@/components/Navigation"
import { StatusTabs, OpportunitiesFilters, ScrapingPanel, BulkActions, OpportunitiesTable, Pagination } from "@/components/dashboard"
import { ErrorBanner } from "@/components/ui"
import {
  Wifi,
  WifiOff,
  Loader2,
} from "lucide-react"

export default function OpportunitiesPage() {
  const { user, authLoading } = useAuthRedirect()

  const hook = useOpportunities({ user })

  // Modal
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string | null>(null)

  // ---------------------------------------------------------------------------
  // Auth guard
  // ---------------------------------------------------------------------------

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Carregando...</span>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-slate-50">
      {/* HEADER */}
      <Navigation
        rightContent={
          <>
            <div className="flex items-center gap-1.5" title={hook.wsConnected ? "Conectado em tempo real" : "Desconectado"}>
              {hook.wsConnected ? (
                <Wifi className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-gray-300" />
              )}
            </div>
            <AlertsBell externalCount={hook.wsAlertCount} />
          </>
        }
      />

      {/* MAIN CONTENT */}
      <main className="w-full px-4 sm:px-6 lg:px-8 py-5">

        {/* WORKFLOW TABS */}
        <StatusTabs
          activeTab={hook.activeTab}
          onTabChange={hook.setActiveTab}
          statusCounts={hook.statusCounts}
        />

        {/* FILTERS BAR */}
        <OpportunitiesFilters
          siteFilter={hook.siteFilter}
          onSiteFilterChange={hook.setSiteFilter}
          searchFilter={hook.searchFilter}
          onSearchFilterChange={hook.setSearchFilter}
          templateFilter={hook.templateFilter}
          onTemplateFilterChange={hook.setTemplateFilter}
          quotationPhaseFilter={hook.quotationPhaseFilter}
          onQuotationPhaseFilterChange={hook.setQuotationPhaseFilter}
          templates={hook.templates}
          total={hook.total}
          activeTab={hook.activeTab}
          onExport={hook.handleExportToExcel}
        />

        {/* SCRAPING PANEL */}
        <ScrapingPanel
          scrapingProgress={hook.scrapingProgress}
          scrapingPolling={hook.scrapingPolling}
          scrapingLoading={hook.scrapingLoading}
          onStartScraping={hook.handleStartScraping}
          onRetryFailed={hook.handleRetryFailed}
          onRefreshProgress={hook.fetchScrapingProgress}
          onPauseScraping={hook.handlePauseScraping}
          onResumeScraping={hook.handleResumeScraping}
          onCancelScraping={hook.handleCancelScraping}
          onDrainScraping={hook.handleDrainScraping}
        />

        {/* ERROR BANNER */}
        <ErrorBanner message={hook.error} onDismiss={() => hook.setError("")} className="mb-4" />

        {/* BULK ACTIONS */}
        <BulkActions
          selectedIds={hook.selectedIds}
          activeTab={hook.activeTab}
          onBulkTransition={hook.handleBulkTransition}
          bulkActionLoading={hook.bulkActionLoading}
          onClearSelection={() => hook.setSelectedIds([])}
        />

        {/* TABLE */}
        <OpportunitiesTable
          opportunities={hook.opportunities}
          activeTab={hook.activeTab}
          selectedIds={hook.selectedIds}
          actionLoadingId={hook.actionLoadingId}
          onToggleSelect={hook.toggleSelect}
          onToggleSelectAll={hook.toggleSelectAll}
          onTransition={hook.handleTransition}
          onQuotationPhaseChange={hook.handleQuotationPhaseChange}
          onOpenModal={(id) => setSelectedOpportunityId(id)}
          loading={hook.loading}
        />

        {/* PAGINATION */}
        {!hook.loading && (
          <Pagination
            page={hook.page}
            totalPages={hook.totalPages}
            onPageChange={hook.setPage}
          />
        )}
      </main>

      {/* MODAL */}
      {selectedOpportunityId && (
        <OpportunityModal
          opportunityId={selectedOpportunityId}
          onClose={() => setSelectedOpportunityId(null)}
          onUpdated={hook.refreshOpportunities}
        />
      )}
    </div>
  )
}
