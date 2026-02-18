"use client"

import { Loader2 } from "lucide-react"
import Navigation from "@/components/Navigation"

interface PageShellProps {
  children: React.ReactNode
  authLoading?: boolean
  user?: unknown
  className?: string
  containerClassName?: string
}

export default function PageShell({
  children,
  authLoading,
  user,
  className,
  containerClassName,
}: PageShellProps) {
  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Carregando...</span>
        </div>
      </div>
    )
  }

  return (
    <div className={containerClassName ?? "min-h-screen bg-slate-50"}>
      <Navigation />
      <main className={className ?? "w-full px-4 sm:px-6 lg:px-8 py-8"}>
        {children}
      </main>
    </div>
  )
}
