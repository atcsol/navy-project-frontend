"use client"

import { forwardRef } from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  icon?: LucideIcon
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, icon: Icon, id, ...rest }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-")

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {Icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Icon className="w-4 h-4 text-gray-400" />
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "w-full px-3 py-2.5 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400 transition-shadow",
              error ? "border-red-300" : "border-gray-300",
              Icon && "pl-9",
              className
            )}
            {...rest}
          />
        </div>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        {hint && !error && (
          <p className="mt-1 text-xs text-gray-500">{hint}</p>
        )}
      </div>
    )
  }
)

Input.displayName = "Input"

export { Input }
