"use client"

import { forwardRef } from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2, type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-sm",
        secondary:
          "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50",
        danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
        ghost: "text-gray-600 bg-gray-100 hover:bg-gray-200",
        success: "bg-green-600 text-white hover:bg-green-700 shadow-sm",
      },
      size: {
        xs: "px-2 py-1 text-xs gap-1",
        sm: "px-2.5 py-1.5 text-xs gap-1",
        md: "px-4 py-2 text-sm gap-1.5",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
  icon?: LucideIcon
  iconPosition?: "left" | "right"
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      loading,
      icon: Icon,
      iconPosition = "left",
      disabled,
      children,
      ...rest
    },
    ref
  ) => {
    const iconSize = size === "xs" || size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"

    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        {...rest}
      >
        {loading && <Loader2 className={cn(iconSize, "animate-spin")} />}
        {!loading && Icon && iconPosition === "left" && (
          <Icon className={iconSize} />
        )}
        {children}
        {!loading && Icon && iconPosition === "right" && (
          <Icon className={iconSize} />
        )}
      </button>
    )
  }
)

Button.displayName = "Button"

export { Button, buttonVariants }
