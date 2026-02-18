"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import { authApi, User } from "@/lib/api"

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
  // RBAC helpers
  can: (permission: string) => boolean
  canAny: (permissions: string[]) => boolean
  canAll: (permissions: string[]) => boolean
  hasRole: (role: string) => boolean
  isSuperAdmin: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Verifica se há token salvo
    const token = localStorage.getItem("token")
    const savedUser = localStorage.getItem("user")

    if (token && savedUser) {
      setUser(JSON.parse(savedUser))
      // Valida o token com o backend
      authApi
        .me()
        .then((response) => {
          const userData = response.data
          setUser(userData)
          localStorage.setItem("user", JSON.stringify(userData))
        })
        .catch(() => {
          // Token inválido, limpa tudo (o interceptor vai tentar refresh primeiro)
          localStorage.removeItem("token")
          localStorage.removeItem("refreshToken")
          localStorage.removeItem("user")
          setUser(null)
        })
        .finally(() => {
          setLoading(false)
        })
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const response = await authApi.login(email, password)
      const { accessToken, refreshToken, user } = response.data

      localStorage.setItem("token", accessToken)
      localStorage.setItem("refreshToken", refreshToken)
      localStorage.setItem("user", JSON.stringify(user))
      setUser(user)
    } catch (error) {
      throw error
    }
  }

  const logout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("refreshToken")
    localStorage.removeItem("user")
    setUser(null)
    window.location.href = "/login"
  }

  // RBAC helpers
  const isSuperAdmin = user?.roles?.includes("super-admin") ?? false

  const can = useCallback(
    (permission: string): boolean => {
      if (!user) return false
      if (user.roles?.includes("super-admin")) return true
      return user.permissions?.includes(permission) ?? false
    },
    [user]
  )

  const canAny = useCallback(
    (permissions: string[]): boolean => {
      if (!user) return false
      if (user.roles?.includes("super-admin")) return true
      return permissions.some((p) => user.permissions?.includes(p))
    },
    [user]
  )

  const canAll = useCallback(
    (permissions: string[]): boolean => {
      if (!user) return false
      if (user.roles?.includes("super-admin")) return true
      return permissions.every((p) => user.permissions?.includes(p))
    },
    [user]
  )

  const hasRole = useCallback(
    (role: string): boolean => {
      if (!user) return false
      return user.roles?.includes(role) ?? false
    },
    [user]
  )

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
        can,
        canAny,
        canAll,
        hasRole,
        isSuperAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
