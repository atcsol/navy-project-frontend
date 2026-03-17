"use client"

import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import PermissionGate from "@/components/PermissionGate"
import AlertsBell from "@/components/AlertsBell"
import { useWebSocket } from "@/hooks/useWebSocket"
import {
  Anchor,
  LayoutDashboard,
  FileText,
  Mail,
  Users,
  Shield,
  LogOut,
  Package,
  FileSpreadsheet,
  Globe,
  Settings,
  Wifi,
  WifiOff,
} from "lucide-react"

interface NavigationProps {
  rightContent?: React.ReactNode
}

const NAV_ITEMS = [
  { label: "Oportunidades", path: "/", icon: <LayoutDashboard className="w-4 h-4" /> },
  { label: "Templates", path: "/templates", icon: <FileText className="w-4 h-4" /> },
  { label: "Gmail", path: "/gmail", icon: <Mail className="w-4 h-4" /> },
]

export default function Navigation({ rightContent }: NavigationProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { user } = useAuth()
  const { connected: wsConnected } = useWebSocket()

  if (!user) return null

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/" || pathname.startsWith("/opportunities")
    return pathname.startsWith(path)
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo + Nav */}
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <Anchor className="w-6 h-6 text-blue-700" />
              <span className="text-lg font-bold text-gray-900 tracking-tight">Navy Procurement</span>
            </div>

            <nav className="flex items-center gap-1">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.path}
                  onClick={() => router.push(item.path)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    isActive(item.path)
                      ? "text-blue-700 bg-blue-50"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
              <PermissionGate permission="suppliers.view">
                <button
                  onClick={() => router.push("/suppliers")}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    pathname.startsWith("/suppliers")
                      ? "text-blue-700 bg-blue-50"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <Package className="w-4 h-4" />
                  Fornecedores
                </button>
              </PermissionGate>
              <PermissionGate permission="rfqs.view">
                <button
                  onClick={() => router.push("/rfqs")}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    pathname.startsWith("/rfqs")
                      ? "text-blue-700 bg-blue-50"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Cotacoes
                </button>
              </PermissionGate>
              <PermissionGate permission="users.view">
                <button
                  onClick={() => router.push("/users")}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    pathname.startsWith("/users")
                      ? "text-blue-700 bg-blue-50"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <Users className="w-4 h-4" />
                  Usuarios
                </button>
              </PermissionGate>
              <PermissionGate permission="roles.view">
                <button
                  onClick={() => router.push("/roles")}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    pathname.startsWith("/roles")
                      ? "text-blue-700 bg-blue-50"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  Papeis
                </button>
              </PermissionGate>
              <PermissionGate permission="scraping.view">
                <button
                  onClick={() => router.push("/scraping")}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    pathname.startsWith("/scraping")
                      ? "text-blue-700 bg-blue-50"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  Scraping
                </button>
              </PermissionGate>
              <PermissionGate permission="gmail.view">
                <button
                  onClick={() => router.push("/settings")}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    pathname.startsWith("/settings")
                      ? "text-blue-700 bg-blue-50"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  Sync Emails
                </button>
              </PermissionGate>
            </nav>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {rightContent}
            <div className="flex items-center gap-1.5" title={wsConnected ? "Conectado em tempo real" : "Desconectado"}>
              {wsConnected ? (
                <Wifi className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-gray-300" />
              )}
            </div>
            <AlertsBell />

            <div className="h-5 w-px bg-gray-200" />

            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold">
                {user.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <span className="text-sm font-medium text-gray-700">{user.name}</span>
            </div>

            <button
              onClick={() => {
                localStorage.removeItem("token")
                localStorage.removeItem("refreshToken")
                localStorage.removeItem("user")
                router.push("/login")
              }}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
