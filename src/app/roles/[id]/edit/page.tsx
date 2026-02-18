"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { useAuthRedirect } from "@/hooks/useAuthRedirect"
import { rolesApi, Role, Permission } from "@/lib/api"
import {
  PageShell,
  ErrorBanner,
  SuccessBanner,
  WarningBanner,
  LoadingCard,
  Button,
  Input,
  Checkbox,
} from "@/components/ui"
import {
  ArrowLeft,
  Save,
  Lock,
  Shield,
  Users,
  FileText,
  Mail,
  Settings,
  Eye,
  type LucideIcon,
} from "lucide-react"

const MODULE_ICONS: Record<string, LucideIcon> = {
  users: Users,
  roles: Shield,
  templates: FileText,
  gmail: Mail,
  opportunities: Eye,
}

export default function EditRolePage() {
  const { user, authLoading } = useAuthRedirect()
  const { can } = useAuth()
  const router = useRouter()
  const params = useParams()
  const roleId = params.id as string

  const [role, setRole] = useState<Role | null>(null)
  const [allPermissions, setAllPermissions] = useState<Permission[]>([])
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(
    new Set()
  )
  const [roleName, setRoleName] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  useEffect(() => {
    if (!user || !can("roles.update")) return

    const fetchData = async () => {
      try {
        setLoading(true)
        const [roleRes, permsRes] = await Promise.all([
          rolesApi.get(roleId),
          rolesApi.permissions(),
        ])

        setRole(roleRes.data)
        setRoleName(roleRes.data.name)
        setAllPermissions(permsRes.data)
        setSelectedPermissions(
          new Set(
            roleRes.data.rolePermissions?.map(
              (rp) => rp.permission.name
            ) || []
          )
        )
      } catch (err: any) {
        setError(err.response?.data?.message || "Erro ao carregar dados")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, can, roleId])

  const handleTogglePermission = (permName: string) => {
    setSelectedPermissions((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(permName)) {
        newSet.delete(permName)
      } else {
        newSet.add(permName)
      }
      return newSet
    })
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError("")
      setSuccess("")

      await rolesApi.update(roleId, {
        name: roleName !== role?.name ? roleName : undefined,
        permissions: Array.from(selectedPermissions),
      })

      setSuccess("Role atualizada com sucesso!")
    } catch (err: any) {
      setError(err.response?.data?.message || "Erro ao salvar")
    } finally {
      setSaving(false)
    }
  }

  // Agrupar permissoes por modulo
  const groupedPermissions = allPermissions.reduce(
    (acc, perm) => {
      const [module] = perm.name.split(".")
      if (!acc[module]) acc[module] = []
      acc[module].push(perm)
      return acc
    },
    {} as Record<string, Permission[]>
  )

  const toggleModule = (moduleName: string) => {
    const modulePerms = groupedPermissions[moduleName] || []
    const allSelected = modulePerms.every((p) =>
      selectedPermissions.has(p.name)
    )

    setSelectedPermissions((prev) => {
      const newSet = new Set(prev)
      modulePerms.forEach((p) => {
        if (allSelected) {
          newSet.delete(p.name)
        } else {
          newSet.add(p.name)
        }
      })
      return newSet
    })
  }

  if (loading && !role) {
    return (
      <PageShell authLoading={authLoading} user={user}>
        <LoadingCard message="Carregando permissoes..." />
      </PageShell>
    )
  }

  const isSuperAdminRole = role?.name === "super-admin"

  return (
    <PageShell authLoading={authLoading} user={user}>
      <div className="max-w-4xl mx-auto">
        {/* Back button */}
        <button
          onClick={() => router.push("/roles")}
          className="mb-6 text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Roles
        </button>

        <ErrorBanner message={error} onDismiss={() => setError("")} />
        <SuccessBanner message={success} onDismiss={() => setSuccess("")} />

        {isSuperAdminRole && (
          <WarningBanner
            message="A role super-admin nao pode ser modificada. Ela possui todas as permissoes automaticamente."
            icon={Lock}
          />
        )}

        {/* Nome da Role */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
          <Input
            label="Nome da Role"
            type="text"
            value={roleName}
            onChange={(e) => setRoleName(e.target.value)}
            disabled={isSuperAdminRole || role?.isSystem}
            hint={role?.isSystem ? "Roles do sistema nao podem ter o nome alterado" : undefined}
          />
        </div>

        {/* Matrix de Permissoes */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Permissoes ({selectedPermissions.size} de {allPermissions.length}{" "}
            selecionadas)
          </h3>

          <div className="space-y-4">
            {Object.entries(groupedPermissions).map(([module, perms]) => {
              const allSelected = perms.every((p) =>
                selectedPermissions.has(p.name)
              )
              const someSelected = perms.some((p) =>
                selectedPermissions.has(p.name)
              )
              const ModuleIcon = MODULE_ICONS[module] || Settings

              return (
                <div
                  key={module}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Checkbox
                      checked={allSelected}
                      ref={(el) => {
                        if (el)
                          el.indeterminate = someSelected && !allSelected
                      }}
                      onChange={() => toggleModule(module)}
                      disabled={isSuperAdminRole}
                      className="w-3.5 h-3.5"
                    />
                    <ModuleIcon className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-semibold text-gray-900 uppercase">
                      {module}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 ml-7">
                    {perms.map((perm) => {
                      const action = perm.name.split(".")[1]
                      return (
                        <Checkbox
                          key={perm.id}
                          label={action}
                          checked={selectedPermissions.has(perm.name)}
                          onChange={() =>
                            handleTogglePermission(perm.name)
                          }
                          disabled={isSuperAdminRole}
                          className="w-3.5 h-3.5"
                        />
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Botao Salvar */}
        {!isSuperAdminRole && (
          <div className="flex justify-end">
            <Button
              loading={saving}
              icon={Save}
              onClick={handleSave}
            >
              Salvar Alteracoes
            </Button>
          </div>
        )}
      </div>
    </PageShell>
  )
}
