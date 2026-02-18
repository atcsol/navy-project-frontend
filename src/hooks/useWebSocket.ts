"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import { io, Socket } from "socket.io-client"

const WS_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001").replace("/api", "") + "/ws"

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

    const socket = io(WS_URL, {
      query: { token },
      transports: ["websocket", "polling"],
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
