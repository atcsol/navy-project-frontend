"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { useAuthRedirect } from "@/hooks/useAuthRedirect"
import { usersApi, rolesApi, User, Role } from "@/lib/api"
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
  Users,
  UserPlus,
  Shield,
  User as UserIcon,
  Trash2,
  Save,
  X,
} from "lucide-react"

interface UserWithRoleInfo extends User {
  userRoles?: string[]
}

export default function UsersPage() {
  const { user, authLoading } = useAuthRedirect()
  const { can } = useAuth()
  const [users, setUsers] = useState<UserWithRoleInfo[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Modal para atribuir roles
  const [editingUser, setEditingUser] = useState<UserWithRoleInfo | null>(null)
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [savingRoles, setSavingRoles] = useState(false)

  // Modal para criar usuario
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newUserName, setNewUserName] = useState("")
  const [newUserEmail, setNewUserEmail] = useState("")
  const [newUserPassword, setNewUserPassword] = useState("")
  const [creating, setCreating] = useState(false)

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const [usersRes, rolesRes] = await Promise.all([
        usersApi.list(),
        can("roles.view") ? rolesApi.list() : Promise.resolve({ data: [] }),
      ])

      // Carregar roles de cada usuario
      const usersWithRoles = await Promise.all(
        usersRes.data.map(async (u) => {
          try {
            const rolesRes = await usersApi.getRoles(u.id)
            return { ...u, userRoles: rolesRes.data.roles }
          } catch {
            return { ...u, userRoles: [] }
          }
        })
      )

      setUsers(usersWithRoles)
      setRoles(rolesRes.data)
    } catch (err: any) {
      setError(err.response?.data?.message || "Erro ao carregar usuarios")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!user || !can("users.view")) return
    fetchUsers()
  }, [user, can])

  const handleEditRoles = (u: UserWithRoleInfo) => {
    setEditingUser(u)
    setSelectedRoles(u.userRoles || [])
  }

  const handleSaveRoles = async () => {
    if (!editingUser) return
    try {
      setSavingRoles(true)
      await usersApi.assignRoles(editingUser.id, selectedRoles)
      setEditingUser(null)
      await fetchUsers()
    } catch (err: any) {
      setError(err.response?.data?.message || "Erro ao salvar roles")
    } finally {
      setSavingRoles(false)
    }
  }

  const handleCreateUser = async () => {
    try {
      setCreating(true)
      setError("")
      await usersApi.create({
        name: newUserName,
        email: newUserEmail,
        password: newUserPassword,
      })
      setShowCreateModal(false)
      setNewUserName("")
      setNewUserEmail("")
      setNewUserPassword("")
      await fetchUsers()
    } catch (err: any) {
      setError(err.response?.data?.message || "Erro ao criar usuario")
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteUser = async (u: UserWithRoleInfo) => {
    if (!confirm(`Tem certeza que deseja deletar o usuario "${u.name}"?`))
      return
    try {
      await usersApi.delete(u.id)
      setUsers((prev) => prev.filter((x) => x.id !== u.id))
    } catch (err: any) {
      setError(err.response?.data?.message || "Erro ao deletar usuario")
    }
  }

  const getRoleBadgeVariant = (roleName: string) => {
    if (roleName === "super-admin") return "danger" as const
    if (roleName === "admin") return "purple" as const
    return "info" as const
  }

  const getRoleBadgeIcon = (roleName: string) => {
    if (roleName === "super-admin" || roleName === "admin") return Shield
    return UserIcon
  }

  return (
    <PageShell authLoading={authLoading} user={user}>
      <PageHeader
        title="Gerenciamento de Usuarios"
        subtitle="Gerencie os usuarios e suas permissoes"
      >
        <PermissionGate permission="users.create">
          <Button icon={UserPlus} onClick={() => setShowCreateModal(true)}>
            Novo Usuario
          </Button>
        </PermissionGate>
      </PageHeader>

      <ErrorBanner message={error} onDismiss={() => setError("")} />

      {loading ? (
        <LoadingCard message="Carregando usuarios..." />
      ) : users.length === 0 ? (
        <EmptyState icon={Users} message="Nenhum usuario encontrado" />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/80 border-b-2 border-gray-200 border-r border-r-gray-200 whitespace-nowrap">
                  Nome
                </th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/80 border-b-2 border-gray-200 border-r border-r-gray-200 whitespace-nowrap">
                  Email
                </th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/80 border-b-2 border-gray-200 border-r border-r-gray-200 whitespace-nowrap">
                  Roles
                </th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/80 border-b-2 border-gray-200 border-r border-r-gray-200 whitespace-nowrap">
                  Acoes
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, idx) => (
                <tr
                  key={u.id}
                  className={`${
                    idx % 2 === 0 ? "bg-white" : "bg-gray-100/60"
                  } hover:bg-blue-50/40 transition-colors`}
                >
                  <td className="px-3 py-2 text-[13px] border-b border-gray-200 border-r border-r-gray-200 font-medium text-gray-900">
                    {u.name}
                  </td>
                  <td className="px-3 py-2 text-[13px] border-b border-gray-200 border-r border-r-gray-200 text-gray-600">
                    {u.email}
                  </td>
                  <td className="px-3 py-2 text-[13px] border-b border-gray-200 border-r border-r-gray-200">
                    <div className="flex gap-1 flex-wrap">
                      {(u.userRoles || []).map((r) => (
                        <Badge
                          key={r}
                          variant={getRoleBadgeVariant(r)}
                          icon={getRoleBadgeIcon(r)}
                        >
                          {r}
                        </Badge>
                      ))}
                      {(!u.userRoles || u.userRoles.length === 0) && (
                        <span className="text-xs text-gray-400">
                          Sem role
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-[13px] border-b border-gray-200 border-r border-r-gray-200">
                    <div className="flex gap-1.5">
                      <PermissionGate permission="roles.update">
                        <Button
                          size="xs"
                          icon={Shield}
                          onClick={() => handleEditRoles(u)}
                          className="text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100"
                        >
                          Roles
                        </Button>
                      </PermissionGate>
                      <PermissionGate permission="users.delete">
                        {u.id !== user?.id && (
                          <Button
                            size="xs"
                            icon={Trash2}
                            onClick={() => handleDeleteUser(u)}
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

      {/* Modal: Editar Roles */}
      <Modal
        open={!!editingUser}
        onClose={() => setEditingUser(null)}
        title={`Roles de ${editingUser?.name ?? ""}`}
      >
        <div className="space-y-2 mb-6">
          {roles.map((role) => (
            <label
              key={role.id}
              className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedRoles.includes(role.name)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedRoles((prev) => [...prev, role.name])
                  } else {
                    setSelectedRoles((prev) =>
                      prev.filter((r) => r !== role.name)
                    )
                  }
                }}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
              />
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {role.name}
                </div>
                <div className="text-xs text-gray-500">
                  {role.rolePermissions?.length || 0} permissoes
                </div>
              </div>
            </label>
          ))}
        </div>
        <Modal.Footer>
          <Button
            variant="secondary"
            icon={X}
            onClick={() => setEditingUser(null)}
          >
            Cancelar
          </Button>
          <Button
            loading={savingRoles}
            icon={Save}
            onClick={handleSaveRoles}
          >
            Salvar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal: Criar Usuario */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Novo Usuario"
      >
        <div className="space-y-4 mb-6">
          <Input
            label="Nome"
            type="text"
            value={newUserName}
            onChange={(e) => setNewUserName(e.target.value)}
          />
          <Input
            label="Email"
            type="email"
            value={newUserEmail}
            onChange={(e) => setNewUserEmail(e.target.value)}
          />
          <Input
            label="Senha"
            type="password"
            value={newUserPassword}
            onChange={(e) => setNewUserPassword(e.target.value)}
          />
        </div>
        <Modal.Footer>
          <Button
            variant="secondary"
            icon={X}
            onClick={() => setShowCreateModal(false)}
          >
            Cancelar
          </Button>
          <Button
            loading={creating}
            icon={UserPlus}
            disabled={creating || !newUserName || !newUserEmail || !newUserPassword}
            onClick={handleCreateUser}
          >
            Criar
          </Button>
        </Modal.Footer>
      </Modal>
    </PageShell>
  )
}
