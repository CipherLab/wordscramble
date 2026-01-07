// Pinia store for Company Research Agent state

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  CompanyBrief,
  ResearchProgress,
  ResearchStep,
} from '../types/companyResearch'

const DEFAULT_PROGRESS: ResearchProgress[] = [
  { step: 'overview', label: 'Company overview', status: 'pending' },
  { step: 'news', label: 'Recent news', status: 'pending' },
  { step: 'leadership', label: 'Leadership team', status: 'pending' },
  { step: 'competitors', label: 'Competitive landscape', status: 'pending' },
  { step: 'insights', label: 'Key insights', status: 'pending' },
]

export const useCompanyResearchStore = defineStore('companyResearch', () => {
  // State
  const isResearching = ref(false)
  const companyName = ref('')
  const progress = ref<ResearchProgress[]>([...DEFAULT_PROGRESS])
  const result = ref<CompanyBrief | null>(null)
  const error = ref<string | null>(null)

  // Computed
  const currentStep = computed(() =>
    progress.value.find((p) => p.status === 'active')
  )

  const completedSteps = computed(() =>
    progress.value.filter((p) => p.status === 'complete').length
  )

  const totalSteps = computed(() => progress.value.length)

  const progressPercentage = computed(() =>
    Math.round((completedSteps.value / totalSteps.value) * 100)
  )

  // Actions
  function resetProgress() {
    progress.value = DEFAULT_PROGRESS.map((p) => ({ ...p, status: 'pending' }))
    result.value = null
    error.value = null
  }

  function updateStepStatus(
    step: ResearchStep,
    status: ResearchProgress['status'],
    message?: string
  ) {
    const stepIndex = progress.value.findIndex((p) => p.step === step)
    const existing = progress.value[stepIndex]
    if (stepIndex !== -1 && existing) {
      progress.value[stepIndex] = {
        step: existing.step,
        label: existing.label,
        status,
        message,
      }
    }
  }

  async function startResearch(company: string) {
    if (!company.trim()) {
      error.value = 'Please enter a company name'
      return
    }

    companyName.value = company.trim()
    isResearching.value = true
    resetProgress()

    try {
      // Simulate the research process with step-by-step updates
      // In production, this would call the n8n webhook and receive SSE updates

      const steps: ResearchStep[] = [
        'overview',
        'news',
        'leadership',
        'competitors',
        'insights',
      ]

      for (const step of steps) {
        updateStepStatus(step, 'active')

        // Simulate API call delay (1-2 seconds per step)
        await simulateStepDelay(step)

        updateStepStatus(step, 'complete')
      }

      // Generate mock result (in production, this comes from n8n)
      result.value = generateMockBrief(companyName.value)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Research failed'
      const activeStep = progress.value.find((p) => p.status === 'active')
      if (activeStep) {
        updateStepStatus(activeStep.step, 'error', 'Failed to complete')
      }
    } finally {
      isResearching.value = false
    }
  }

  async function startResearchWithWebhook(company: string, webhookUrl: string) {
    if (!company.trim()) {
      error.value = 'Please enter a company name'
      return
    }

    companyName.value = company.trim()
    isResearching.value = true
    resetProgress()

    try {
      // Start all steps as pending
      updateStepStatus('overview', 'active')

      // Convert n8n URLs to use the Vite proxy to avoid CORS issues
      const proxyUrl = convertToProxyUrl(webhookUrl)

      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ company: companyName.value }),
      })

      if (!response.ok) {
        throw new Error(`Research failed: ${response.statusText}`)
      }

      // Mark all steps as complete since we got a response
      const steps: ResearchStep[] = [
        'overview',
        'news',
        'leadership',
        'competitors',
        'insights',
      ]
      for (const step of steps) {
        updateStepStatus(step, 'complete')
      }

      let data = await response.json()

      // Handle array-wrapped responses (n8n often returns arrays)
      if (Array.isArray(data)) {
        data = data[0]
      }

      // Normalize the response to handle missing optional fields
      result.value = normalizeCompanyBrief(data)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Research failed'
      const activeStep = progress.value.find((p) => p.status === 'active')
      if (activeStep) {
        updateStepStatus(activeStep.step, 'error', 'Failed to complete')
      }
    } finally {
      isResearching.value = false
    }
  }

  function clearResults() {
    companyName.value = ''
    resetProgress()
    isResearching.value = false
  }

  return {
    // State
    isResearching,
    companyName,
    progress,
    result,
    error,

    // Computed
    currentStep,
    completedSteps,
    totalSteps,
    progressPercentage,

    // Actions
    startResearch,
    startResearchWithWebhook,
    clearResults,
    resetProgress,
  }
})

