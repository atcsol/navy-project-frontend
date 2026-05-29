"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import { io, Socket } from "socket.io-client"

// Remove APENAS o sufixo "/api" do final da URL. NÃO usar .replace("/api","")
// porque isso remove a primeira ocorrência — em produção o host é "api.navy..."
// e o "//api" do subdomínio seria mutilado, gerando host inválido (ERR_NAME_NOT_RESOLVED).
const WS_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002/api").replace(/\/api\/?$/, "")

interface UseWebSocketOptions {
  onAlert?: (alert: any) => void
  onCancellation?: (data: { opportunityId: string; solicitationNumber: string }) => void
  onOpportunityUpdate?: (data: { opportunityId: string; action: string; opportunity?: any }) => void
  onCountsUpdate?: (counts: Record<string, number>) => void
  onRfqResponse?: (data: { rfqId: string; rfqItemId: string; supplierName: string; rfqTitle: string }) => void
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const socketRef = useRef<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const optionsRef = useRef(options)
  optionsRef.current = options

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) return

    const socket = io(WS_BASE + "/ws", {
      query: { token },
      transports: ["polling", "websocket"],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 10,
    })

    socketRef.current = socket

    socket.on("connect", () => {
      setConnected(true)
    })

    socket.on("disconnect", () => {
      setConnected(false)
    })

    socket.on("alert", (alert: any) => {
      optionsRef.current.onAlert?.(alert)
    })

    socket.on("cancellation", (data: any) => {
      optionsRef.current.onCancellation?.(data)
    })

    socket.on("opportunity:update", (data: any) => {
      optionsRef.current.onOpportunityUpdate?.(data)
    })

    socket.on("counts:update", (counts: any) => {
      optionsRef.current.onCountsUpdate?.(counts)
    })

    socket.on("rfq:response", (data: any) => {
      optionsRef.current.onRfqResponse?.(data)
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [])

  return { connected, socket: socketRef.current }
}
