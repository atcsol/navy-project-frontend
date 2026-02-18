"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { alertsApi, Alert } from "@/lib/api"
import { X } from "lucide-react"

interface AlertsBellProps {
  externalCount?: number
  onNewAlert?: (alert: Alert) => void
}

export default function AlertsBell({ externalCount, onNewAlert }: AlertsBellProps) {
  const [unreadCount, setUnreadCount] = useState(0)
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [showPanel, setShowPanel] = useState(false)
  const [loading, setLoading] = useState(false)

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await alertsApi.unreadCount()
      setUnreadCount(res.data.count)
    } catch {}
  }, [])

  const fetchAlerts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await alertsApi.list({ page: 1, limit: 50 })
      setAlerts(res.data.data)
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [fetchUnreadCount])

  useEffect(() => {
    if (externalCount !== undefined) {
      setUnreadCount(externalCount)
    }
  }, [externalCount])

  const togglePanel = () => {
    if (!showPanel) {
      fetchAlerts()
    }
    setShowPanel(!showPanel)
  }

  const handleMarkAsRead = async (alertId: string) => {
    try {
      await alertsApi.markAsRead(alertId)
      setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, isRead: true } : a)))
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch {}
  }

  const handleMarkAllAsRead = async () => {
    try {
      await alertsApi.markAllAsRead()
      setAlerts((prev) => prev.map((a) => ({ ...a, isRead: true })))
      setUnreadCount(0)
    } catch {}
  }

  const typeIcons: Record<string, string> = {
    cancellation: "text-red-500",
    status_change: "text-blue-500",
    amendment: "text-yellow-500",
    deadline_warning: "text-orange-500",
  }

  return (
    <>
      <button
        onClick={togglePanel}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
        title="Alertas"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-500 rounded-full min-w-[18px]">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Overlay */}
      {showPanel && (
        <div
          className="fixed inset-0 bg-black/20 z-40 transition-opacity"
          onClick={() => setShowPanel(false)}
        />
      )}

      {/* Sidebar panel */}
      <div
        className={`fixed top-0 right-0 h-full w-[420px] max-w-full bg-white shadow-2xl z-50 flex flex-col transform transition-transform duration-200 ease-out ${
          showPanel ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b bg-gray-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            <h2 className="text-sm font-semibold text-gray-800">Alertas</h2>
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                Marcar todos como lidos
              </button>
            )}
            <button
              onClick={() => setShowPanel(false)}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Alerts list */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="p-8 text-center text-gray-500 text-sm">Carregando...</div>
          ) : alerts.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
              <p className="text-sm">Nenhum alerta</p>
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className={`px-5 py-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                  !alert.isRead ? "bg-blue-50/40" : ""
                }`}
                onClick={() => {
                  if (!alert.isRead) handleMarkAsRead(alert.id)
                }}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 flex-shrink-0 ${typeIcons[alert.type] || "text-gray-400"}`}>
                    {alert.type === "cancellation" ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm font-medium ${!alert.isRead ? "text-gray-900" : "text-gray-600"}`}>
                        {alert.title}
                      </p>
                      {!alert.isRead && (
                        <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{alert.message}</p>
                    <p className="text-[11px] text-gray-400 mt-1.5">
                      {new Date(alert.createdAt).toLocaleString("pt-BR")}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}
