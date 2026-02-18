import { AlertTriangle, type LucideIcon } from "lucide-react"

interface WarningBannerProps {
  message: string
  icon?: LucideIcon
  className?: string
}

export default function WarningBanner({
  message,
  icon: Icon = AlertTriangle,
  className,
}: WarningBannerProps) {
  if (!message) return null

  return (
    <div
      className={`bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center gap-2 ${className ?? "mb-6"}`}
    >
      <Icon className="w-4 h-4 text-amber-500 flex-shrink-0" />
      <span className="text-sm text-amber-800">{message}</span>
    </div>
  )
}
