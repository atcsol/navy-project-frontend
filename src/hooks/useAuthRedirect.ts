"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"

/**
 * Hook que redireciona para /login se o usuário não estiver autenticado.
 * Retorna { user, authLoading } para uso na página.
 */
export function useAuthRedirect() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  return { user, authLoading }
}
