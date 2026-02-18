"use client"

import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { api } from "@/lib/api"
import Navigation from "@/components/Navigation"
import TemplateWizard from "@/components/templates/TemplateWizard"

export default function NewTemplatePage() {
  const { user } = useAuth()
  const router = useRouter()

  const handleSave = async (payload: any) => {
    await api.post(`/templates`, payload)
    router.push("/templates")
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      <TemplateWizard
        mode="create"
        onSave={handleSave}
        saveButtonLabel="Criar Template"
      />
    </div>
  )
}
