import { cn } from "@/lib/utils"

export interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  padding?: "none" | "sm" | "md" | "lg"
}

const paddingMap = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
} as const

export function Card({
  children,
  className,
  hover = false,
  padding = "md",
}: CardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-lg border border-gray-200 shadow-sm",
        paddingMap[padding],
        hover && "hover:shadow-md transition-shadow",
        className
      )}
    >
      {children}
    </div>
  )
}
