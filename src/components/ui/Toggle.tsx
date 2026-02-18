"use client"

import { cn } from "@/lib/utils"

export interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  disabled?: boolean
  className?: string
}

export function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
  className,
}: ToggleProps) {
  return (
    <label
      className={cn(
        "inline-flex items-center gap-2",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        className
      )}
    >
      <div className="relative">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
        />
        <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 transition-colors" />
        <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm peer-checked:translate-x-4 transition-transform" />
      </div>
      {label && <span className="text-sm text-gray-700">{label}</span>}
    </label>
  )
}
