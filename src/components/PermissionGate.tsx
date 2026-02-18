"use client"

import { useAuth } from "@/contexts/AuthContext"

interface PermissionGateProps {
  children: React.ReactNode
  permission?: string
  permissions?: string[]
  requireAll?: boolean
  role?: string
  fallback?: React.ReactNode
}

export default function PermissionGate({
  children,
  permission,
  permissions,
  requireAll = false,
  role,
  fallback = null,
}: PermissionGateProps) {
  const { can, canAny, canAll, hasRole } = useAuth()

  let allowed = false

  if (role) {
    allowed = hasRole(role)
  } else if (permission) {
    allowed = can(permission)
  } else if (permissions) {
    allowed = requireAll ? canAll(permissions) : canAny(permissions)
  } else {
    allowed = true
  }

  if (!allowed) return <>{fallback}</>

  return <>{children}</>
}
