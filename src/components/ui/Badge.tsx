import { cva, type VariantProps } from "class-variance-authority"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center font-medium rounded-full",
  {
    variants: {
      variant: {
        default: "bg-gray-100 text-gray-600",
        success: "bg-green-50 text-green-700",
        danger: "bg-red-50 text-red-700",
        warning: "bg-amber-50 text-amber-700",
        info: "bg-blue-50 text-blue-700",
        purple: "bg-purple-50 text-purple-700",
      },
      size: {
        sm: "px-2 py-0.5 text-xs gap-1",
        md: "px-2.5 py-1 text-xs gap-1",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "sm",
    },
  }
)

export interface BadgeProps extends VariantProps<typeof badgeVariants> {
  icon?: LucideIcon
  children: React.ReactNode
  className?: string
}

export function Badge({
  variant,
  size,
  icon: Icon,
  children,
  className,
}: BadgeProps) {
  const iconSize = size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"

  return (
    <span className={cn(badgeVariants({ variant, size }), className)}>
      {Icon && <Icon className={iconSize} />}
      {children}
    </span>
  )
}

export { badgeVariants }
