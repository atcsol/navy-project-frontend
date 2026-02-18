"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { api } from "@/lib/api"
import { LoadingOverlay } from "@/components/LoadingProgress"
import { ErrorBanner } from "@/components/ui"
import { ArrowLeft, ArrowRight, Check, Loader2, Search, FileText, Mail, Columns3, Settings, ClipboardList } from "lucide-react"
import type { Step, GmailAccount, Email, TabularColumn, EmailAnalysis, TemplateWizardProps } from "./types"

const ALL_SCRAPING_FIELD_VALUES = [
  'nomenclature', 'quantity', 'vendorCode', 'vendorPartNumber', 'nsn',
  'contractType', 'buyerName', 'buyerEmail', 'buyerPhone', 'adminCommunications',
]

const SCRAPING_FIELD_OPTIONS = [
  { value: 'nomenclature', label: 'Nomenclatura' },
  { value: 'quantity', label: 'Quantidade e Unidade' },
  { value: 'vendorCode', label: 'Vendor Code (CAGE)' },
  { value: 'vendorPartNumber', label: 'Part Number (Vendor)' },
  { value: 'nsn', label: 'NSN' },
  { value: 'contractType', label: 'Tipo de Contrato' },
  { value: 'buyerName', label: 'Nome do Comprador' },
  { value: 'buyerEmail', label: 'Email do Comprador' },
  { value: 'buyerPhone', label: 'Telefone do Comprador' },
  { value: 'adminCommunications', label: 'Dados Administrativos (completo)' },
]

