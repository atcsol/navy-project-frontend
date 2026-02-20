"use client"

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react"
import { setGlobalToastError } from "@/lib/api"

export type ToastType = "success" | "error" | "warning" | "info"

export interface Toast {
  id: string
  type: ToastType
  message: string
}

interface ToastContextValue {
  toasts: Toast[]
  toast: {
    success: (message: string) => void
    error: (message: string) => void
    warning: (message: string) => void
    info: (message: string) => void
  }
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

let toastCounter = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = `toast-${++toastCounter}`
    setToasts((prev) => [...prev, { id, type, message }])

    const duration = type === "success" || type === "info" ? 3000 : 5000
    setTimeout(() => removeToast(id), duration)
  }, [removeToast])

  // Registra o toast.error como callback global para o interceptor do Axios
  useEffect(() => {
    setGlobalToastError((msg: string) => addToast("error", msg))
    return () => setGlobalToastError(null)
  }, [addToast])

  const toast = {
    success: (message: string) => addToast("success", message),
    error: (message: string) => addToast("error", message),
    warning: (message: string) => addToast("warning", message),
    info: (message: string) => addToast("info", message),
  }

  return (
    <ToastContext.Provider value={{ toasts, toast, removeToast }}>
      {children}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}