// Helper: Normalize API response to CompanyBrief structure with defaults for missing fields
function normalizeCompanyBrief(data: Record<string, unknown>): CompanyBrief {
  return {
    company_name: (data.company_name as string) || 'Unknown Company',
    overview: (data.overview as string) || '',
    founded: (data.founded as string) || 'N/A',
    headquarters: (data.headquarters as string) || 'N/A',
    employee_count: (data.employee_count as string) || 'N/A',
    leadership: Array.isArray(data.leadership)
      ? data.leadership.map((l: Record<string, string>) => ({
          name: l.name || 'Unknown',
          title: l.title || 'Unknown',
        }))
      : [],
    recent_news: Array.isArray(data.recent_news)
      ? data.recent_news.map((n: Record<string, string>) => ({
          headline: n.headline || '',
          date: n.date || '',
          summary: n.summary || '',
        }))
      : [],
    competitors: Array.isArray(data.competitors) ? data.competitors as string[] : [],
    key_insights: Array.isArray(data.key_insights) ? data.key_insights as string[] : [],
    sources: Array.isArray(data.sources) ? data.sources as string[] : [],
  }
}

// Helper: Convert n8n webhook URLs to use Vite proxy (avoids CORS in development)
function convertToProxyUrl(url: string): string {
  try {
    const parsed = new URL(url)
    // Check if this is pointing to the local n8n instance
    if (parsed.hostname === '192.168.2.36' && parsed.port === '5678') {
      // Use Vite proxy: /api/n8n proxies to http://192.168.2.36:5678
      return `/api/n8n${parsed.pathname}${parsed.search}`
    }
    // Return original URL for other endpoints
    return url
  } catch {
    // If URL parsing fails, return as-is
    return url
  }
}

// Helper: Simulate delay for each research step
function simulateStepDelay(step: ResearchStep): Promise<void> {
  const delays: Record<ResearchStep, number> = {
    overview: 1200,
    news: 1500,
    leadership: 1000,
    competitors: 1300,
    insights: 1800,
  }
  return new Promise((resolve) => setTimeout(resolve, delays[step]))
}

// Helper: Generate mock brief for demo purposes
function generateMockBrief(company: string): CompanyBrief {
  return {
    company_name: company,
    overview: `${company} is a leading provider of enterprise solutions, specializing in innovative technology services for Fortune 500 companies. The company has established itself as a market leader through strategic partnerships and continuous innovation.`,
    founded: '2015',
    headquarters: 'San Francisco, CA',
    employee_count: '500-1000',
    leadership: [
      { name: 'Sarah Chen', title: 'Chief Executive Officer' },
      { name: 'Michael Torres', title: 'Chief Technology Officer' },
      { name: 'Emily Watson', title: 'Chief Financial Officer' },
      { name: 'David Kim', title: 'VP of Engineering' },
    ],
    recent_news: [
      {
        headline: `${company} Announces $75M Series C Funding Round`,
        date: '2024-12-10',
        summary:
          'The funding will be used to expand international operations and accelerate product development.',
      },
      {
        headline: `${company} Partners with Microsoft for Cloud Integration`,
        date: '2024-11-28',
        summary:
          'Strategic partnership to bring seamless Azure integration to enterprise customers.',
      },
      {
        headline: `${company} Named to Forbes Cloud 100 List`,
        date: '2024-10-15',
        summary:
          'Recognition as one of the top private cloud companies for the second consecutive year.',
      },
    ],
    competitors: [
      'Salesforce',
      'ServiceNow',
      'Workday',
      'SAP',
      'Oracle Cloud',
    ],
    key_insights: [
      'Strong growth trajectory with 150% YoY revenue increase',
      'Expanding aggressively into European markets in 2025',
      'Recent C-suite hires signal push into enterprise AI solutions',
      'Customer base concentrated in financial services (40%) and healthcare (25%)',
      'Product roadmap emphasizes AI-powered automation features',
    ],
    sources: [
      'https://www.crunchbase.com/organization/example',
      'https://www.linkedin.com/company/example',
      'https://techcrunch.com/tag/example',
      'https://www.forbes.com/cloud100',
    ],
  }
}