export default function TemplateWizard({ mode, templateId, initialData, onSave, saveButtonLabel }: TemplateWizardProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<Step>(1)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")

  // Step 1: Basic Info
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")

  // Step 2: Select Email from Gmail
  const [gmailAccounts, setGmailAccounts] = useState<GmailAccount[]>([])
  const [selectedAccount, setSelectedAccount] = useState<string>("")
  const [emailQuery, setEmailQuery] = useState("")
  const [emails, setEmails] = useState<Email[]>([])
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [loadingEmails, setLoadingEmails] = useState(false)

  // Step 3: Email Analysis
  const [analysis, setAnalysis] = useState<EmailAnalysis | null>(null)
  const [loadingAnalysis, setLoadingAnalysis] = useState(false)
  const [selectedFields, setSelectedFields] = useState<string[]>([])

  // Tabular pattern selection
  const [selectedTabularPattern, setSelectedTabularPattern] = useState<number | null>(null)
  const [tabularColumnNames, setTabularColumnNames] = useState<Record<number, string>>({})
  const [tabularDefaults, setTabularDefaults] = useState<Record<string, string>>({})

  // Multiline mode
  const [isMultilineMode, setIsMultilineMode] = useState(false)
  const [multilineDelimiter, setMultilineDelimiter] = useState("")

  // Step 4: Configure (automatically filled from analysis)
  const [senderEmail, setSenderEmail] = useState("")
  const [subjectFilter, setSubjectFilter] = useState("")

  // Step 5: Preview & Save
  const [isActive, setIsActive] = useState(true)

  // Web Scraping Config
  const [scrapingEnabled, setScrapingEnabled] = useState(false)
  const [scrapingFields, setScrapingFields] = useState<string[]>([])
  const [templateDomains, setTemplateDomains] = useState<{ domain: string; enabled: boolean; reason?: string }[]>([])
  const [newDomainName, setNewDomainName] = useState("")

  // Populate form with initial data (for edit mode)
  useEffect(() => {
    if (initialData) {
      setName(initialData.name)
      setDescription(initialData.description || "")
      setSenderEmail(initialData.senderEmail || "")
      setSubjectFilter(initialData.subjectFilter || "")
      setEmailQuery(initialData.emailQuery || "")
      setIsActive(initialData.isActive)

      // Load web scraping config
      if (initialData.webScrapingConfig) {
        setScrapingEnabled(initialData.webScrapingConfig.isEnabled)
        const rules = initialData.webScrapingConfig.extractionRules
        if (rules?.scrapingFields) {
          setScrapingFields(rules.scrapingFields)
        }
        if (rules?.templateDomains) {
          setTemplateDomains(rules.templateDomains)
        }
      }

      // Load existing fields and mode
      if (initialData.extractionConfig?.mode === 'multiline') {
        setIsMultilineMode(true)
        setMultilineDelimiter(initialData.extractionConfig.itemDelimiter || '')
        if (initialData.extractionConfig.fields) {
          setSelectedFields(initialData.extractionConfig.fields.map((f: any) => f.name))
        }
      } else if (initialData.extractionConfig?.fields) {
        setSelectedFields(initialData.extractionConfig.fields.map((f: any) => f.name))
      }
    }
  }, [initialData])

  // Load Gmail accounts on mount
  useEffect(() => {
    const loadGmailAccounts = async () => {
      try {
        const response = await api.get(`/gmail/accounts`)
        setGmailAccounts(response.data)
        if (response.data.length > 0) {
          setSelectedAccount(response.data[0].id)
        }
      } catch (err) {
        console.error("Error loading Gmail accounts:", err)
      }
    }
    if (user) {
      loadGmailAccounts()
    }
  }, [user])

  const handleSearchEmails = async () => {
    if (!selectedAccount) {
      setError("Selecione uma conta Gmail")
      return
    }

    setLoadingEmails(true)
    setError("")

    try {
      const response = await api.get(
        `/gmail/accounts/${selectedAccount}/emails`,
        {
          params: {
            query: emailQuery || undefined,
            maxResults: 50,
          },
        }
      )
      setEmails(response.data)
    } catch (err: any) {
      setError(err.response?.data?.message || "Erro ao buscar emails")
    } finally {
      setLoadingEmails(false)
    }
  }

  const handleAnalyzeEmail = async (email: Email) => {
    if (!selectedAccount) return

    setSelectedEmail(email)
    setLoadingAnalysis(true)
    setError("")

    // Limpa campos selecionados anteriores para evitar inconsistência
    setSelectedFields([])
    setAnalysis(null)

    try {
      // Timeout de 30 segundos para evitar travamentos
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)

      // Delay mínimo de 500ms para garantir que o usuário veja o loading
      const startTime = Date.now()

      try {
        const response = await api.get(
          `/gmail/accounts/${selectedAccount}/emails/${email.id}/analyze`,
          {
            signal: controller.signal,
          }
        )
        clearTimeout(timeoutId)

        // Garante delay mínimo de 500ms para feedback visual
        const elapsed = Date.now() - startTime
        if (elapsed < 500) {
          await new Promise(resolve => setTimeout(resolve, 500 - elapsed))
        }

        setAnalysis(response.data)

        // Auto-fill sender and subject if empty
        if (!senderEmail) {
          setSenderEmail(response.data.email.from.split("<")[1]?.replace(">", "") || response.data.email.from)
        }
        if (!subjectFilter) {
          setSubjectFilter(response.data.email.subject.split(" ").slice(0, 3).join(" "))
        }

        // Se tem padrões tabulares, auto-seleciona o primeiro
        const tabPatterns = response.data.tabularPatterns || []
        if (tabPatterns.length > 0) {
          setSelectedTabularPattern(0)
          // Auto-preenche nomes das colunas com sugestões
          const names: Record<number, string> = {}
          tabPatterns[0].columns.forEach((col: TabularColumn) => {
            names[col.index] = col.suggestedName
          })
          setTabularColumnNames(names)
          setSelectedFields([]) // Limpa campos Label:Value
        } else {
          setSelectedTabularPattern(null)
          setTabularColumnNames({})
          // Auto-select all Label:Value fields
          setSelectedFields(Object.keys(response.data.extractedFields))

          // Auto-detect multiline mode (multiple solicitations per email)
          const fieldValues = Object.values(response.data.extractedFields) as any[]
          const maxFreq = fieldValues.length > 0 ? Math.max(...fieldValues.map((f: any) => f.frequency || 1)) : 1
          if (maxFreq > 1) {
            setIsMultilineMode(true)
            // Try to suggest delimiter from first field's label
            if (!multilineDelimiter) {
              const firstField = fieldValues[0]
              if (firstField?.label) {
                setMultilineDelimiter(firstField.label + ':')
              }
            }
          } else {
            setIsMultilineMode(false)
            setMultilineDelimiter("")
          }
        }

        // Move to next step
        setCurrentStep(3)
      } catch (abortErr: any) {
        if (abortErr.name === 'AbortError' || abortErr.code === 'ERR_CANCELED') {
          throw new Error("A análise demorou muito (mais de 30s) e foi cancelada. Tente com um email menor.")
        }
        throw abortErr
      }
    } catch (err: any) {
      setError(err.message || err.response?.data?.message || "Erro ao analisar email")
    } finally {
      setLoadingAnalysis(false)
    }
  }

  const toggleField = (fieldName: string) => {
    if (selectedFields.includes(fieldName)) {
      setSelectedFields(selectedFields.filter((f) => f !== fieldName))
    } else {
      setSelectedFields([...selectedFields, fieldName])
    }
  }

  const toggleScrapingField = (field: string) => {
    if (scrapingFields.includes(field)) {
      setScrapingFields(scrapingFields.filter(f => f !== field))
    } else {
      setScrapingFields([...scrapingFields, field])
    }
  }

  const handleToggleDomain = (domain: string) => {
    setTemplateDomains(prev => prev.map(d =>
      d.domain === domain ? { ...d, enabled: !d.enabled } : d
    ))
  }

  const handleAddDomain = () => {
    if (!newDomainName.trim()) return
    const domain = newDomainName.trim().toLowerCase()
    if (templateDomains.some(d => d.domain === domain)) return
    setTemplateDomains(prev => [...prev, { domain, enabled: true }])
    setNewDomainName("")
  }

  const handleRemoveDomain = (domain: string) => {
    setTemplateDomains(prev => prev.filter(d => d.domain !== domain))
  }

  const handleScrapingToggle = (enabled: boolean) => {
    setScrapingEnabled(enabled)
    if (enabled && scrapingFields.length === 0) {
      setScrapingFields([...ALL_SCRAPING_FIELD_VALUES])
    }
  }

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep((currentStep + 1) as Step)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      // Se voltar do step 3 (análise) para o step 2 (lista de emails),
      // limpa a análise para evitar campos fantasmas
      if (currentStep === 3) {
        setSelectedFields([])
        setAnalysis(null)
        setSelectedTabularPattern(null)
        setTabularColumnNames({})
        setTabularDefaults({})
        setIsMultilineMode(false)
        setMultilineDelimiter("")
      }
      setCurrentStep((currentStep - 1) as Step)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError("")

    try {
      let payload: any

      if (selectedTabularPattern !== null && analysis?.tabularPatterns) {
        // MODO TABULAR: gera config para padrão tabular
        const pattern = analysis.tabularPatterns[selectedTabularPattern]

        const columns = pattern.columns.map((col) => ({
          group: col.index + 1, // regex groups are 1-indexed
          name: tabularColumnNames[col.index] || col.suggestedName,
          transform: col.type === "DATE" ? "date" : "trim",
        }))

        const fieldMapping: Record<string, string> = {}
        const fingerprintFields: string[] = []
        columns.forEach((col) => {
          fieldMapping[col.name] = col.name
          // Usa primeiros 2 campos como fingerprint
          if (fingerprintFields.length < 2) {
            fingerprintFields.push(col.name)
          }
        })

        // Adiciona defaults ao fieldMapping
        Object.entries(tabularDefaults).forEach(([key, value]) => {
          if (value.trim()) {
            fieldMapping[key] = key
          }
        })

        payload = {
          name,
          description: description || undefined,
          senderEmail,
          subjectFilter: subjectFilter || undefined,
          emailQuery: emailQuery || undefined,
          extractionConfig: {
            mode: "tabular" as const,
            defaults: Object.fromEntries(
              Object.entries(tabularDefaults).filter(([, v]) => v.trim())
            ),
            dataPatterns: [
              {
                name: name.toLowerCase().replace(/\s+/g, "_"),
                pattern: pattern.suggestedRegex,
                flags: pattern.suggestedFlags,
                columns,
              },
            ],
          },
          outputSchema: {
            fingerprintFields,
            fieldMapping,
          },
          isActive,
          webScrapingConfig: scrapingEnabled ? {
            isEnabled: true,
            urlField: 'sourceUrl',
            scrapingFields,
            templateDomains,
          } : undefined,
        }
      } else if (isMultilineMode && multilineDelimiter) {
        // MODO MULTILINE
        const fields = selectedFields.map((fieldName) => ({
          name: fieldName,
          pattern: analysis?.extractedFields[fieldName]?.pattern || "",
          type: "regex" as const,
          required: fieldName === "solicitationNumber",
        }))

        const fieldMapping: { [key: string]: string } = {}
        selectedFields.forEach((field) => {
          fieldMapping[field] = field
        })

        payload = {
          name,
          description: description || undefined,
          senderEmail,
          subjectFilter: subjectFilter || undefined,
          emailQuery: emailQuery || undefined,
          extractionConfig: {
            mode: "multiline" as const,
            itemDelimiter: multilineDelimiter,
            fields,
          },
          outputSchema: {
            fingerprintFields: selectedFields.slice(0, 3),
            fieldMapping,
          },
          isActive,
          webScrapingConfig: scrapingEnabled ? {
            isEnabled: true,
            urlField: 'sourceUrl',
            scrapingFields,
            templateDomains,
          } : undefined,
        }
      } else {
        // MODO LABEL:VALUE (single)
        const fields = selectedFields.map((fieldName) => ({
          name: fieldName,
          pattern: analysis?.extractedFields[fieldName]?.pattern || "",
          type: "regex" as const,
          required: fieldName === "solicitationNumber",
        }))

        const fieldMapping: { [key: string]: string } = {}
        selectedFields.forEach((field) => {
          fieldMapping[field] = field
        })

        payload = {
          name,
          description: description || undefined,
          senderEmail,
          subjectFilter: subjectFilter || undefined,
          emailQuery: emailQuery || undefined,
          extractionConfig: {
            mode: "single" as const,
            fields,
          },
          outputSchema: {
            fingerprintFields: selectedFields.slice(0, 3),
            fieldMapping,
          },
          isActive,
          webScrapingConfig: scrapingEnabled ? {
            isEnabled: true,
            urlField: 'sourceUrl',
            scrapingFields,
            templateDomains,
          } : undefined,
        }
      }

      await onSave(payload)
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          (mode === "edit" ? "Erro ao atualizar template" : "Erro ao criar template")
      )
    } finally {
      setIsSaving(false)
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return name.trim().length > 0
      case 2:
        if (mode === "edit") {
          return selectedEmail !== null || selectedFields.length > 0 // Allow skip if already has fields
        }
        return selectedEmail !== null
      case 3:
        if (selectedTabularPattern !== null) return true
        if (isMultilineMode) return selectedFields.length > 0 && multilineDelimiter.trim().length > 0
        return selectedFields.length > 0
      case 4:
        return senderEmail.trim().length > 0
      case 5:
        return true
      default:
        return false
    }
  }

  const isEditMode = mode === "edit"

  return (
    <>
      {/* Main Content */}
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Back button */}
        <button
          onClick={() => router.push("/templates")}
          className="mb-6 text-sm text-gray-600 hover:text-gray-900 flex items-center gap-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar para Templates
        </button>

        {/* Progress Steps */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4, 5].map((step) => (
              <div
                key={step}
                className="flex flex-col items-center flex-1 relative"
              >
                {step < 5 && (
                  <div
                    className={`absolute top-5 left-1/2 w-full h-0.5 ${
                      currentStep > step ? "bg-blue-600" : "bg-gray-200"
                    }`}
                  />
                )}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold z-10 ${
                    currentStep >= step
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {currentStep > step ? <Check className="w-4 h-4" /> : step}
                </div>
                <div className="text-xs text-gray-600 mt-2 text-center">
                  {step === 1 && "Info Básica"}
                  {step === 2 && "Email Exemplo"}
                  {step === 3 && "Campos"}
                  {step === 4 && "Configurar"}
                  {step === 5 && "Revisão"}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          {/* Error Message */}
          <ErrorBanner message={error} onDismiss={() => setError("")} />

          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                  <FileText className="w-4.5 h-4.5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Informações Básicas</h2>
                  <p className="text-sm text-gray-500">Defina o nome e descrição do template</p>
                </div>
              </div>

              <div className="bg-gray-50/50 rounded-lg border border-gray-100 p-5 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome do Template *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Template NECO"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400 transition-shadow"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descrição (opcional)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descreva o propósito deste template..."
                    rows={3}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400 transition-shadow"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Select Email from Gmail */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Mail className="w-4.5 h-4.5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Selecionar Email de Exemplo</h2>
                  <p className="text-sm text-gray-500">
                    {isEditMode
                      ? <>Selecione um email para re-analisar e atualizar os campos extraídos{selectedFields.length > 0 && " (Você já tem campos configurados, pode pular esta etapa)"}</>
                      : "Selecione um email para que o sistema analise automaticamente quais campos podem ser extraídos"
                    }
                  </p>
                </div>
              </div>

              <div className="bg-gray-50/50 rounded-lg border border-gray-100 p-5 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Conta Gmail
                  </label>
                  <select
                    value={selectedAccount}
                    onChange={(e) => setSelectedAccount(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white transition-shadow"
                  >
                    {gmailAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.email}
                      </option>
                    ))}
                  </select>
                  {gmailAccounts.length === 0 && (
                    <p className="text-sm text-red-600 mt-1">
                      Você precisa conectar uma conta Gmail primeiro.{" "}
                      <button
                        onClick={() => router.push("/gmail")}
                        className="text-blue-600 hover:underline"
                      >
                        Conectar agora
                      </button>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Filtrar emails (opcional)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={emailQuery}
                      onChange={(e) => setEmailQuery(e.target.value)}
                      placeholder="Ex: from:noreplyneco@us.navy.mil"
                      className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400 transition-shadow"
                    />
                    <button
                      onClick={handleSearchEmails}
                      disabled={!selectedAccount || loadingEmails}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loadingEmails ? <><Loader2 className="w-4 h-4 animate-spin" /> Buscando...</> : <><Search className="w-4 h-4" /> Buscar</>}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Exemplos: from:email@exemplo.com, subject:licitação, after:2025/11/01
                  </p>
                </div>
              </div>

              {/* Email List */}
              {emails.length > 0 && (
                <div className="space-y-2 mt-4">
                  <h3 className="text-sm font-medium text-gray-700">
                    Emails Encontrados ({emails.length})
                  </h3>
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {emails.map((email) => (
                      <div
                        key={email.id}
                        className={`border rounded-lg p-4 shadow-sm hover:shadow-md transition-all cursor-pointer ${
                          selectedEmail?.id === email.id
                            ? "border-blue-500 bg-blue-50"
                            : "border-gray-200 bg-white"
                        }`}
                        onClick={() => handleAnalyzeEmail(email)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">
                              {email.subject}
                            </div>
                            <div className="text-xs text-gray-600 mt-1">
                              De: {email.from}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(email.date).toLocaleString("pt-BR")}
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleAnalyzeEmail(email)
                            }}
                            disabled={loadingAnalysis}
                            className="ml-4 px-3 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                          >
                            {loadingAnalysis && selectedEmail?.id === email.id
                              ? "Analisando..."
                              : "Analisar"}
                          </button>
                        </div>
                        <div className="text-xs text-gray-500 mt-2 line-clamp-2">
                          {email.snippet}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Edit mode: hint about existing fields */}
              {isEditMode && selectedFields.length > 0 && emails.length === 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                  <p className="text-sm text-blue-800">
                    Você já tem {selectedFields.length} campos configurados. Pode pular esta etapa ou buscar um novo email para re-analisar.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Select Fields from Analysis */}
          {currentStep === 3 && (analysis || (isEditMode && selectedFields.length > 0)) && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Columns3 className="w-4.5 h-4.5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Campos Detectados</h2>
                  <p className="text-sm text-gray-500">Configure os campos a serem extraídos de cada email</p>
                </div>
              </div>

              {analysis && (
                <>
                  <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 mb-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">
                      Email Analisado:
                    </h3>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>De: {analysis.email.from}</div>
                      <div>Assunto: {analysis.email.subject}</div>
                      <div>Data: {new Date(analysis.email.date).toLocaleString("pt-BR")}</div>
                    </div>
                  </div>

                  {/* Formato detectado */}
                  {(analysis.tabularPatterns?.length ?? 0) > 0 && (
                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-indigo-700 font-semibold text-sm">Formato Tabular Detectado</span>
                        <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">
                          {analysis.tabularPatterns!.length} {analysis.tabularPatterns!.length === 1 ? 'padrão' : 'padrões'}
                        </span>
                      </div>
                      <p className="text-xs text-indigo-600">
                        {isEditMode
                          ? "Este email contém dados em formato de tabela. Cada linha gera uma oportunidade."
                          : "Este email contém dados em formato de tabela (colunas separadas por espaço). Cada linha da tabela gera uma oportunidade. Selecione o padrão desejado e configure os nomes das colunas abaixo."
                        }
                      </p>
                    </div>
                  )}

                  {/* Multiline detectado */}
                  {isMultilineMode && (analysis.tabularPatterns?.length ?? 0) === 0 && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-purple-700 font-semibold text-sm">Modo Multiline Detectado</span>
                        <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">
                          Múltiplas oportunidades por email
                        </span>
                      </div>
                      <p className="text-xs text-purple-600">
                        Este email contém múltiplas solicitações separadas por um delimitador. Cada bloco gera uma oportunidade.
                      </p>
                    </div>
                  )}

                  {/* Seleção de modo de extração */}
                  {((analysis.tabularPatterns?.length ?? 0) > 0 || isMultilineMode) && Object.keys(analysis.extractedFields).length > 0 && (
                    <div className="flex gap-3 mb-4">
                      {(analysis.tabularPatterns?.length ?? 0) > 0 && (
                        <button
                          onClick={() => {
                            if (selectedTabularPattern === null && analysis.tabularPatterns!.length > 0) {
                              setSelectedTabularPattern(0)
                              const names: Record<number, string> = {}
                              analysis.tabularPatterns![0].columns.forEach((col) => {
                                names[col.index] = col.suggestedName
                              })
                              setTabularColumnNames(names)
                              setSelectedFields([])
                              setIsMultilineMode(false)
                            }
                          }}
                          className={`flex-1 px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                            selectedTabularPattern !== null
                              ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                              : "border-gray-200 text-gray-600 hover:border-gray-300"
                          }`}
                        >
                          <div className="font-semibold">Modo Tabular</div>
                          <div className="text-xs mt-1 opacity-75">Dados em colunas, múltiplas oportunidades por email</div>
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedTabularPattern(null)
                          setTabularColumnNames({})
                          setTabularDefaults({})
                          setIsMultilineMode(true)
                          setSelectedFields(Object.keys(analysis.extractedFields))
                          if (!multilineDelimiter) {
                            const firstField = Object.values(analysis.extractedFields)[0] as any
                            if (firstField?.label) {
                              setMultilineDelimiter(firstField.label + ':')
                            }
                          }
                        }}
                        className={`flex-1 px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                          selectedTabularPattern === null && isMultilineMode
                            ? "border-purple-500 bg-purple-50 text-purple-700"
                            : "border-gray-200 text-gray-600 hover:border-gray-300"
                        }`}
                      >
                        <div className="font-semibold">Modo Multiline</div>
                        <div className="text-xs mt-1 opacity-75">Múltiplas oportunidades separadas por delimitador</div>
                      </button>
                      <button
                        onClick={() => {
                          setSelectedTabularPattern(null)
                          setTabularColumnNames({})
                          setTabularDefaults({})
                          setIsMultilineMode(false)
                          setSelectedFields(Object.keys(analysis.extractedFields))
                        }}
                        className={`flex-1 px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                          selectedTabularPattern === null && !isMultilineMode
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-gray-200 text-gray-600 hover:border-gray-300"
                        }`}
                      >
                        <div className="font-semibold">Modo Label:Value</div>
                        <div className="text-xs mt-1 opacity-75">Campos nomeados, uma oportunidade por email</div>
                      </button>
                    </div>
                  )}

                  {/* MODO TABULAR */}
                  {selectedTabularPattern !== null && analysis.tabularPatterns && analysis.tabularPatterns.length > 0 && (
                    <div className="space-y-4 max-h-[calc(100vh-26rem)] overflow-y-auto pr-1">
                      {/* Seletor de padrão quando há múltiplos */}
                      {analysis.tabularPatterns.length > 1 && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Selecionar Padrão:
                          </label>
                          <div className="space-y-2">
                            {analysis.tabularPatterns.map((pattern, idx) => (
                              <div
                                key={idx}
                                onClick={() => {
                                  setSelectedTabularPattern(idx)
                                  const names: Record<number, string> = {}
                                  pattern.columns.forEach((col) => {
                                    names[col.index] = col.suggestedName
                                  })
                                  setTabularColumnNames(names)
                                }}
                                className={`border rounded-lg p-3 cursor-pointer transition-all ${
                                  selectedTabularPattern === idx
                                    ? "border-indigo-500 bg-indigo-50"
                                    : "border-gray-200 hover:border-gray-300"
                                }`}
                              >
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="radio"
                                      checked={selectedTabularPattern === idx}
                                      onChange={() => {}}
                                      className="text-indigo-600"
                                    />
                                    <span className="text-sm font-medium text-gray-900">
                                      Padrão {idx + 1}: {pattern.columns.length} colunas
                                    </span>
                                  </div>
                                  <span className="text-xs text-gray-500">
                                    {pattern.lineCount} linhas detectadas
                                  </span>
                                </div>
                                <div className="text-xs text-gray-500 mt-1 ml-6">
                                  Tipos: {pattern.columns.map(c => c.type).join(" | ")}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Colunas do padrão selecionado */}
                      {(() => {
                        const pattern = analysis.tabularPatterns![selectedTabularPattern]
                        if (!pattern) return null
                        return (
                          <div className="space-y-4">
                            <div className="flex justify-between items-center">
                              <h3 className="text-sm font-medium text-gray-700">
                                Colunas Detectadas ({pattern.columns.length})
                              </h3>
                              <span className="text-xs text-gray-500">
                                {pattern.lineCount} linhas = {pattern.lineCount} oportunidades
                              </span>
                            </div>

                            {/* Grid de colunas */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {pattern.columns.map((col) => (
                                <div
                                  key={col.index}
                                  className="border border-indigo-200 rounded-lg p-4 bg-white shadow-sm"
                                >
                                  <div className="flex justify-between items-start mb-3">
                                    <span className="text-xs font-medium bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">
                                      Coluna {col.index + 1}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                      Tipo: {col.type}
                                    </span>
                                  </div>

                                  {col.headerLabel && (
                                    <div className="text-xs text-gray-500 mb-2">
                                      {isEditMode ? "Header" : "Header detectado"}: <span className="font-medium">{col.headerLabel}</span>
                                    </div>
                                  )}

                                  <div className="mb-3">
                                    <label className="block text-xs font-medium text-gray-600 mb-1">
                                      Nome do campo:
                                    </label>
                                    <input
                                      type="text"
                                      value={tabularColumnNames[col.index] || col.suggestedName}
                                      onChange={(e) => {
                                        setTabularColumnNames(prev => ({
                                          ...prev,
                                          [col.index]: e.target.value
                                        }))
                                      }}
                                      className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-900"
                                    />
                                  </div>

                                  <div>
                                    <div className="text-xs font-medium text-gray-500 mb-1">Exemplos:</div>
                                    <div className="bg-gray-50 rounded p-2 space-y-0.5">
                                      {col.samples.slice(0, 4).map((sample, sIdx) => (
                                        <div key={sIdx} className="text-xs font-mono text-gray-700 truncate" title={sample}>
                                          {sample}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Valores padrão */}
                            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 shadow-sm">
                              <h4 className="text-sm font-medium text-gray-700 mb-2">
                                Valores Padrão (opcional)
                              </h4>
                              <p className="text-xs text-gray-500 mb-3">
                                {isEditMode
                                  ? <>Campos com valor fixo para todas as oportunidades (ex: site = &quot;DIBBS&quot;)</>
                                  : <>Campos com valor fixo para todas as oportunidades deste template (ex: site = &quot;DIBBS&quot;)</>
                                }
                              </p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {["site", "source"].map((defaultField) => (
                                  <div key={defaultField} className="flex items-center gap-2">
                                    <label className="text-xs font-medium text-gray-600 w-16">{defaultField}:</label>
                                    <input
                                      type="text"
                                      value={tabularDefaults[defaultField] || ""}
                                      onChange={(e) => {
                                        setTabularDefaults(prev => ({
                                          ...prev,
                                          [defaultField]: e.target.value
                                        }))
                                      }}
                                      placeholder={defaultField === "site" ? "Ex: DIBBS" : "Ex: Solmlbsm"}
                                      className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-900 placeholder-gray-400"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Preview de linhas */}
                            <details className="border border-gray-200 rounded-lg shadow-sm">
                              <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-gray-700 hover:bg-gray-50">
                                Ver amostra de dados ({Math.min(5, pattern.sampleLines.length)} linhas)
                              </summary>
                              <div className="px-4 pb-3">
                                <div className="bg-gray-900 rounded-lg p-3 overflow-x-auto">
                                  {pattern.sampleLines.slice(0, 5).map((line, idx) => (
                                    <div key={idx} className="text-xs font-mono text-green-400 whitespace-pre">
                                      {line}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </details>

                            {/* Regex preview */}
                            <details className="border border-gray-200 rounded-lg shadow-sm">
                              <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-gray-700 hover:bg-gray-50">
                                Ver regex de extração
                              </summary>
                              <div className="px-4 pb-3">
                                <div className="bg-gray-100 rounded p-3">
                                  <code className="text-xs text-gray-700 break-all">{pattern.suggestedRegex}</code>
                                  <div className="text-xs text-gray-500 mt-1">Flags: {pattern.suggestedFlags}</div>
                                </div>
                              </div>
                            </details>
                          </div>
                        )
                      })()}
                    </div>
                  )}

                  {/* Delimiter input for multiline mode */}
                  {selectedTabularPattern === null && isMultilineMode && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                      <label className="block text-sm font-medium text-purple-700 mb-2">
                        Delimitador (texto que separa cada oportunidade):
                      </label>
                      <input
                        type="text"
                        value={multilineDelimiter}
                        onChange={(e) => setMultilineDelimiter(e.target.value)}
                        placeholder="Ex: NECO SOLICITATION NUMBER:"
                        className="w-full px-3 py-2 border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 placeholder-gray-400"
                      />
                      <p className="text-xs text-purple-600 mt-1">
                        O sistema divide o email neste texto e processa cada parte como uma oportunidade separada.
                      </p>
                    </div>
                  )}

                  {/* MODO LABEL:VALUE / MULTILINE fields */}
                  {selectedTabularPattern === null && Object.keys(analysis.extractedFields).length > 0 && (
                    <div>
                      <div className="mb-4">
                        <h3 className="text-sm font-medium text-gray-700 mb-2">
                          {analysis.totalFields} campos encontrados. Selecione os que deseja extrair:
                        </h3>
                        {!isEditMode && (
                          <p className="text-xs text-gray-600 mb-3">
                            Os campos estão ordenados por frequência. Campos no topo aparecem em todas ou na maioria das solicitações.
                          </p>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedFields(Object.keys(analysis.extractedFields))}
                            className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                          >
                            Selecionar Todos
                          </button>
                          <button
                            onClick={() => setSelectedFields([])}
                            className="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                          >
                            Limpar Seleção
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3 max-h-[calc(100vh-26rem)] overflow-y-auto pr-1">
                        {Object.entries(analysis.extractedFields).map(([fieldName, data]: [string, any]) => {
                          const estimatedSolicitations = Math.max(...Object.values(analysis.extractedFields).map((f: any) => f.frequency || f.count));
                          const freq = data.frequency || data.count;
                          const coveragePercent = Math.round((freq / estimatedSolicitations) * 100);

                          let category = "";
                          let badgeColor = "";
                          if (coveragePercent >= 80) {
                            category = "Campo Principal";
                            badgeColor = "bg-blue-100 text-blue-800";
                          } else if (coveragePercent >= 40) {
                            category = "Campo Comum";
                            badgeColor = "bg-yellow-100 text-yellow-800";
                          } else {
                            category = "Campo Ocasional";
                            badgeColor = "bg-gray-100 text-gray-800";
                          }

                          return (
                            <div
                              key={fieldName}
                              className={`border rounded-lg p-4 cursor-pointer shadow-sm hover:shadow-md transition-all ${
                                selectedFields.includes(fieldName)
                                  ? "border-blue-500 bg-blue-50"
                                  : "border-gray-200 bg-white"
                              }`}
                              onClick={() => toggleField(fieldName)}
                            >
                              <div className="flex items-start gap-3">
                                <input
                                  type="checkbox"
                                  checked={selectedFields.includes(fieldName)}
                                  onChange={() => toggleField(fieldName)}
                                  className="mt-1"
                                />
                                <div className="flex-1">
                                  <div className="flex justify-between items-start mb-2">
                                    <div>
                                      <div className="font-medium text-gray-900">
                                        {data.label || fieldName}
                                      </div>
                                      <div className="text-xs text-gray-500 mt-0.5">
                                        Campo: {fieldName}
                                      </div>
                                    </div>
                                    <div className="flex gap-2 items-center">
                                      <span className={`text-xs px-2 py-1 rounded-full ${badgeColor}`}>
                                        {category}
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        {freq}x ({coveragePercent}%)
                                      </span>
                                    </div>
                                  </div>
                                  <div className="text-sm text-gray-600 mb-2">
                                    <strong>Valores encontrados:</strong> {data.count} diferentes
                                  </div>
                                  <div className="text-sm bg-blue-50 border border-blue-200 rounded p-2 mb-2">
                                    <div className="font-medium text-blue-900 mb-1">
                                      {isEditMode ? "Exemplos:" : "Exemplos de valores extraídos:"}
                                    </div>
                                    <div className="space-y-1">
                                      {data.samples.slice(0, 3).map((sample: string, idx: number) => (
                                        <div key={idx} className="text-blue-800 text-xs font-mono">
                                          {sample}
                                        </div>
                                      ))}
                                      {data.samples.length > 3 && (
                                        <div className="text-blue-600 text-xs italic">
                                          ... e mais {data.samples.length - 3} valores
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <details className="text-xs">
                                    <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                                      Ver padrão de extração
                                    </summary>
                                    <div className="text-gray-400 font-mono bg-gray-100 p-2 rounded mt-1">
                                      {data.pattern}
                                    </div>
                                  </details>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Edit mode: show existing fields when no analysis */}
              {!analysis && selectedFields.length > 0 && (
                <div className={`rounded-lg border p-4 ${isMultilineMode ? 'bg-purple-50 border-purple-200' : 'bg-gray-50 border-gray-200'}`}>
                  <h3 className={`text-sm font-medium mb-2 ${isMultilineMode ? 'text-purple-700' : 'text-gray-700'}`}>
                    {isMultilineMode ? `Modo Multiline - ${selectedFields.length} campos` : `Campos Atuais (${selectedFields.length}):`}
                  </h3>
                  {isMultilineMode && multilineDelimiter && (
                    <div className="text-sm text-purple-600 mb-2">
                      Delimitador: <code className="bg-purple-100 px-2 py-0.5 rounded">{multilineDelimiter}</code>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {selectedFields.map((field) => (
                      <span
                        key={field}
                        className={`px-3 py-1 rounded-full text-sm ${isMultilineMode ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}
                      >
                        {field}
                      </span>
                    ))}
                  </div>
                  <p className="text-sm text-gray-500 mt-4">
                    Volte ao passo anterior para re-analisar com um novo email e atualizar os campos
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Configure Template */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Settings className="w-4.5 h-4.5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Configurar Template</h2>
                  <p className="text-sm text-gray-500">Defina o remetente, filtros e opções de scraping</p>
                </div>
              </div>

              <div className="bg-gray-50/50 rounded-lg border border-gray-100 p-5 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Remetente (From) *
                  </label>
                  <input
                    type="text"
                    value={senderEmail}
                    onChange={(e) => setSenderEmail(e.target.value)}
                    placeholder="Ex: noreplyneco@us.navy.mil"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400 transition-shadow"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Apenas emails deste remetente serão processados por este template
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Filtro de Assunto (opcional)
                  </label>
                  <input
                    type="text"
                    value={subjectFilter}
                    onChange={(e) => setSubjectFilter(e.target.value)}
                    placeholder="Ex: Daily Procurement Offerings"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400 transition-shadow"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Se preenchido, apenas emails cujo assunto contenha este texto serão processados
                  </p>
                </div>
              </div>

              {/* Campos selecionados (modo tabular ou label:value) */}
              {selectedTabularPattern !== null && analysis?.tabularPatterns ? (
                <div className="bg-indigo-50 rounded-lg border border-indigo-200 p-4">
                  <h3 className="text-sm font-medium text-indigo-700 mb-2">
                    Modo Tabular - Colunas ({analysis.tabularPatterns[selectedTabularPattern]?.columns.length || 0}):
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {analysis.tabularPatterns[selectedTabularPattern]?.columns.map((col) => (
                      <span
                        key={col.index}
                        className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm"
                      >
                        {tabularColumnNames[col.index] || col.suggestedName}
                      </span>
                    ))}
                    {Object.entries(tabularDefaults).filter(([, v]) => v.trim()).map(([key]) => (
                      <span
                        key={key}
                        className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm italic"
                      >
                        {key} (padrão)
                      </span>
                    ))}
                  </div>
                </div>
              ) : isMultilineMode ? (
                <div className="bg-purple-50 rounded-lg border border-purple-200 p-4">
                  <h3 className="text-sm font-medium text-purple-700 mb-2">
                    Modo Multiline - {selectedFields.length} campos
                  </h3>
                  <div className="text-sm text-purple-600 mb-2">
                    Delimitador: <code className="bg-purple-100 px-2 py-0.5 rounded">{multilineDelimiter}</code>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedFields.map((field) => (
                      <span
                        key={field}
                        className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
                      >
                        {field}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    Campos Selecionados ({selectedFields.length}):
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedFields.map((field) => (
                      <span
                        key={field}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                      >
                        {field}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Web Scraping de Links Externos */}
              <div className="border border-gray-200 rounded-lg shadow-sm p-4 mt-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Scraping de Links Externos
                  </h3>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scrapingEnabled}
                      onChange={(e) => handleScrapingToggle(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    <span className="ms-2 text-sm font-medium text-gray-700">
                      {scrapingEnabled ? "Habilitado" : "Desabilitado"}
                    </span>
                  </label>
                </div>

                <p className="text-xs text-gray-500 mb-3">
                  Quando habilitado, o sistema acessa automaticamente os links das oportunidades para extrair dados adicionais (nomenclatura, vendor, quantidade, contato do comprador, etc).
                </p>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                  <p className="text-xs text-amber-800">
                    Apenas os domínios configurados abaixo serão acessados por este template. Adicione o domínio dos links e habilite o acesso.
                  </p>
                </div>

                {scrapingEnabled && (
                  <div className="space-y-4">
                    {/* Campos a extrair */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Campos a extrair do link:
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {SCRAPING_FIELD_OPTIONS.map((opt) => (
                          <label
                            key={opt.value}
                            className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${
                              scrapingFields.includes(opt.value)
                                ? "border-blue-500 bg-blue-50"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={scrapingFields.includes(opt.value)}
                              onChange={() => toggleScrapingField(opt.value)}
                              className="rounded text-blue-600"
                            />
                            <span className="text-sm text-gray-700">{opt.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Domínios deste template */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Domínios de acesso deste template:
                      </label>
                      <div className="space-y-2">
                        {templateDomains.length === 0 && (
                          <p className="text-xs text-gray-500 italic">Nenhum domínio configurado. Adicione o domínio dos links que este template acessa.</p>
                        )}
                        {templateDomains.map((dc) => (
                          <div
                            key={dc.domain}
                            className={`flex items-center justify-between p-3 rounded-lg border shadow-sm transition-all ${
                              dc.enabled ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className={`w-2 h-2 rounded-full ${dc.enabled ? "bg-green-500" : "bg-red-500"}`} />
                              <div>
                                <span className="text-sm font-medium text-gray-900">{dc.domain}</span>
                                {dc.reason && (
                                  <span className="text-xs text-gray-500 ml-2">({dc.reason})</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleToggleDomain(dc.domain)}
                                className={`text-xs px-2 py-1 rounded ${
                                  dc.enabled
                                    ? "bg-red-100 text-red-700 hover:bg-red-200"
                                    : "bg-green-100 text-green-700 hover:bg-green-200"
                                }`}
                              >
                                {dc.enabled ? "Bloquear" : "Permitir"}
                              </button>
                              <button
                                onClick={() => handleRemoveDomain(dc.domain)}
                                className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                              >
                                Remover
                              </button>
                            </div>
                          </div>
                        ))}

                        {/* Adicionar novo domínio */}
                        <div className="flex gap-2 mt-2">
                          <input
                            type="text"
                            value={newDomainName}
                            onChange={(e) => setNewDomainName(e.target.value)}
                            placeholder="Ex: neco.navy.mil"
                            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-400"
                          />
                          <button
                            onClick={handleAddDomain}
                            disabled={!newDomainName.trim()}
                            className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                          >
                            Adicionar
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 5: Review */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                  <ClipboardList className="w-4.5 h-4.5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Revisão Final</h2>
                  <p className="text-sm text-gray-500">
                    {isEditMode
                      ? "Confirme as configurações antes de salvar"
                      : "Confirme as configurações antes de criar o template"
                    }
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    Informações Básicas
                  </h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>
                      <span className="font-medium">Nome:</span> {name}
                    </div>
                    {description && (
                      <div>
                        <span className="font-medium">Descrição:</span>{" "}
                        {description}
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    Configuração de Email
                  </h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>
                      <span className="font-medium">Remetente:</span> {senderEmail}
                    </div>
                    {subjectFilter && (
                      <div>
                        <span className="font-medium">Assunto contém:</span>{" "}
                        {subjectFilter}
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    {selectedTabularPattern !== null ? "Modo de Extração: Tabular" : isMultilineMode ? "Modo de Extração: Multiline" : "Modo de Extração: Label:Value"}
                  </h3>
                  {selectedTabularPattern !== null && analysis?.tabularPatterns ? (
                    <div className="space-y-2">
                      <div className="text-sm text-gray-600">
                        {analysis.tabularPatterns[selectedTabularPattern]?.lineCount || 0} oportunidades por email
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {analysis.tabularPatterns[selectedTabularPattern]?.columns.map((col) => (
                          <span
                            key={col.index}
                            className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm"
                          >
                            {tabularColumnNames[col.index] || col.suggestedName}
                          </span>
                        ))}
                        {Object.entries(tabularDefaults).filter(([, v]) => v.trim()).map(([key, value]) => (
                          <span
                            key={key}
                            className="px-3 py-1 bg-gray-200 text-gray-600 rounded-full text-sm"
                          >
                            {key} = &quot;{value}&quot;
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : isMultilineMode ? (
                    <div>
                      <div className="text-sm text-gray-600 mb-2">
                        Múltiplas oportunidades por email - {selectedFields.length} campos
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        Delimitador: <code className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded">{multilineDelimiter}</code>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selectedFields.map((field) => (
                          <span
                            key={field}
                            className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
                          >
                            {field}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-sm text-gray-600 mb-2">
                        {selectedFields.length} campos selecionados
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selectedFields.map((field) => (
                          <span
                            key={field}
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                          >
                            {field}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {scrapingEnabled && (
                  <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">
                      Scraping de Links
                    </h3>
                    <div className="text-sm text-gray-600 mb-2">
                      Habilitado - {scrapingFields.length} campos selecionados
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {scrapingFields.map((field) => (
                        <span
                          key={field}
                          className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm"
                        >
                          {SCRAPING_FIELD_OPTIONS.find(o => o.value === field)?.label || field}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded"
                  />
                  <label htmlFor="isActive" className="text-sm text-gray-700">
                    {isEditMode ? "Template ativo" : "Ativar template imediatamente"}
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={handleBack}
              disabled={currentStep === 1}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>

            {currentStep < 5 ? (
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Próximo <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={isSaving || !canProceed()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : <><Check className="w-4 h-4" /> {saveButtonLabel}</>}
              </button>
            )}
          </div>
        </div>
      </main>

      {/* Loading Overlay quando estiver analisando email */}
      <LoadingOverlay
        show={loadingAnalysis}
        message="Analisando email..."
        subMessage="Detectando campos automaticamente. Isso pode levar até 30 segundos."
        variant="spinner"
        size="lg"
      />
    </>
  )
}
