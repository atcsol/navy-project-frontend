"use client"

import { forwardRef } from "react"
import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, id, ...rest }, ref) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, "-")

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            "w-full px-3 py-2.5 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400 transition-shadow",
            error ? "border-red-300" : "border-gray-300",
            className
          )}
          {...rest}
        />
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        {hint && !error && (
          <p className="mt-1 text-xs text-gray-500">{hint}</p>
        )}
      </div>
    )
  }
)

Textarea.displayName = "Textarea"

export { Textarea }
