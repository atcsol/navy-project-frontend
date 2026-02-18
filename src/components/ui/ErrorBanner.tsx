import { AlertTriangle, XCircle } from "lucide-react"

interface ErrorBannerProps {
  message: string
  onDismiss: () => void
  className?: string
}

export default function ErrorBanner({
  message,
  onDismiss,
  className,
}: ErrorBannerProps) {
  if (!message) return null

  return (
    <div
      className={`bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center justify-between ${className ?? "mb-6"}`}
    >
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
        <span className="text-sm text-red-800">{message}</span>
      </div>
      <button
        onClick={onDismiss}
        className="text-red-400 hover:text-red-600 transition-colors"
      >
        <XCircle className="w-4 h-4" />
      </button>
    </div>
  )
}
