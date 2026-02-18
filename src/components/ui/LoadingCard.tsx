import { Loader2 } from "lucide-react"

interface LoadingCardProps {
  message?: string
}

export default function LoadingCard({ message = "Carregando..." }: LoadingCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center">
      <Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto mb-2" />
      <div className="text-sm text-gray-500">{message}</div>
    </div>
  )
}
