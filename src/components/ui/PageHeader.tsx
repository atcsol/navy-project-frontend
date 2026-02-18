import type { LucideIcon } from "lucide-react"

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: {
    label: string
    icon?: LucideIcon
    onClick: () => void
  }
  children?: React.ReactNode
}

export default function PageHeader({
  title,
  subtitle,
  action,
  children,
}: PageHeaderProps) {
  return (
    <div className="flex justify-between items-center mb-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        {subtitle && (
          <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {children}
        {action && (
          <button
            onClick={action.onClick}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 shadow-sm transition-colors"
          >
            {action.icon && <action.icon className="w-4 h-4" />}
            {action.label}
          </button>
        )}
      </div>
    </div>
  )
}
