"use client"

import { useToast, ToastType } from "@/contexts/ToastContext"
import { X, CheckCircle2, AlertTriangle, XCircle, Info } from "lucide-react"

const TOAST_STYLES: Record<ToastType, { bg: string; icon: typeof CheckCircle2 }> = {
  success: { bg: "bg-green-50 border-green-300 text-green-800", icon: CheckCircle2 },
  error: { bg: "bg-red-50 border-red-300 text-red-800", icon: XCircle },
  warning: { bg: "bg-yellow-50 border-yellow-300 text-yellow-800", icon: AlertTriangle },
  info: { bg: "bg-blue-50 border-blue-300 text-blue-800", icon: Info },
}

export default function Toaster() {
  const { toasts, removeToast } = useToast()

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => {
        const style = TOAST_STYLES[toast.type]
        const Icon = style.icon
        return (
          <div
            key={toast.id}
            className={`${style.bg} border rounded-lg px-4 py-3 shadow-lg flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-200`}
          >
            <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm flex-1">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 hover:opacity-70"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
