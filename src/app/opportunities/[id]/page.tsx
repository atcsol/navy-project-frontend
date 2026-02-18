"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuthRedirect } from "@/hooks/useAuthRedirect"
import { opportunitiesApi, Opportunity, api } from "@/lib/api"
import { formatCurrency, formatDate, getUrgencyColor } from "@/lib/utils"
import { PageShell, ErrorBanner, LoadingCard, Button, Card, Badge } from "@/components/ui"
import {
  ArrowLeft,
  Pencil,
  Trash2,
  Save,
  X,
  Play,
  ChevronDown,
  ChevronUp,
  Info,
  Calendar,
  DollarSign,
  Phone,
  Globe,
  FileText,
  ClipboardList,
  Link as LinkIcon,
} from "lucide-react"
import ScrapedDataTabs from "@/components/ScrapedDataTabs"

export default function OpportunityDetailsPage() {
  const { user, authLoading } = useAuthRedirect()
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [opportunity, setOpportunity] = useState<Opportunity | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isScraping, setIsScraping] = useState(false)
  const [scrapedDataOpen, setScrapedDataOpen] = useState(true)
  const [children, setChildren] = useState<Opportunity[]>([])
  const [childrenLoading, setChildrenLoading] = useState(false)
  const [queueLogs, setQueueLogs] = useState<any[]>([])
  const [logsOpen, setLogsOpen] = useState(false)
  const [loadingLogs, setLoadingLogs] = useState(false)

  // Form state for editing
  const [formData, setFormData] = useState({
    purchasePrice: 0,
    profitMargin: 0,
    offeredPrice: 0,
    status: "open" as string,
  })

  // Fetch opportunity details
  useEffect(() => {
    if (!user || !id) return

    const fetchOpportunity = async () => {
      try {
        setLoading(true)
        setError("")

        const response = await opportunitiesApi.get(id)
        setOpportunity(response.data)

        // Fetch children if parent has them
        if (response.data.childrenCount > 0) {
          setChildrenLoading(true)
          try {
            const childRes = await opportunitiesApi.getChildren(id)
            setChildren(childRes.data)
          } catch {}
          finally { setChildrenLoading(false) }
        }

        // Initialize form data
        setFormData({
          purchasePrice: response.data.purchasePrice || 0,
          profitMargin: response.data.profitMargin || 0,
          offeredPrice: response.data.offeredPrice || 0,
          status: response.data.status,
        })
      } catch (err: any) {
        setError(err.response?.data?.message || "Erro ao carregar oportunidade")
      } finally {
        setLoading(false)
      }
    }

    fetchOpportunity()
  }, [user, id])

  // Calculate profit amount when purchase price or offered price changes
  const calculateProfitAmount = (purchase: number, offered: number) => {
    return offered - purchase
  }

  // Calculate profit margin when purchase price or offered price changes
  const calculateProfitMargin = (purchase: number, offered: number) => {
    if (purchase === 0) return 0
    return ((offered - purchase) / purchase) * 100
  }

  // Calculate offered price when purchase price or margin changes
  const calculateOfferedPrice = (purchase: number, margin: number) => {
    return purchase * (1 + margin / 100)
  }

  const handlePurchasePriceChange = (value: number) => {
    const offeredPrice = calculateOfferedPrice(value, formData.profitMargin)
    setFormData({
      ...formData,
      purchasePrice: value,
      offeredPrice,
    })
  }

  const handleProfitMarginChange = (value: number) => {
    const offeredPrice = calculateOfferedPrice(formData.purchasePrice, value)
    setFormData({
      ...formData,
      profitMargin: value,
      offeredPrice,
    })
  }

  const handleOfferedPriceChange = (value: number) => {
    const profitMargin = calculateProfitMargin(formData.purchasePrice, value)
    setFormData({
      ...formData,
      offeredPrice: value,
      profitMargin,
    })
  }

  const handleSave = async () => {
    if (!opportunity) return

    setIsSaving(true)
    try {
      const profitAmount = calculateProfitAmount(
        formData.purchasePrice,
        formData.offeredPrice
      )

      await opportunitiesApi.update(id, {
        purchasePrice: formData.purchasePrice,
        profitMargin: formData.profitMargin,
        offeredPrice: formData.offeredPrice,
        profitAmount,
        status: formData.status,
      })

      // Refresh opportunity data
      const response = await opportunitiesApi.get(id)
      setOpportunity(response.data)
      setIsEditing(false)
    } catch (err: any) {
      setError(err.response?.data?.message || "Erro ao salvar alterações")
    } finally {
      setIsSaving(false)
    }
  }

  const handleManualScrape = async () => {
    if (!opportunity) return
    setIsScraping(true)
    try {
      await api.post(`/scraping/opportunities/${id}`)
      // Refresh opportunity data
      const refreshed = await opportunitiesApi.get(id)
      setOpportunity(refreshed.data)
    } catch (err: any) {
      setError(err.response?.data?.message || "Erro ao executar scraping")
    } finally {
      setIsScraping(false)
    }
  }

  const handleLoadLogs = async () => {
    setLoadingLogs(true)
    try {
      const response = await api.get('/queues/logs?limit=100')
      setQueueLogs(response.data)
      setLogsOpen(true)
    } catch (err: any) {
      console.error("Error loading logs:", err)
    } finally {
      setLoadingLogs(false)
    }
  }

  const handleDelete = async () => {
    if (!opportunity) return
    if (!confirm("Tem certeza que deseja excluir esta oportunidade?")) return

    try {
      await opportunitiesApi.delete(id)
      router.push("/")
    } catch (err: any) {
      setError(err.response?.data?.message || "Erro ao excluir oportunidade")
    }
  }

  if (loading) {
    return (
      <PageShell authLoading={authLoading} user={user}>
        <LoadingCard message="Carregando oportunidade..." />
      </PageShell>
    )
  }

  if (error && !opportunity) {
    return (
      <PageShell authLoading={authLoading} user={user}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-8">
          <div className="text-red-800">
            {error || "Oportunidade não encontrada"}
          </div>
          <Button
            onClick={() => router.push("/")}
            icon={ArrowLeft}
            className="mt-4"
          >
            Voltar para lista
          </Button>
        </div>
      </PageShell>
    )
  }

  if (!opportunity) return null

  const profitAmount = calculateProfitAmount(
    formData.purchasePrice,
    formData.offeredPrice
  )

  return (
    <PageShell authLoading={authLoading} user={user}>
      {/* Back button */}
      <Button
        variant="ghost"
        icon={ArrowLeft}
        size="sm"
        className="mb-6"
        onClick={() => router.push("/")}
      >
        Voltar para lista
      </Button>

      <ErrorBanner message={error} onDismiss={() => setError("")} />

      {/* Header Section */}
      <Card padding="md" className="mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {opportunity.solicitationNumber || "Sem número"}
            </h2>
            <div className="flex items-center gap-4">
              <Badge
                size="md"
                variant={
                  opportunity.status === "open"
                    ? "info"
                    : opportunity.status === "won"
                    ? "success"
                    : opportunity.status === "lost"
                    ? "danger"
                    : "default"
                }
              >
                {opportunity.status === "open" && "Aberta"}
                {opportunity.status === "won" && "Ganha"}
                {opportunity.status === "lost" && "Perdida"}
                {opportunity.status === "discarded" && "Descartada"}
              </Badge>
              {opportunity.urgencyLevel && (
                <span
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getUrgencyColor(
                    opportunity.urgencyLevel
                  )}`}
                >
                  {opportunity.urgencyLevel === "critical" && "Crítica"}
                  {opportunity.urgencyLevel === "high" && "Alta"}
                  {opportunity.urgencyLevel === "medium" && "Média"}
                  {opportunity.urgencyLevel === "low" && "Baixa"}
                  {opportunity.urgencyLevel === "expired" && "Expirada"}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {!isEditing ? (
              <>
                <Button
                  onClick={() => setIsEditing(true)}
                  icon={Pencil}
                >
                  Editar
                </Button>
                <Button
                  variant="danger"
                  onClick={handleDelete}
                  icon={Trash2}
                >
                  Excluir
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="success"
                  onClick={handleSave}
                  loading={isSaving}
                  icon={Save}
                >
                  {isSaving ? "Salvando..." : "Salvar"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setIsEditing(false)
                    setFormData({
                      purchasePrice: opportunity.purchasePrice || 0,
                      profitMargin: opportunity.profitMargin || 0,
                      offeredPrice: opportunity.offeredPrice || 0,
                      status: opportunity.status,
                    })
                    setError("")
                  }}
                  disabled={isSaving}
                  icon={X}
                >
                  Cancelar
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Basic Information */}
        <Card padding="md">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Info className="w-5 h-5 text-gray-400" />
            Informações Básicas
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-500">
                Site
              </label>
              <div className="text-gray-900">{opportunity.site || "-"}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">
                NSN
              </label>
              <div className="text-gray-900">{opportunity.nsn || "-"}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">
                Part Number
              </label>
              <div className="text-gray-900">
                {opportunity.partNumber || "-"}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">
                Descrição
              </label>
              <div className="text-gray-900">
                {opportunity.description || "-"}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">
                Quantidade
              </label>
              <div className="text-gray-900">
                {opportunity.quantity || "-"}
              </div>
            </div>
          </div>
        </Card>

        {/* Dates */}
        <Card padding="md">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            Datas
          </h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-500">
                Data de Abertura
              </label>
              <div className="text-gray-900">
                {formatDate(opportunity.postedDate)}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">
                Data de Fechamento
              </label>
              <div className="text-gray-900">
                {formatDate(opportunity.closingDate)}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">
                Dias até Fechamento
              </label>
              <div
                className={`font-medium ${
                  (opportunity.daysUntilClosing || 0) <= 0
                    ? "text-red-600"
                    : (opportunity.daysUntilClosing || 0) <= 3
                    ? "text-orange-600"
                    : "text-green-600"
                }`}
              >
                {opportunity.daysUntilClosing !== null
                  ? opportunity.daysUntilClosing > 0
                    ? `${opportunity.daysUntilClosing} dias`
                    : "Expirado"
                  : "-"}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Pricing Section */}
      <Card padding="md" className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-gray-400" />
          Precificação
        </h3>

        {/* Parent with children: show consolidated totals */}
        {opportunity.childrenCount > 0 && children.length > 0 ? (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Total de Compra
                </label>
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(
                    children.reduce((sum, c) => sum + (c.purchasePrice || 0) * (c.quantity || 1), 0)
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Total Ofertado
                </label>
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(
                    children.reduce((sum, c) => sum + (c.offeredPrice || 0) * (c.quantity || 1), 0)
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Lucro Total
                </label>
                <div
                  className={`text-2xl font-bold ${
                    children.reduce((sum, c) => sum + (c.profitAmount || 0) * (c.quantity || 1), 0) > 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {formatCurrency(
                    children.reduce((sum, c) => sum + (c.profitAmount || 0) * (c.quantity || 1), 0)
                  )}
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              Valores consolidados dos {children.length} line items. Edite os preços em cada item individualmente.
            </p>
          </div>
        ) : isEditing ? (
          <div className="space-y-4">
            {opportunity.quantity != null && opportunity.quantity > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-600">
                Quantidade: <span className="font-semibold text-gray-900">{opportunity.quantity}</span>
                {opportunity.unit && <span className="ml-1">({opportunity.unit})</span>}
                <span className="ml-2 text-gray-400">— preços abaixo são por unidade</span>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {opportunity.parentOpportunityId ? "Preço Unit. de Compra" : "Preço de Compra"}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.purchasePrice}
                  onChange={(e) =>
                    handlePurchasePriceChange(parseFloat(e.target.value) || 0)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Margem de Lucro (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.profitMargin}
                  onChange={(e) =>
                    handleProfitMarginChange(parseFloat(e.target.value) || 0)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {opportunity.parentOpportunityId ? "Preço Unit. Ofertado" : "Preço Ofertado"}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.offeredPrice}
                  onChange={(e) =>
                    handleOfferedPriceChange(parseFloat(e.target.value) || 0)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lucro Estimado {opportunity.quantity && opportunity.quantity > 1 ? "(unitário)" : ""}
                </label>
                <div
                  className={`text-2xl font-bold ${
                    profitAmount > 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {formatCurrency(profitAmount)}
                </div>
                {opportunity.quantity != null && opportunity.quantity > 1 && (
                  <div className="text-sm text-gray-500 mt-1">
                    Total: {formatCurrency(formData.offeredPrice * opportunity.quantity)}
                    <span className="text-xs text-gray-400 ml-1">
                      ({formatCurrency(formData.offeredPrice)} × {opportunity.quantity})
                    </span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      status: e.target.value as any,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="open">Aberta</option>
                  <option value="won">Ganha</option>
                  <option value="lost">Perdida</option>
                  <option value="discarded">Descartada</option>
                </select>
              </div>
            </div>
          </div>
        ) : (
          <div>
            {opportunity.quantity != null && opportunity.quantity > 0 && opportunity.parentOpportunityId && (
              <div className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-600 mb-4">
                Quantidade: <span className="font-semibold text-gray-900">{opportunity.quantity}</span>
                {opportunity.unit && <span className="ml-1">({opportunity.unit})</span>}
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  {opportunity.parentOpportunityId ? "Preço Unit. de Compra" : "Preço de Compra"}
                </label>
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(opportunity.purchasePrice)}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Margem de Lucro
                </label>
                <div className="text-2xl font-bold text-gray-900">
                  {opportunity.profitMargin
                    ? `${Number(opportunity.profitMargin).toFixed(2)}%`
                    : "-"}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  {opportunity.parentOpportunityId ? "Preço Unit. Ofertado" : "Preço Ofertado"}
                </label>
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(opportunity.offeredPrice)}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Lucro Estimado
                </label>
                <div
                  className={`text-2xl font-bold ${
                    (opportunity.profitAmount || 0) > 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {formatCurrency(opportunity.profitAmount || 0)}
                </div>
              </div>
            </div>
            {opportunity.quantity != null && opportunity.quantity > 1 && opportunity.offeredPrice != null && opportunity.offeredPrice > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-6">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Preço Total</label>
                    <div className="text-xl font-bold text-gray-900">
                      {formatCurrency(opportunity.offeredPrice * opportunity.quantity)}
                    </div>
                    <div className="text-xs text-gray-400">
                      {formatCurrency(opportunity.offeredPrice)} × {opportunity.quantity}
                    </div>
                  </div>
                  {opportunity.profitAmount != null && opportunity.profitAmount !== 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Lucro Total</label>
                      <div className={`text-xl font-bold ${opportunity.profitAmount > 0 ? "text-green-600" : "text-red-600"}`}>
                        {formatCurrency(opportunity.profitAmount * opportunity.quantity)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Contact Information */}
      {(opportunity.contactName ||
        opportunity.contactEmail ||
        opportunity.contactPhone) && (
        <Card padding="md" className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Phone className="w-5 h-5 text-gray-400" />
            Informações de Contato
          </h3>
          <div className="space-y-3">
            {opportunity.contactName && (
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Nome
                </label>
                <div className="text-gray-900">
                  {opportunity.contactName}
                </div>
              </div>
            )}
            {opportunity.contactEmail && (
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Email
                </label>
                <div className="text-gray-900">
                  <a
                    href={`mailto:${opportunity.contactEmail}`}
                    className="text-blue-600 hover:underline"
                  >
                    {opportunity.contactEmail}
                  </a>
                </div>
              </div>
            )}
            {opportunity.contactPhone && (
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Telefone
                </label>
                <div className="text-gray-900">
                  {opportunity.contactPhone}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Scraped Data Section */}
      <Card padding="md" className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Globe className="w-5 h-5 text-gray-400" />
            Dados do Link Externo
          </h3>
          <div className="flex items-center gap-3">
            {opportunity.scrapingStatus && (
              <Badge
                size="sm"
                variant={
                  opportunity.scrapingStatus === "success"
                    ? "success"
                    : opportunity.scrapingStatus === "pending"
                    ? "warning"
                    : opportunity.scrapingStatus === "blocked" || opportunity.scrapingStatus === "failed"
                    ? "danger"
                    : "default"
                }
              >
                {opportunity.scrapingStatus === "success" && "Scraping OK"}
                {opportunity.scrapingStatus === "pending" && "Pendente"}
                {opportunity.scrapingStatus === "blocked" && "Bloqueado"}
                {opportunity.scrapingStatus === "failed" && "Falhou"}
                {opportunity.scrapingStatus === "timeout" && "Timeout"}
                {opportunity.scrapingStatus === "requires_auth" && "Requer Auth"}
                {opportunity.scrapingStatus === "disabled" && "Desabilitado"}
                {!["success", "pending", "blocked", "failed", "timeout", "requires_auth", "disabled"].includes(opportunity.scrapingStatus || "") && opportunity.scrapingStatus}
              </Badge>
            )}
            {!opportunity.scrapingStatus && (
              <Badge size="sm" variant="default">
                Nunca executado
              </Badge>
            )}
            <Button
              size="sm"
              onClick={handleManualScrape}
              disabled={!opportunity.sourceUrl}
              loading={isScraping}
              icon={isScraping ? undefined : Play}
            >
              {isScraping ? "Scraping..." : "Executar Scraping"}
            </Button>
          </div>
        </div>

        {opportunity.scrapingError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-xs text-red-700">{opportunity.scrapingError}</p>
          </div>
        )}

        {opportunity.scrapedData ? (
          <div>
            <button
              onClick={() => setScrapedDataOpen(!scrapedDataOpen)}
              className="w-full text-left flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
            >
              <span className="text-sm font-medium text-green-800">
                Dados extraidos disponiveis
                {opportunity.scrapedData.totalLineItems > 0 && (
                  <span className="text-xs text-green-600 ml-2">
                    ({opportunity.scrapedData.totalLineItems} line items, {opportunity.scrapedData.totalSubLineItems || 0} sub-items)
                  </span>
                )}
                {opportunity.scrapedAt && (
                  <span className="text-xs text-green-600 ml-2">
                    - {new Date(opportunity.scrapedAt).toLocaleString("pt-BR")}
                  </span>
                )}
              </span>
              <span className="text-green-600">
                {scrapedDataOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </span>
            </button>

            {scrapedDataOpen && <ScrapedDataTabs scrapedData={opportunity.scrapedData} />}

            {/* Fallback for non-NECO data */}
            {scrapedDataOpen && !opportunity.scrapedData.neco && !opportunity.scrapedData.lineItems && (
              <div className="mt-3">
                <details className="border border-gray-200 rounded-lg" open>
                  <summary className="px-4 py-3 cursor-pointer text-sm font-medium text-gray-700 hover:bg-gray-50">
                    Dados brutos
                  </summary>
                  <div className="px-4 pb-3">
                    <pre className="bg-gray-900 text-green-400 p-3 rounded-lg text-xs overflow-x-auto max-h-64 overflow-y-auto">
                      {JSON.stringify(opportunity.scrapedData, null, 2)}
                    </pre>
                  </div>
                </details>
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-gray-500">
            {opportunity.sourceUrl
              ? "Nenhum dado scrapeado ainda. Clique em \"Executar Scraping\" para buscar dados do link."
              : "Esta oportunidade nao possui link externo (sourceUrl)."}
          </div>
        )}
      </Card>

      {/* Children Section (multi-line items) */}
      {opportunity.childrenCount > 0 && (
        <Card padding="md" className="mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-3">
            Line Items ({opportunity.childrenCount})
          </h2>
          {childrenLoading ? (
            <div className="animate-pulse space-y-2">
              {[...Array(3)].map((_, i) => <div key={i} className="h-8 bg-gray-100 rounded" />)}
            </div>
          ) : children.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum item encontrado</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-medium text-gray-500 uppercase border-b border-gray-100">
                    <th className="pb-2 pr-3">NSN</th>
                    <th className="pb-2 pr-3">Part Number</th>
                    <th className="pb-2 pr-3">CAGE</th>
                    <th className="pb-2 pr-3">Descricao</th>
                    <th className="pb-2 pr-3 text-right">Qty</th>
                    <th className="pb-2 pr-3">Unit</th>
                    <th className="pb-2 pr-3 text-right">Preço Unit.</th>
                    <th className="pb-2 pr-3 text-right">Ofertado</th>
                    <th className="pb-2 pr-3 text-right">Total</th>
                    <th className="pb-2 pr-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {children.map((child) => (
                    <tr
                      key={child.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => router.push(`/opportunities/${child.id}`)}
                    >
                      <td className="py-2 pr-3 font-mono text-xs">{child.nsn || "-"}</td>
                      <td className="py-2 pr-3 font-mono text-xs">{child.partNumber || "-"}</td>
                      <td className="py-2 pr-3 font-mono text-xs">{child.manufacturer || "-"}</td>
                      <td className="py-2 pr-3 text-xs text-gray-700 max-w-[200px] truncate">{child.description || "-"}</td>
                      <td className="py-2 pr-3 text-xs text-right font-medium">{child.quantity ?? "-"}</td>
                      <td className="py-2 pr-3 text-xs text-gray-500">{child.unit || "-"}</td>
                      <td className="py-2 pr-3 text-xs text-right font-medium">{child.purchasePrice ? formatCurrency(child.purchasePrice) : "-"}</td>
                      <td className="py-2 pr-3 text-xs text-right font-medium">{child.offeredPrice ? formatCurrency(child.offeredPrice) : "-"}</td>
                      <td className="py-2 pr-3 text-xs text-right font-medium">
                        {child.offeredPrice ? formatCurrency(child.offeredPrice * (child.quantity || 1)) : "-"}
                      </td>
                      <td className="py-2 pr-3">
                        <Badge variant="default" size="sm">{child.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Queue Logs Section */}
      <Card padding="md" className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-gray-400" />
            Logs de Processamento
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLoadLogs}
            loading={loadingLogs}
            icon={FileText}
          >
            {loadingLogs ? "Carregando..." : logsOpen ? "Atualizar Logs" : "Ver Logs"}
          </Button>
        </div>

        {logsOpen && queueLogs.length > 0 && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {queueLogs.map((log) => (
              <div
                key={`${log.queue}-${log.id}`}
                className={`p-3 rounded-lg border text-xs ${
                  log.state === "completed"
                    ? "border-green-200 bg-green-50"
                    : log.state === "failed"
                    ? "border-red-200 bg-red-50"
                    : log.state === "active"
                    ? "border-blue-200 bg-blue-50"
                    : "border-gray-200 bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      log.queue === "scraping"
                        ? "bg-purple-100 text-purple-700"
                        : log.queue === "opportunity-processing"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-700"
                    }`}>
                      {log.queue === "scraping" ? "Scraping" : log.queue === "opportunity-processing" ? "Parsing" : "Email Sync"}
                    </span>
                    <span className={`font-medium ${
                      log.state === "completed" ? "text-green-700" : log.state === "failed" ? "text-red-700" : "text-gray-700"
                    }`}>
                      {log.state}
                    </span>
                  </div>
                  <span className="text-gray-400">
                    {log.timestamp ? new Date(log.timestamp).toLocaleString("pt-BR") : "-"}
                  </span>
                </div>
                {log.data?.sourceUrl && (
                  <div className="text-gray-600 truncate">URL: {log.data.sourceUrl}</div>
                )}
                {log.data?.emailMessageId && (
                  <div className="text-gray-600 truncate">Email: {log.data.emailMessageId}</div>
                )}
                {log.failedReason && (
                  <div className="text-red-600 mt-1">Erro: {log.failedReason}</div>
                )}
                {log.result && (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-gray-500 hover:text-gray-700">Resultado</summary>
                    <pre className="mt-1 bg-gray-100 p-2 rounded text-xs overflow-x-auto">
                      {JSON.stringify(log.result, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}

        {logsOpen && queueLogs.length === 0 && (
          <div className="text-sm text-gray-500">Nenhum log encontrado.</div>
        )}
      </Card>

      {/* Additional Information */}
      <Card padding="md">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <LinkIcon className="w-5 h-5 text-gray-400" />
          Informações Adicionais
        </h3>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-500">
              Link Original
            </label>
            <div className="text-gray-900">
              {opportunity.link ? (
                <a
                  href={opportunity.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline break-all"
                >
                  {opportunity.link}
                </a>
              ) : (
                "-"
              )}
            </div>
          </div>
          {opportunity.notes && (
            <div>
              <label className="text-sm font-medium text-gray-500">
                Notas
              </label>
              <div className="text-gray-900 whitespace-pre-wrap">
                {opportunity.notes}
              </div>
            </div>
          )}
        </div>
      </Card>
    </PageShell>
  )
}
