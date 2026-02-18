"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { useAuthRedirect } from "@/hooks/useAuthRedirect"
import {
  rfqsApi,
  suppliersApi,
  opportunitiesApi,
  gmailApi,
  Supplier,
  Opportunity,
  RfqEmailTemplate,
  STATUS_LABELS,
  STATUS_COLORS,
} from "@/lib/api"
import {
  PageShell,
  PageHeader,
  ErrorBanner,
  Button,
  Card,
} from "@/components/ui"
import {
  Loader2,
  ArrowLeft,
  ArrowRight,
  Send,
  Save,
  Check,
  Search,
} from "lucide-react"

const STEPS = [
  { num: 1, label: "Origem" },
  { num: 2, label: "Fornecedores" },
  { num: 3, label: "Email" },
  { num: 4, label: "Revisar" },
]

export default function NewRfqPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>}>
      <NewRfqContent />
    </Suspense>
  )
}

function NewRfqContent() {
  const { user, authLoading } = useAuthRedirect()
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedOppId = searchParams.get("opportunityId") || ""

  const [step, setStep] = useState(preselectedOppId ? 2 : 1)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [initialized, setInitialized] = useState(false)

  // Step 1: Source
  const [useOpportunity, setUseOpportunity] = useState(true)
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [selectedOpportunityId, setSelectedOpportunityId] = useState(preselectedOppId)
  const [oppSearch, setOppSearch] = useState("")
  const [loadingOpps, setLoadingOpps] = useState(false)

  // Step 2: Suppliers
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<Set<string>>(new Set())
  const [supplierSearch, setSupplierSearch] = useState("")

  // Step 3: Email
  const [emailTemplates, setEmailTemplates] = useState<RfqEmailTemplate[]>([])
  const [gmailAccounts, setGmailAccounts] = useState<any[]>([])
  const [selectedGmailAccountId, setSelectedGmailAccountId] = useState("")
  const [title, setTitle] = useState("")
  const [emailSubject, setEmailSubject] = useState("")
  const [emailBody, setEmailBody] = useState("")
  const [deadline, setDeadline] = useState("")

  // Load initial data
  useEffect(() => {
    if (!user) return
    const load = async () => {
      try {
        const promises: Promise<any>[] = [
          suppliersApi.list({ isActive: "true" }),
          rfqsApi.emailTemplates.list(),
          gmailApi.accounts(),
        ]
        // If preselected opportunity, fetch it directly
        if (preselectedOppId) {
          promises.push(opportunitiesApi.get(preselectedOppId))
        }
        const results = await Promise.all(promises)
        const [suppRes, templateRes, accountsRes] = results

        setSuppliers(suppRes.data)
        setEmailTemplates(templateRes.data)
        setGmailAccounts(accountsRes.data)
        if (accountsRes.data.length > 0) {
          setSelectedGmailAccountId(accountsRes.data[0].id)
        }
        // Apply default template
        const defaultTemplate = templateRes.data.find((t: RfqEmailTemplate) => t.isDefault)
        if (defaultTemplate) {
          setEmailSubject(defaultTemplate.subject)
          setEmailBody(defaultTemplate.body)
        }
        // If preselected opportunity, add it to the list
        if (preselectedOppId && results[3]) {
          const opp = results[3].data
          setOpportunities([opp])
          setSelectedOpportunityId(opp.id)
          // Auto-fill title from opportunity
          setTitle(`Cotacao - ${opp.solicitationNumber || opp.nsn || ""}`.trim())
        }
        setInitialized(true)
      } catch (err: any) {
        setError(err.response?.data?.message || "Erro ao carregar dados")
        setInitialized(true)
      }
    }
    load()
  }, [user])

  // Search opportunities - only show analyzed/in-quotation ones
  const [oppStatusFilter, setOppStatusFilter] = useState("analisada")
  useEffect(() => {
    if (!user || !useOpportunity) return
    const timer = setTimeout(async () => {
      setLoadingOpps(true)
      try {
        const res = await opportunitiesApi.list({
          status: oppStatusFilter,
          search: oppSearch || undefined,
          limit: 50,
        })
        setOpportunities(res.data.data)
      } catch {
        setOpportunities([])
      } finally {
        setLoadingOpps(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [oppSearch, user, useOpportunity, oppStatusFilter])

  const selectedOpportunity = opportunities.find((o) => o.id === selectedOpportunityId)

  const applyTemplate = (templateId: string) => {
    const template = emailTemplates.find((t) => t.id === templateId)
    if (template) {
      setEmailSubject(template.subject)
      setEmailBody(template.body)
    }
  }

  const filteredSuppliers = suppliers.filter((s) => {
    if (!supplierSearch) return true
    const q = supplierSearch.toLowerCase()
    return (
      s.name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      ((s.tags as string[]) || []).some((t) => t.toLowerCase().includes(q))
    )
  })

  const toggleSupplier = (id: string) => {
    setSelectedSupplierIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const canProceed = () => {
    switch (step) {
      case 1:
        return !useOpportunity || !!selectedOpportunityId
      case 2:
        return selectedSupplierIds.size > 0
      case 3:
        return !!title && !!emailSubject && !!emailBody && !!selectedGmailAccountId
      default:
        return true
    }
  }

  const handleSaveDraft = async () => {
    setSaving(true)
    setError("")
    try {
      const oppData = selectedOpportunity
        ? {
            solicitationNumber: selectedOpportunity.solicitationNumber,
            nsn: selectedOpportunity.nsn,
            partNumber: selectedOpportunity.partNumber,
            description: selectedOpportunity.description,
            quantity: selectedOpportunity.quantity,
          }
        : undefined
      const res = await rfqsApi.create({
        gmailAccountId: selectedGmailAccountId,
        opportunityId: selectedOpportunityId || undefined,
        title,
        emailSubject,
        emailBody,
        supplierIds: Array.from(selectedSupplierIds),
        opportunityData: oppData,
        deadline: deadline || undefined,
      })
      router.push(`/rfqs/${res.data.id}`)
    } catch (err: any) {
      setError(err.response?.data?.message || "Erro ao salvar cotacao")
    } finally {
      setSaving(false)
    }
  }

  const handleSendNow = async () => {
    setSending(true)
    setError("")
    try {
      const oppData = selectedOpportunity
        ? {
            solicitationNumber: selectedOpportunity.solicitationNumber,
            nsn: selectedOpportunity.nsn,
            partNumber: selectedOpportunity.partNumber,
            description: selectedOpportunity.description,
            quantity: selectedOpportunity.quantity,
          }
        : undefined
      const created = await rfqsApi.create({
        gmailAccountId: selectedGmailAccountId,
        opportunityId: selectedOpportunityId || undefined,
        title,
        emailSubject,
        emailBody,
        supplierIds: Array.from(selectedSupplierIds),
        opportunityData: oppData,
        deadline: deadline || undefined,
      })
      await rfqsApi.send(created.data.id)
      router.push(`/rfqs/${created.data.id}`)
    } catch (err: any) {
      setError(err.response?.data?.message || "Erro ao enviar cotacao")
    } finally {
      setSending(false)
    }
  }

  const selectedSuppliers = suppliers.filter((s) => selectedSupplierIds.has(s.id))

  return (
    <PageShell authLoading={authLoading} user={user}>
      <PageHeader title="Nova Cotacao" subtitle="Crie e envie solicitacoes de cotacao">
        <Button
          variant="secondary"
          icon={ArrowLeft}
          onClick={() => router.push("/rfqs")}
        >
          Voltar
        </Button>
      </PageHeader>

      <ErrorBanner message={error} onDismiss={() => setError("")} />

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {STEPS.map((s, i) => (
          <div key={s.num} className="flex items-center gap-2">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md ${
                step === s.num
                  ? "bg-blue-600 text-white"
                  : step > s.num
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {step > s.num ? <Check className="w-4 h-4" /> : <span>{s.num}</span>}
              <span>{s.label}</span>
            </div>
            {i < STEPS.length - 1 && <div className="w-8 h-px bg-gray-300" />}
          </div>
        ))}
      </div>

      <Card padding="md">
        {/* Step 1: Source */}
        {step === 1 && (
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-4">Origem da Cotacao</h3>
            <div className="flex gap-4 mb-4">
              <label className={`flex items-center gap-2 p-3 border-2 rounded-md cursor-pointer transition-colors ${useOpportunity ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:bg-gray-50"}`}>
                <input
                  type="radio"
                  checked={useOpportunity}
                  onChange={() => setUseOpportunity(true)}
                  className="text-blue-600"
                />
                <div>
                  <span className="text-sm font-medium">Vincular a oportunidade</span>
                  <p className="text-xs text-gray-500">Selecione uma oportunidade ja analisada</p>
                </div>
              </label>
              <label className={`flex items-center gap-2 p-3 border-2 rounded-md cursor-pointer transition-colors ${!useOpportunity ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:bg-gray-50"}`}>
                <input
                  type="radio"
                  checked={!useOpportunity}
                  onChange={() => {
                    setUseOpportunity(false)
                    setSelectedOpportunityId("")
                  }}
                  className="text-blue-600"
                />
                <div>
                  <span className="text-sm font-medium">Cotacao avulsa</span>
                  <p className="text-xs text-gray-500">Sem vinculo com oportunidade</p>
                </div>
              </label>
            </div>

            {useOpportunity && (
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex gap-1">
                    {[
                      { value: "analisada", label: "Analisadas" },
                      { value: "em_cotacao", label: "Em Cotacao" },
                      { value: "lancada_no_bid", label: "Lancada no BID" },
                      { value: "vencedora", label: "Vencedoras" },
                    ].map((tab) => (
                      <button
                        key={tab.value}
                        onClick={() => setOppStatusFilter(tab.value)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                          oppStatusFilter === tab.value
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar por solicitation, NSN, descricao..."
                      value={oppSearch}
                      onChange={(e) => setOppSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                {loadingOpps ? (
                  <div className="flex items-center gap-2 text-gray-500 text-sm p-4">
                    <Loader2 className="w-4 h-4 animate-spin" /> Buscando...
                  </div>
                ) : opportunities.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-gray-300 rounded-md">
                    <p className="text-sm text-gray-500">Nenhuma oportunidade encontrada com status &quot;{oppStatusFilter === "analisada" ? "Analisada" : oppStatusFilter === "em_cotacao" ? "Em Cotacao" : oppStatusFilter}&quot;</p>
                    <p className="text-xs text-gray-400 mt-1">Analise oportunidades na tela principal antes de criar cotacoes</p>
                  </div>
                ) : (
                  <div className="max-h-72 overflow-y-auto border rounded-md">
                    <table className="min-w-full">
                      <thead className="sticky top-0">
                        <tr>
                          <th className="w-8 px-2 py-2 bg-gray-50 border-b"></th>
                          <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-500 uppercase bg-gray-50 border-b">Solicitacao</th>
                          <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-500 uppercase bg-gray-50 border-b">NSN</th>
                          <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-500 uppercase bg-gray-50 border-b">Descricao</th>
                          <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-500 uppercase bg-gray-50 border-b">Fechamento</th>
                        </tr>
                      </thead>
                      <tbody>
                        {opportunities.map((opp, idx) => (
                          <tr
                            key={opp.id}
                            onClick={() => setSelectedOpportunityId(opp.id)}
                            className={`cursor-pointer transition-colors ${
                              selectedOpportunityId === opp.id
                                ? "bg-blue-50 ring-1 ring-inset ring-blue-300"
                                : idx % 2 === 0 ? "bg-white hover:bg-gray-50" : "bg-gray-50/50 hover:bg-gray-100"
                            }`}
                          >
                            <td className="px-2 py-2 text-center border-b border-gray-100">
                              <input
                                type="radio"
                                checked={selectedOpportunityId === opp.id}
                                onChange={() => setSelectedOpportunityId(opp.id)}
                                className="text-blue-600"
                              />
                            </td>
                            <td className="px-3 py-2 text-[13px] border-b border-gray-100 font-mono font-medium text-gray-900 whitespace-nowrap">
                              {opp.solicitationNumber || "-"}
                            </td>
                            <td className="px-3 py-2 text-[13px] border-b border-gray-100 font-mono text-gray-600 whitespace-nowrap">
                              {opp.nsn || "-"}
                            </td>
                            <td className="px-3 py-2 text-[13px] border-b border-gray-100 text-gray-600 truncate max-w-xs">
                              {opp.description || opp.site || "-"}
                            </td>
                            <td className="px-3 py-2 text-[13px] border-b border-gray-100 text-gray-500 whitespace-nowrap">
                              {opp.closingDate
                                ? new Date(opp.closingDate).toLocaleDateString("pt-BR", { timeZone: "UTC" })
                                : "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {selectedOpportunity && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm">
                    <div className="font-medium text-blue-900">Selecionada: {selectedOpportunity.solicitationNumber}</div>
                    <div className="text-blue-700 mt-0.5">
                      {[selectedOpportunity.site, selectedOpportunity.nsn, selectedOpportunity.description].filter(Boolean).join(" | ")}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Suppliers */}
        {step === 2 && (
          <div>
            {selectedOpportunity && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md mb-4 text-sm">
                <span className="font-medium text-blue-900">Oportunidade:</span>{" "}
                <span className="text-blue-700">
                  {selectedOpportunity.solicitationNumber || "Sem numero"} - {selectedOpportunity.site || ""} - {selectedOpportunity.description || ""}
                </span>
              </div>
            )}
            <h3 className="text-base font-semibold text-gray-900 mb-1">Selecionar Fornecedores</h3>
            <p className="text-sm text-gray-500 mb-4">
              {selectedSupplierIds.size} fornecedor(es) selecionado(s)
            </p>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar fornecedor..."
                value={supplierSearch}
                onChange={(e) => setSupplierSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="max-h-80 overflow-y-auto border rounded-md">
              {filteredSuppliers.map((s) => (
                <label
                  key={s.id}
                  className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-blue-50 border-b last:border-b-0 ${
                    selectedSupplierIds.has(s.id) ? "bg-blue-50" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedSupplierIds.has(s.id)}
                    onChange={() => toggleSupplier(s.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">{s.name}</div>
                    <div className="text-xs text-gray-500">{s.email}</div>
                  </div>
                  <div className="flex gap-1">
                    {((s.tags as string[]) || []).slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </label>
              ))}
              {filteredSuppliers.length === 0 && (
                <div className="p-4 text-sm text-gray-400 text-center">
                  Nenhum fornecedor encontrado
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Compose Email */}
        {step === 3 && (
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-4">Compor Email</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Titulo da Cotacao *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Cotacao para NSN 5310..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Conta Gmail</label>
                <select
                  value={selectedGmailAccountId}
                  onChange={(e) => setSelectedGmailAccountId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {gmailAccounts.map((a: any) => (
                    <option key={a.id} value={a.id}>{a.email}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Template de Email</label>
                <select
                  onChange={(e) => applyTemplate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  defaultValue=""
                >
                  <option value="" disabled>Selecionar template...</option>
                  {emailTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.isDefault ? "(Padrao)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Assunto *</label>
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Corpo do Email (HTML) *
                </label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  rows={12}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Placeholders: {"{{supplierName}}"}, {"{{solicitationNumber}}"}, {"{{nsn}}"}, {"{{partNumber}}"}, {"{{description}}"}, {"{{quantity}}"}, {"{{deadline}}"}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preview</label>
                <div
                  className="border border-gray-200 rounded-md p-3 bg-white text-sm overflow-auto"
                  style={{ minHeight: "280px" }}
                  dangerouslySetInnerHTML={{ __html: emailBody }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div>
            <h3 className="text-base font-semibold text-gray-900 mb-4">Revisar e Enviar</h3>

            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-md">
                <div className="text-sm font-medium text-gray-900">Titulo: {title}</div>
                {selectedOpportunity && (
                  <div className="text-sm text-gray-600">
                    Oportunidade: {selectedOpportunity.solicitationNumber}
                  </div>
                )}
                <div className="text-sm text-gray-600">Assunto: {emailSubject}</div>
                {deadline && (
                  <div className="text-sm text-gray-600">
                    Deadline: {new Date(deadline).toLocaleDateString("pt-BR")}
                  </div>
                )}
              </div>

              <div>
                <div className="text-sm font-medium text-gray-900 mb-2">
                  Fornecedores ({selectedSuppliers.length})
                </div>
                <div className="border rounded-md">
                  {selectedSuppliers.map((s, idx) => (
                    <div
                      key={s.id}
                      className={`flex items-center gap-3 px-3 py-2 ${
                        idx > 0 ? "border-t" : ""
                      }`}
                    >
                      <div className="text-sm font-medium text-gray-900">{s.name}</div>
                      <div className="text-sm text-gray-500">{s.email}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-700">
                Serao enviados <strong>{selectedSuppliers.length}</strong> email(s) individuais.
                Cada fornecedor recebera um email separado.
              </div>
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex justify-between mt-6 pt-4 border-t border-gray-200">
          <div>
            {step > 1 && (
              <Button
                variant="secondary"
                icon={ArrowLeft}
                onClick={() => setStep((s) => s - 1)}
              >
                Voltar
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {step < 4 ? (
              <Button
                icon={ArrowRight}
                iconPosition="right"
                disabled={!canProceed()}
                onClick={() => setStep((s) => s + 1)}
              >
                Proximo
              </Button>
            ) : (
              <>
                <Button
                  variant="secondary"
                  icon={Save}
                  loading={saving}
                  disabled={sending}
                  onClick={handleSaveDraft}
                >
                  Salvar Rascunho
                </Button>
                <Button
                  variant="success"
                  icon={Send}
                  loading={sending}
                  disabled={saving}
                  onClick={handleSendNow}
                >
                  Enviar Cotacoes
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>
    </PageShell>
  )
}
