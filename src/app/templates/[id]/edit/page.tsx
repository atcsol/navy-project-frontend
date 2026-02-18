"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { api } from "@/lib/api"
import Navigation from "@/components/Navigation"
import TemplateWizard from "@/components/templates/TemplateWizard"

export default function EditTemplatePage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const templateId = params.id as string

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [initialData, setInitialData] = useState<any>(null)

  // Load template data
  useEffect(() => {
    if (!user || !templateId) return

    const loadTemplate = async () => {
      try {
        setLoading(true)
        const response = await api.get(`/templates/${templateId}`)
        const template = response.data

        setInitialData({
          name: template.name,
          description: template.description || "",
          senderEmail: template.senderEmail || "",
          subjectFilter: template.subjectFilter || "",
          emailQuery: template.emailQuery || "",
          isActive: template.isActive,
          extractionConfig: template.extractionConfig,
          webScrapingConfig: template.webScrapingConfig,
        })
      } catch (err: any) {
        setError(err.response?.data?.message || "Erro ao carregar template")
      } finally {
        setLoading(false)
      }
    }

    loadTemplate()
  }, [user, templateId])

  const handleSave = async (payload: any) => {
    await api.patch(`/templates/${templateId}`, payload)
    router.push("/templates")
  }

  if (!user || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Carregando...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600">{error}</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      <TemplateWizard
        mode="edit"
        templateId={templateId}
        initialData={initialData}
        onSave={handleSave}
        saveButtonLabel="Salvar Alterações"
      />
    </div>
  )
}
