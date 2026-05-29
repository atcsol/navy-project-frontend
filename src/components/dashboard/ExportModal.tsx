"use client"

import React, { useState } from "react"
import { EXPORT_COLUMNS, DEFAULT_EXPORT_COLUMNS } from "@/hooks/useOpportunities"
import { X, Download, CheckSquare, Square } from "lucide-react"

interface ExportModalProps {
  open: boolean
  total: number
  onClose: () => void
  onConfirm: (selectedKeys: string[]) => void
}

export default function ExportModal({ open, total, onClose, onConfirm }: ExportModalProps) {
  const [selected, setSelected] = useState<string[]>(DEFAULT_EXPORT_COLUMNS)

  if (!open) return null

  const toggle = (key: string) =>
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    )

  const allKeys = EXPORT_COLUMNS.map((c) => c.key)
  const allSelected = selected.length === allKeys.length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Exportar para Excel</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {total} registro{total !== 1 ? "s" : ""} serão exportados — escolha as colunas
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3">
          <button
            onClick={() => setSelected(allSelected ? [] : allKeys)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            {allSelected ? <Square className="w-3.5 h-3.5" /> : <CheckSquare className="w-3.5 h-3.5" />}
            {allSelected ? "Desmarcar todas" : "Marcar todas"}
          </button>
          <button
            onClick={() => setSelected(DEFAULT_EXPORT_COLUMNS)}
            className="text-xs font-medium text-gray-500 hover:text-gray-700"
          >
            Restaurar padrão
          </button>
          <span className="ml-auto text-xs text-gray-400">{selected.length} selecionada{selected.length !== 1 ? "s" : ""}</span>
        </div>

        <div className="px-5 py-3 overflow-y-auto grid grid-cols-2 gap-x-4 gap-y-1">
          {EXPORT_COLUMNS.map((c) => {
            const checked = selected.includes(c.key)
            return (
              <label
                key={c.key}
                className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-gray-50 cursor-pointer text-sm text-gray-700"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(c.key)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                {c.header}
              </label>
            )
          })}
        </div>

        <div className="px-5 py-4 border-t border-gray-200 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md"
          >
            Cancelar
          </button>
          <button
            disabled={selected.length === 0}
            onClick={() => onConfirm(selected)}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 rounded-md shadow-sm"
          >
            <Download className="w-4 h-4" />
            Exportar
          </button>
        </div>
      </div>
    </div>
  )
}
