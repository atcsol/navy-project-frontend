"use client"

import React from "react"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export default function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between mt-4 px-1">
      <span className="text-xs text-gray-400">
        Pagina {page} de {totalPages}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(1)}
          disabled={page === 1}
          className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Primeira"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {(() => {
          const pages: (number | string)[] = []
          const maxVisible = 7
          if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) pages.push(i)
          } else {
            pages.push(1)
            const start = Math.max(2, page - 2)
            const end = Math.min(totalPages - 1, page + 2)
            if (start > 2) pages.push("...")
            for (let i = start; i <= end; i++) pages.push(i)
            if (end < totalPages - 1) pages.push("...")
            pages.push(totalPages)
          }
          return pages.map((p, idx) =>
            typeof p === "string" ? (
              <span key={`ellipsis-${idx}`} className="px-1 text-xs text-gray-400">...</span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={`min-w-[28px] h-7 px-1.5 text-xs font-medium rounded transition-colors ${
                  p === page
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {p}
              </button>
            )
          )
        })()}

        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Proxima"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={page === totalPages}
          className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Ultima"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
