import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value)
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "-"
  const d = typeof date === "string" ? new Date(date) : date
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(d)
}

export function getDaysUntil(date: Date | string | null | undefined): number | null {
  if (!date) return null
  const target = typeof date === "string" ? new Date(date) : date
  const now = new Date()
  const diff = target.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function getUrgencyColor(urgency: string | null | undefined): string {
  switch (urgency) {
    case "critical":
      return "text-red-600 bg-red-50"
    case "high":
      return "text-orange-600 bg-orange-50"
    case "medium":
      return "text-yellow-600 bg-yellow-50"
    case "low":
      return "text-green-600 bg-green-50"
    case "expired":
      return "text-gray-600 bg-gray-50"
    default:
      return "text-gray-600 bg-gray-50"
  }
}
