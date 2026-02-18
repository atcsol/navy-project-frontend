"use client"

import { forwardRef } from "react"
import { cn } from "@/lib/utils"

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id, ...rest }, ref) => {
    const checkboxId = id || label?.toLowerCase().replace(/\s+/g, "-")

    if (label) {
      return (
        <label
          htmlFor={checkboxId}
          className="inline-flex items-center gap-2 cursor-pointer"
        >
          <input
            ref={ref}
            type="checkbox"
            id={checkboxId}
            className={cn(
              "rounded border-gray-300 text-blue-600 focus:ring-blue-500",
              className
            )}
            {...rest}
          />
          <span className="text-sm text-gray-700">{label}</span>
        </label>
      )
    }

    return (
      <input
        ref={ref}
        type="checkbox"
        id={checkboxId}
        className={cn(
          "rounded border-gray-300 text-blue-600 focus:ring-blue-500",
          className
        )}
        {...rest}
      />
    )
  }
)

Checkbox.displayName = "Checkbox"

export { Checkbox }
