export interface Leader {
  name: string
  title: string
}

export interface NewsItem {
  headline: string
  date: string
  summary: string
}

export interface CompanyBrief {
  company_name: string
  overview: string
  founded: string
  headquarters: string
  employee_count: string
  leadership: Leader[]
  recent_news: NewsItem[]
  competitors: string[]
  key_insights: string[]
  sources: string[]
}

export type ResearchStep =
  | 'overview'
  | 'news'
  | 'leadership'
  | 'competitors'
  | 'insights'

export interface ResearchProgress {
  step: ResearchStep
  label: string
  status: 'pending' | 'active' | 'complete' | 'error'
  message?: string
}

export interface ResearchState {
  isResearching: boolean
  companyName: string
  progress: ResearchProgress[]
  result: CompanyBrief | null
  error: string | null
}
