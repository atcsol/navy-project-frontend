import type { LucideIcon } from "lucide-react"

interface EmptyStateProps {
  icon: LucideIcon
  message: string
  action?: {
    label: string
    icon?: LucideIcon
    onClick: () => void
  }
}

export default function EmptyState({ icon: Icon, message, action }: EmptyStateProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center">
      <Icon className="w-8 h-8 text-gray-300 mx-auto mb-3" />
      <div className="text-sm text-gray-400 mb-4">{message}</div>
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
  )
}
