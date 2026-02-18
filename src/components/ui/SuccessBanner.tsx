import { CheckCircle2, XCircle } from "lucide-react"

interface SuccessBannerProps {
  message: string
  onDismiss: () => void
  className?: string
}

export default function SuccessBanner({
  message,
  onDismiss,
  className,
}: SuccessBannerProps) {
  if (!message) return null

  return (
    <div
      className={`bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center justify-between ${className ?? "mb-6"}`}
    >
      <div className="flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
        <span className="text-sm text-green-800">{message}</span>
      </div>
      <button
        onClick={onDismiss}
        className="text-green-400 hover:text-green-600 transition-colors"
      >
        <XCircle className="w-4 h-4" />
      </button>
    </div>
  )
}
