"use client"

import { useEffect, useCallback } from "react"

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  maxWidth?: string
}

function ModalFooter({ children }: { children: React.ReactNode }) {
  return <div className="flex justify-end gap-2 mt-6">{children}</div>
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = "max-w-md",
}: ModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    },
    [onClose]
  )

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown)
      return () => document.removeEventListener("keydown", handleKeyDown)
    }
  }, [open, handleKeyDown])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className={`bg-white rounded-lg border border-gray-200 shadow-xl p-6 w-full ${maxWidth}`}
      >
        <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
        {children}
      </div>
    </div>
  )
}

Modal.Footer = ModalFooter
