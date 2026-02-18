"use client"

import { useAuth } from "@/contexts/AuthContext"

export function usePermissions() {
  const { can, canAny, canAll, hasRole, isSuperAdmin, user } = useAuth()

  return {
    can,
    canAny,
    canAll,
    hasRole,
    isSuperAdmin,
    roles: user?.roles ?? [],
    permissions: user?.permissions ?? [],
  }
}
