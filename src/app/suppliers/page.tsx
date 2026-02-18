"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useAuthRedirect } from "@/hooks/useAuthRedirect"
import { suppliersApi, Supplier } from "@/lib/api"
import PermissionGate from "@/components/PermissionGate"
import {
  PageShell,
  PageHeader,
  ErrorBanner,
  LoadingCard,
  EmptyState,
  Modal,
  Button,
  Badge,
  Input,
  Textarea,
} from "@/components/ui"
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Search,
} from "lucide-react"

const EMPTY_FORM = {
  name: "",
  email: "",
  phone: "",
  contactName: "",
  street: "",
  city: "",
  state: "",
  zipCode: "",
  country: "US",
  tags: [] as string[],
  notes: "",
}

export default function SuppliersPage() {
  const { user, authLoading } = useAuthRedirect()
  const { can } = useAuth()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [tagInput, setTagInput] = useState("")
  const [saving, setSaving] = useState(false)

  const fetchSuppliers = async () => {
    try {
      setLoading(true)
      const res = await suppliersApi.list({ search: search || undefined })
      setSuppliers(res.data)
    } catch (err: any) {
      setError(err.response?.data?.message || "Erro ao carregar fornecedores")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!user || !can("suppliers.view")) return
    fetchSuppliers()
  }, [user, can])

  useEffect(() => {
    if (!user) return
    const timer = setTimeout(() => fetchSuppliers(), 300)
    return () => clearTimeout(timer)
  }, [search])

  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setTagInput("")
    setShowModal(true)
  }

  const openEdit = (s: Supplier) => {
    setEditingId(s.id)
    setForm({
      name: s.name,
      email: s.email,
      phone: s.phone || "",
      contactName: s.contactName || "",
      street: s.street || "",
      city: s.city || "",
      state: s.state || "",
      zipCode: s.zipCode || "",
      country: s.country || "US",
      tags: (s.tags as string[]) || [],
      notes: s.notes || "",
    })
    setTagInput("")
    setShowModal(true)
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError("")
      const data = {
        ...form,
        phone: form.phone || undefined,
        contactName: form.contactName || undefined,
        street: form.street || undefined,
        city: form.city || undefined,
        state: form.state || undefined,
        zipCode: form.zipCode || undefined,
        notes: form.notes || undefined,
      }
      if (editingId) {
        await suppliersApi.update(editingId, data)
      } else {
        await suppliersApi.create(data)
      }
      setShowModal(false)
      await fetchSuppliers()
    } catch (err: any) {
      setError(err.response?.data?.message || "Erro ao salvar fornecedor")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (s: Supplier) => {
    if (!confirm(`Tem certeza que deseja deletar "${s.name}"?`)) return
    try {
      await suppliersApi.delete(s.id)
      setSuppliers((prev) => prev.filter((x) => x.id !== s.id))
    } catch (err: any) {
      setError(err.response?.data?.message || "Erro ao deletar fornecedor")
    }
  }

  const addTag = () => {
    const tag = tagInput.trim()
    if (tag && !form.tags.includes(tag)) {
      setForm((prev) => ({ ...prev, tags: [...prev.tags, tag] }))
    }
    setTagInput("")
  }

  const removeTag = (tag: string) => {
    setForm((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }))
  }

  return (
    <PageShell authLoading={authLoading} user={user}>
      <PageHeader
        title="Gerenciamento de Fornecedores"
        subtitle="Cadastre e gerencie fornecedores para cotacoes"
      >
        <PermissionGate permission="suppliers.create">
          <Button onClick={openCreate} icon={Plus}>
            Novo Fornecedor
          </Button>
        </PermissionGate>
      </PageHeader>

      <ErrorBanner message={error} onDismiss={() => setError("")} />

      {/* Search */}
      <div className="mb-4 max-w-sm">
        <Input
          icon={Search}
          placeholder="Buscar por nome ou email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <LoadingCard message="Carregando fornecedores..." />
      ) : suppliers.length === 0 ? (
        <EmptyState icon={Package} message="Nenhum fornecedor encontrado" />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <table className="min-w-full">
            <thead>
              <tr>
                {["Nome", "Email", "Telefone", "Contato", "Cidade/Estado", "Tags", "Acoes"].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/80 border-b-2 border-gray-200 border-r border-r-gray-200 whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s, idx) => (
                <tr
                  key={s.id}
                  className={`${
                    idx % 2 === 0 ? "bg-white" : "bg-gray-100/60"
                  } hover:bg-blue-50/40 transition-colors`}
                >
                  <td className="px-3 py-2 text-[13px] border-b border-gray-200 border-r border-r-gray-200 font-medium text-gray-900">
                    {s.name}
                  </td>
                  <td className="px-3 py-2 text-[13px] border-b border-gray-200 border-r border-r-gray-200 text-gray-600">
                    {s.email}
                  </td>
                  <td className="px-3 py-2 text-[13px] border-b border-gray-200 border-r border-r-gray-200 text-gray-600">
                    {s.phone || "-"}
                  </td>
                  <td className="px-3 py-2 text-[13px] border-b border-gray-200 border-r border-r-gray-200 text-gray-600">
                    {s.contactName || "-"}
                  </td>
                  <td className="px-3 py-2 text-[13px] border-b border-gray-200 border-r border-r-gray-200 text-gray-600">
                    {[s.city, s.state].filter(Boolean).join(", ") || "-"}
                  </td>
                  <td className="px-3 py-2 text-[13px] border-b border-gray-200 border-r border-r-gray-200">
                    <div className="flex gap-1 flex-wrap">
                      {((s.tags as string[]) || []).map((tag) => (
                        <Badge key={tag} variant="info" className="border border-blue-200">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-[13px] border-b border-gray-200 border-r border-r-gray-200">
                    <div className="flex gap-1.5">
                      <PermissionGate permission="suppliers.update">
                        <Button
                          size="xs"
                          icon={Pencil}
                          onClick={() => openEdit(s)}
                          className="text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100"
                        >
                          Editar
                        </Button>
                      </PermissionGate>
                      <PermissionGate permission="suppliers.delete">
                        <Button
                          size="xs"
                          variant="danger"
                          icon={Trash2}
                          onClick={() => handleDelete(s)}
                          className="text-red-700 bg-red-50 border border-red-200 hover:bg-red-100"
                        >
                          Deletar
                        </Button>
                      </PermissionGate>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Criar/Editar Fornecedor */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? "Editar Fornecedor" : "Novo Fornecedor"}
        maxWidth="max-w-lg"
      >
        <div className="space-y-3 mb-6 max-h-[60vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Nome *"
              type="text"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
            <Input
              label="Email *"
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Telefone"
              type="text"
              value={form.phone}
              onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
            />
            <Input
              label="Contato"
              type="text"
              value={form.contactName}
              onChange={(e) => setForm((p) => ({ ...p, contactName: e.target.value }))}
            />
          </div>
          <div>
            <Input
              label="Endereco"
              type="text"
              placeholder="Rua"
              value={form.street}
              onChange={(e) => setForm((p) => ({ ...p, street: e.target.value }))}
              className="mb-2"
            />
            <div className="grid grid-cols-4 gap-2">
              <Input
                type="text"
                placeholder="Cidade"
                value={form.city}
                onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                className="col-span-2"
              />
              <Input
                type="text"
                placeholder="Estado"
                value={form.state}
                onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))}
              />
              <Input
                type="text"
                placeholder="CEP"
                value={form.zipCode}
                onChange={(e) => setForm((p) => ({ ...p, zipCode: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
            <div className="flex gap-1 flex-wrap mb-2">
              {form.tags.map((tag) => (
                <Badge key={tag} variant="info" className="border border-blue-200">
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="text-blue-400 hover:text-blue-600 ml-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addTag()
                  }
                }}
                placeholder="Digite e pressione Enter"
                className="flex-1"
              />
              <Button
                variant="secondary"
                onClick={addTag}
                className="text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100"
              >
                Adicionar
              </Button>
            </div>
          </div>
          <Textarea
            label="Notas"
            value={form.notes}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
            rows={2}
          />
        </div>
        <Modal.Footer>
          <Button
            variant="secondary"
            icon={X}
            onClick={() => setShowModal(false)}
          >
            Cancelar
          </Button>
          <Button
            icon={Save}
            loading={saving}
            onClick={handleSave}
            disabled={!form.name || !form.email}
          >
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </Modal.Footer>
      </Modal>
    </PageShell>
  )
}
