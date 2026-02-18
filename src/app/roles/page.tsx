"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { useAuthRedirect } from "@/hooks/useAuthRedirect"
import { rolesApi, Role } from "@/lib/api"
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
} from "@/components/ui"
import {
  Shield,
  Plus,
  Lock,
  Unlock,
  Hash,
  Users,
  Pencil,
  Trash2,
  X,
  Check,
} from "lucide-react"

export default function RolesPage() {
  const { user, authLoading } = useAuthRedirect()
  const router = useRouter()
  const { can } = useAuth()
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Modal para criar role
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newRoleName, setNewRoleName] = useState("")
  const [creatingRole, setCreatingRole] = useState(false)

  useEffect(() => {
    if (!user || !can("roles.view")) return

    const fetchRoles = async () => {
      try {
        setLoading(true)
        const response = await rolesApi.list()
        setRoles(response.data)
      } catch (err: any) {
        setError(err.response?.data?.message || "Erro ao carregar roles")
      } finally {
        setLoading(false)
      }
    }

    fetchRoles()
  }, [user, can])

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) return
    try {
      setCreatingRole(true)
      setError("")
      const res = await rolesApi.create({ name: newRoleName.trim() })
      setRoles((prev) => [...prev, res.data])
      setShowCreateModal(false)
      setNewRoleName("")
    } catch (err: any) {
      setError(err.response?.data?.message || "Erro ao criar role")
    } finally {
      setCreatingRole(false)
    }
  }

  const handleDelete = async (role: Role) => {
    if (role.isSystem) {
      setError("Roles do sistema não podem ser deletadas")
      return
    }
    if (!confirm(`Tem certeza que deseja deletar a role "${role.name}"?`)) return

    try {
      await rolesApi.delete(role.id)
      setRoles((prev) => prev.filter((r) => r.id !== role.id))
    } catch (err: any) {
      setError(err.response?.data?.message || "Erro ao deletar role")
    }
  }

  return (
    <PageShell authLoading={authLoading} user={user}>
      <PageHeader
        title="Gerenciamento de Papeis (Roles)"
        subtitle="Gerencie os papeis e permissoes do sistema"
      >
        <PermissionGate permission="roles.create">
          <Button icon={Plus} onClick={() => setShowCreateModal(true)}>
            Nova Role
          </Button>
        </PermissionGate>
      </PageHeader>

      <ErrorBanner message={error} onDismiss={() => setError("")} />

      {loading ? (
        <LoadingCard message="Carregando roles..." />
      ) : roles.length === 0 ? (
        <EmptyState icon={Shield} message="Nenhuma role encontrada" />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/80 border-b-2 border-gray-200 border-r border-r-gray-200 whitespace-nowrap">
                  Nome
                </th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/80 border-b-2 border-gray-200 border-r border-r-gray-200 whitespace-nowrap">
                  Tipo
                </th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/80 border-b-2 border-gray-200 border-r border-r-gray-200 whitespace-nowrap">
                  Permissoes
                </th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/80 border-b-2 border-gray-200 border-r border-r-gray-200 whitespace-nowrap">
                  Usuarios
                </th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/80 border-b-2 border-gray-200 border-r border-r-gray-200 whitespace-nowrap">
                  Acoes
                </th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role, idx) => (
                <tr
                  key={role.id}
                  className={`${
                    idx % 2 === 0 ? "bg-white" : "bg-gray-100/60"
                  } hover:bg-blue-50/40 transition-colors`}
                >
                  <td className="px-3 py-2 text-[13px] border-b border-gray-200 border-r border-r-gray-200">
                    <div className="font-medium text-gray-900">
                      {role.name}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-[13px] border-b border-gray-200 border-r border-r-gray-200">
                    {role.isSystem ? (
                      <Badge variant="info" icon={Lock}>
                        Sistema
                      </Badge>
                    ) : (
                      <Badge variant="default" icon={Unlock}>
                        Custom
                      </Badge>
                    )}
                  </td>
                  <td className="px-3 py-2 text-[13px] border-b border-gray-200 border-r border-r-gray-200">
                    <Badge variant="default" icon={Hash}>
                      {role.rolePermissions?.length || 0}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-[13px] border-b border-gray-200 border-r border-r-gray-200">
                    <Badge variant="default" icon={Users}>
                      {role._count?.userRoles || 0}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-[13px] border-b border-gray-200 border-r border-r-gray-200">
                    <div className="flex gap-1.5">
                      <PermissionGate permission="roles.update">
                        <Button
                          size="xs"
                          icon={Pencil}
                          onClick={() =>
                            router.push(`/roles/${role.id}/edit`)
                          }
                          className="text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100"
                        >
                          Editar
                        </Button>
                      </PermissionGate>
                      <PermissionGate permission="roles.delete">
                        {!role.isSystem && (
                          <Button
                            size="xs"
                            icon={Trash2}
                            onClick={() => handleDelete(role)}
                            className="text-red-700 bg-red-50 border border-red-200 hover:bg-red-100"
                          >
                            Deletar
                          </Button>
                        )}
                      </PermissionGate>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Criar Role */}
      <Modal
        open={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          setNewRoleName("")
        }}
        title="Nova Role"
      >
        <div className="mb-6">
          <Input
            label="Nome da Role"
            type="text"
            value={newRoleName}
            onChange={(e) => setNewRoleName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateRole()}
            placeholder="Ex: editor, viewer..."
            autoFocus
          />
        </div>
        <Modal.Footer>
          <Button
            variant="secondary"
            icon={X}
            onClick={() => {
              setShowCreateModal(false)
              setNewRoleName("")
            }}
          >
            Cancelar
          </Button>
          <Button
            loading={creatingRole}
            icon={Check}
            disabled={creatingRole || !newRoleName.trim()}
            onClick={handleCreateRole}
          >
            Criar
          </Button>
        </Modal.Footer>
      </Modal>
    </PageShell>
  )
}
