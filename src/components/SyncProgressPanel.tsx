"use client"

import { SyncJobStatus } from "@/lib/api"

const STEP_LABELS: Record<string, string> = {
  loading_templates: "Carregando templates...",
  searching_emails: "Buscando emails no Gmail...",
  processing_emails: "Processando emails encontrados...",
  updating_sync: "Atualizando data de sincronização...",
  completed: "Sincronização finalizada!",
}

function aggregateOpportunityJobs(jobs: SyncJobStatus["opportunityJobs"]) {
  const completed = jobs.filter((j) => j.state === "completed")
  return {
    completed,
    created: completed.reduce((s, j) => s + (j.result?.created || 0), 0),
    updated: completed.reduce((s, j) => s + (j.result?.updated || 0), 0),
    duplicates: completed.reduce((s, j) => s + (j.result?.duplicates || 0), 0),
    errors: completed.reduce((s, j) => s + (j.result?.errors || 0), 0),
    pending: jobs.filter((j) => j.state === "waiting" || j.state === "active")
      .length,
  }
}

export default function SyncProgressPanel({
  statuses,
  onClose,
  onGoToDashboard,
}: {
  statuses: SyncJobStatus[]
  onClose: () => void
  onGoToDashboard: () => void
}) {
  const allDone = statuses.every(
    (s) =>
      s.state === "completed" || s.state === "failed" || s.state === "not_found"
  )

  const anyRunning = statuses.some((s) =>
    ["waiting", "active", "delayed"].includes(s.state)
  )

  const anyFailed = statuses.some((s) => s.state === "failed")

  let totalEmailsFound = 0
  let totalEnqueued = 0
  let totalCreated = 0
  let totalUpdated = 0
  let totalDuplicates = 0
  let totalOppErrors = 0
  let allErrors: string[] = []
  let totalOppJobs = 0
  let totalOppCompleted = 0
  let totalOppPending = 0
  let currentStep = ""
  let currentTemplate = ""

  for (const status of statuses) {
    const p = status.progress
    if (p) {
      totalEmailsFound += p.emailsFound
      totalEnqueued += p.emailsEnqueued
      allErrors = allErrors.concat(p.errors)
      if (p.currentTemplate && ["waiting", "active", "delayed"].includes(status.state)) {
        currentTemplate = p.currentTemplate
      }
      if (["waiting", "active", "delayed"].includes(status.state)) {
        currentStep = p.step
      }
    }

    const agg = aggregateOpportunityJobs(status.opportunityJobs)
    totalCreated += agg.created
    totalUpdated += agg.updated
    totalDuplicates += agg.duplicates
    totalOppErrors += agg.errors
    totalOppJobs += status.opportunityJobs.length
    totalOppCompleted += agg.completed.length
    totalOppPending += agg.pending
  }

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Progresso da Sincronização
        </h3>
        {!anyRunning && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            &times;
          </button>
        )}
      </div>

      {/* Status badge */}
      <div className="flex items-center gap-2 mb-4">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
            anyRunning
              ? "bg-blue-100 text-blue-700"
              : anyFailed
              ? "bg-red-100 text-red-700"
              : "bg-green-100 text-green-700"
          }`}
        >
          {anyRunning && (
            <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          )}
          {anyRunning
            ? "Em andamento"
            : anyFailed
            ? "Concluído com erros"
            : "Concluído"}
        </span>
        {statuses.length > 1 && (
          <span className="text-xs text-gray-500">
            ({statuses.filter((s) => s.state === "completed").length}/
            {statuses.length} contas)
          </span>
        )}
      </div>

      {/* Current step */}
      {anyRunning && currentStep && (
        <div className="text-sm text-gray-700 font-medium mb-3">
          {STEP_LABELS[currentStep] || currentStep}
          {currentTemplate && (
            <span className="text-gray-500 font-normal">
              {" "}
              - {currentTemplate}
            </span>
          )}
        </div>
      )}

      {/* Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-gray-900">
            {totalEmailsFound}
          </div>
          <div className="text-xs text-gray-500">Emails encontrados</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-blue-600">{totalEnqueued}</div>
          <div className="text-xs text-gray-500">Emails para processar</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-600">
            {totalCreated}
          </div>
          <div className="text-xs text-gray-500">Criadas</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-indigo-600">
            {totalUpdated}
          </div>
          <div className="text-xs text-gray-500">Atualizadas</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-amber-600">
            {totalDuplicates}
          </div>
          <div className="text-xs text-gray-500">Duplicatas</div>
        </div>
      </div>

      {/* Opportunity processing progress */}
      {totalOppJobs > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Processamento de oportunidades</span>
            <span>
              {totalOppCompleted} / {totalOppJobs}
              {totalOppPending > 0 && ` (${totalOppPending} em andamento)`}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${(totalOppCompleted / totalOppJobs) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Errors */}
      {allErrors.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-medium text-red-700 mb-1">
            Erros ({allErrors.length}):
          </div>
          <div className="bg-red-50 rounded-lg p-3 max-h-32 overflow-y-auto">
            {allErrors.map((err, i) => (
              <div key={i} className="text-xs text-red-600 mb-1">
                {err}
              </div>
            ))}
          </div>
        </div>
      )}

      {totalOppErrors > 0 && (
        <div className="text-xs text-red-600 mb-4">
          {totalOppErrors} erro(s) ao processar oportunidades
        </div>
      )}

      {/* Failed reasons */}
      {statuses
        .filter((s) => s.state === "failed" && s.failedReason)
        .map((s, i) => (
          <div key={i} className="bg-red-50 rounded-lg p-3 mb-4">
            <div className="text-sm text-red-700">{s.failedReason}</div>
          </div>
        ))}

      {/* Action buttons */}
      {allDone && (totalCreated > 0 || totalUpdated > 0) && (
        <button
          onClick={onGoToDashboard}
          className="w-full px-4 py-2.5 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
        >
          {totalCreated > 0 && totalUpdated > 0
            ? `Ver ${totalCreated} nova(s) e ${totalUpdated} atualizada(s) no Dashboard`
            : totalCreated > 0
            ? `Ver ${totalCreated} nova(s) oportunidade(s) no Dashboard`
            : `Ver ${totalUpdated} oportunidade(s) atualizada(s) no Dashboard`}
        </button>
      )}

      {allDone && totalCreated === 0 && totalUpdated === 0 && totalEmailsFound === 0 && (
        <div className="text-sm text-gray-500 text-center py-2">
          Nenhum email novo encontrado. Verifique se o template está configurado
          corretamente (sender, subject) e se há uma conta Gmail ativa conectada.
        </div>
      )}

      {allDone && totalCreated === 0 && totalUpdated === 0 && totalEmailsFound > 0 && totalDuplicates > 0 && (
        <div className="text-sm text-gray-500 text-center py-2">
          Todos os emails encontrados já foram processados anteriormente.
        </div>
      )}
    </div>
  )
}
