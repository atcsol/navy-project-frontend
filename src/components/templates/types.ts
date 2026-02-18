export type Step = 1 | 2 | 3 | 4 | 5

export interface GmailAccount {
  id: string
  email: string
  isActive: boolean
}

export interface Email {
  id: string
  from: string
  subject: string
  date: string
  snippet: string
}

export interface TabularColumn {
  index: number
  type: string
  suggestedName: string
  headerLabel: string | null
  samples: string[]
}

export interface TabularPattern {
  signature: string
  lineCount: number
  columns: TabularColumn[]
  sampleLines: string[]
  suggestedRegex: string
  suggestedFlags: string
}

export interface EmailAnalysis {
  email: {
    id: string
    from: string
    subject: string
    date: string
  }
  extractedFields: {
    [key: string]: {
      count: number
      samples: string[]
      pattern: string
      frequency?: number
      label?: string
    }
  }
  tabularPatterns?: TabularPattern[]
  bodyPreview: string
  totalFields: number
}

export interface ExtractionRule {
  field: string
  pattern: string
  type: "regex"
  required: boolean
}

export interface TemplateWizardProps {
  mode: "create" | "edit"
  templateId?: string
  initialData?: {
    name: string
    description: string
    senderEmail: string
    subjectFilter: string
    emailQuery: string
    isActive: boolean
    extractionConfig?: any
    webScrapingConfig?: any
  }
  onSave: (payload: any) => Promise<void>
  saveButtonLabel: string
}
