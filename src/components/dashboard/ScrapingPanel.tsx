"use client"

import React from "react"
import { ScrapingProgress } from "@/lib/api"
import { Button } from "@/components/ui"
import {
  RefreshCw,
  Play,
  Pause,
  Square,
  Trash2,
  AlertTriangle,
  Ban,
  XCircle,
  Clock,
  RotateCcw,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ScrapingPanelProps {
  scrapingProgress: ScrapingProgress | null
  scrapingPolling: boolean
  scrapingLoading: boolean
  onStartScraping: (rescrape?: boolean) => void
  onRetryFailed: () => void
  onRefreshProgress: () => void
  onPauseScraping: () => void
  onResumeScraping: () => void
  onCancelScraping: () => void
  onDrainScraping: () => void
}

export default function ScrapingPanel({
  scrapingProgress,
  scrapingPolling,
  scrapingLoading,
  onStartScraping,
  onRetryFailed,
  onRefreshProgress,
  onPauseScraping,
  onResumeScraping,
  onCancelScraping,
  onDrainScraping,
}: ScrapingPanelProps) {
  const isQueueActive = scrapingProgress && (
    scrapingProgress.queue.waiting > 0 ||
    scrapingProgress.queue.active > 0 ||
    scrapingProgress.queue.delayed > 0
  )
  const isPaused = scrapingProgress?.isPaused ?? false

  return (
    <>
      {/* Active queue panel */}
      {scrapingProgress && (scrapingProgress.pending > 0 || isQueueActive || scrapingPolling || isPaused) && (
        <div className={`bg-white rounded-lg border shadow-sm px-4 py-3 mb-4 ${isPaused ? "border-amber-300" : "border-indigo-200"}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                isPaused ? "bg-amber-500" :
                scrapingProgress.queue.active > 0 ? "bg-emerald-500 animate-pulse" :
                scrapingProgress.queue.waiting > 0 || scrapingProgress.queue.delayed > 0 ? "bg-amber-500 animate-pulse" :
                "bg-gray-400"
              }`} />
              <span className="text-xs font-semibold text-gray-700">
                Fila de Scraping
                {isPaused && <span className="ml-1.5 text-amber-600 font-bold">(PAUSADA)</span>}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {/* Queue control buttons */}
              {(isQueueActive || isPaused) && (
                <>
                  {isPaused ? (
                    <Button
                      size="xs"
                      variant="success"
                      icon={Play}
                      loading={scrapingLoading}
                      onClick={onResumeScraping}
                    >
                      Retomar
                    </Button>
                  ) : (
                    <Button
                      size="xs"
                      variant="secondary"
                      icon={Pause}
                      loading={scrapingLoading}
                      onClick={onPauseScraping}
                    >
                      Pausar
                    </Button>
                  )}
                  <Button
                    size="xs"
                    variant="danger"
                    icon={Square}
                    loading={scrapingLoading}
                    onClick={onCancelScraping}
                  >
                    Cancelar
                  </Button>
                </>
              )}
              <div className="flex items-center gap-2 text-[11px] text-gray-500 ml-1">
                {scrapingProgress.queue.active > 0 && <span>Processando {scrapingProgress.queue.active}</span>}
                {scrapingProgress.queue.waiting > 0 && <span>{scrapingProgress.queue.waiting} na fila</span>}
                <button
                  onClick={() => onRefreshProgress()}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
          {scrapingProgress.total > 0 && (() => {
            const queueActive = scrapingProgress.queue.waiting > 0 || scrapingProgress.queue.active > 0
            // Sempre usar contagens do banco (estáveis) - Bull counters são voláteis
            const processed = scrapingProgress.success + scrapingProgress.failed + scrapingProgress.blocked + scrapingProgress.timeout + scrapingProgress.necoError
            const total = scrapingProgress.total
            const pct = total > 0 ? Math.round((processed / total) * 100) : 0
            return (
              <div>
                <div className="w-full bg-gray-100 rounded-full h-1.5 mb-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-500 ${
                      isPaused
                        ? "bg-gradient-to-r from-amber-400 to-amber-500"
                        : "bg-gradient-to-r from-indigo-500 to-blue-500"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-gray-500">
                  <span>{pct}% ({processed}/{total})</span>
                  <div className="flex gap-2">
                    <span className="text-emerald-600">{scrapingProgress.success} OK</span>
                    {scrapingProgress.failed > 0 && <span className="text-red-500">{scrapingProgress.failed} err</span>}
                    {scrapingProgress.necoError > 0 && <span className="text-orange-500">{scrapingProgress.necoError} neco</span>}
                    {scrapingProgress.blocked > 0 && <span className="text-amber-500">{scrapingProgress.blocked} block</span>}
                    {scrapingProgress.timeout > 0 && <span className="text-amber-500">{scrapingProgress.timeout} timeout</span>}
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* Pending panel */}
      {scrapingProgress && scrapingProgress.pending > 0 && !isQueueActive && !isPaused && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-indigo-500" />
              <span className="text-xs font-medium text-indigo-900">
                {scrapingProgress.pending} aguardando scraping
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                icon={Trash2}
                loading={scrapingLoading}
                onClick={onDrainScraping}
              >
                Limpar Fila
              </Button>
              <Button
                size="sm"
                icon={Play}
                loading={scrapingLoading}
                onClick={() => onStartScraping(false)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Iniciar Scraping
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Errors panel */}
      {scrapingProgress && !isQueueActive && !isPaused && (scrapingProgress.failed > 0 || scrapingProgress.blocked > 0 || scrapingProgress.timeout > 0 || scrapingProgress.necoError > 0) && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <div className="flex items-center gap-3 text-xs">
                <span className="font-semibold text-red-900">Erros de Scraping:</span>
                {scrapingProgress.necoError > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">
                    <Ban className="w-3 h-3" />
                    {scrapingProgress.necoError} NECO erro
                  </span>
                )}
                {scrapingProgress.failed > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
                    <XCircle className="w-3 h-3" />
                    {scrapingProgress.failed} falha
                  </span>
                )}
                {scrapingProgress.timeout > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                    <Clock className="w-3 h-3" />
                    {scrapingProgress.timeout} timeout
                  </span>
                )}
                {scrapingProgress.blocked > 0 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-medium">
                    <Ban className="w-3 h-3" />
                    {scrapingProgress.blocked} bloqueado
                  </span>
                )}
              </div>
            </div>
            <Button
              size="sm"
              variant="danger"
              icon={RotateCcw}
              loading={scrapingLoading}
              onClick={onRetryFailed}
            >
              Tentar Novamente
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
