<script setup lang="ts">
import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'
import { useCompanyResearchStore } from '../stores/companyResearchStore'

const $q = useQuasar()
const store = useCompanyResearchStore()

const companyInput = ref('')
const webhookUrl = ref('')
const useWebhook = ref(false)

const canSubmit = computed(() => companyInput.value.trim().length > 0)

// Safe result accessor that guarantees all fields exist
const safeResult = computed(() => {
  const r = store.result
  if (!r) return null
  return {
    company_name: r.company_name || 'Unknown Company',
    overview: r.overview || '',
    founded: r.founded || 'N/A',
    headquarters: r.headquarters || 'N/A',
    employee_count: r.employee_count || 'N/A',
    leadership: r.leadership || [],
    recent_news: r.recent_news || [],
    competitors: r.competitors || [],
    key_insights: r.key_insights || [],
    sources: r.sources || [],
  }
})

async function handleSubmit() {
  if (!canSubmit.value) return

  if (useWebhook.value && webhookUrl.value.trim()) {
    await store.startResearchWithWebhook(
      companyInput.value,
      webhookUrl.value.trim()
    )
  } else {
    await store.startResearch(companyInput.value)
  }
}

function handleNewSearch() {
  companyInput.value = ''
  store.clearResults()
}

function copyToClipboard() {
  if (!safeResult.value) return

  const text = formatBriefAsText()
  navigator.clipboard.writeText(text).then(() => {
    $q.notify({
      type: 'positive',
      message: 'Copied to clipboard',
      timeout: 2000,
    })
  })
}

function formatBriefAsText() {
  const brief = safeResult.value
  if (!brief) return ''

  const sections = [`# ${brief.company_name}`, brief.overview]

  // Company Info
  const info = []
  if (brief.founded !== 'N/A') info.push(`- Founded: ${brief.founded}`)
  if (brief.headquarters !== 'N/A') info.push(`- Headquarters: ${brief.headquarters}`)
  if (brief.employee_count !== 'N/A') info.push(`- Employees: ${brief.employee_count}`)
  if (info.length) sections.push('## Company Info', ...info)

  // Leadership
  if (brief.leadership.length) {
    sections.push('## Leadership', ...brief.leadership.map((l) => `- ${l.name}, ${l.title}`))
  }

  // Recent News
  if (brief.recent_news.length) {
    sections.push('## Recent News', ...brief.recent_news.map((n) => `- ${n.headline}${n.date ? ` (${n.date})` : ''}\n  ${n.summary}`))
  }

  // Competitors
  if (brief.competitors.length) {
    sections.push('## Competitors', brief.competitors.join(', '))
  }

  // Key Insights
  if (brief.key_insights.length) {
    sections.push('## Key Insights', ...brief.key_insights.map((i) => `- ${i}`))
  }

  // Sources
  if (brief.sources.length) {
    sections.push('## Sources', ...brief.sources)
  }

  return sections.join('\n\n').trim()
}
</script>

<template>
  <div class="company-research">
    <!-- Header -->
    <div class="text-center q-mb-xl">
      <h1 class="text-h3 q-mb-sm">Company Intelligence</h1>
      <p class="text-subtitle1 text-grey">
        AI-powered company research in seconds
      </p>
    </div>

    <!-- Search Form (shown when not researching and no results) -->
    <q-card v-if="!store.isResearching && !store.result" class="q-pa-lg">
      <q-form @submit.prevent="handleSubmit">
        <div class="search-row q-mb-md">
          <q-input
            v-model="companyInput"
            label="Enter company name"
            outlined
            class="search-input"
            :disable="store.isResearching"
          >
            <template v-slot:prepend>
              <q-icon name="business" />
            </template>
          </q-input>
          <q-btn
            type="submit"
            color="primary"
            size="lg"
            label="Research"
            icon="search"
            :disable="!canSubmit || store.isResearching"
            :loading="store.isResearching"
          />
        </div>

        <!-- Webhook Configuration (collapsible) -->
        <q-expansion-item
          v-model="useWebhook"
          icon="settings"
          label="n8n Webhook Configuration"
          caption="Connect to your n8n workflow"
          class="q-mt-md"
        >
          <q-card>
            <q-card-section>
              <q-input
                v-model="webhookUrl"
                label="Webhook URL"
                outlined
                dense
                placeholder="https://your-n8n.app.n8n.cloud/webhook/company-research"
              >
                <template v-slot:prepend>
                  <q-icon name="link" />
                </template>
              </q-input>
              <p class="text-caption text-grey q-mt-sm">
                Leave empty to use demo mode with simulated results
              </p>
            </q-card-section>
          </q-card>
        </q-expansion-item>
      </q-form>

      <!-- Error Message -->
      <q-banner v-if="store.error" class="bg-negative text-white q-mt-md">
        <template v-slot:avatar>
          <q-icon name="error" />
        </template>
        {{ store.error }}
      </q-banner>
    </q-card>

    <!-- Progress Card (shown while researching) -->
    <q-card v-if="store.isResearching" class="q-pa-lg">
      <div class="text-h6 q-mb-md">
        <q-spinner-dots color="primary" size="1.5em" class="q-mr-sm" />
        Researching {{ store.companyName }}...
      </div>

      <q-linear-progress
        :value="store.progressPercentage / 100"
        color="primary"
        class="q-mb-lg"
        size="8px"
        rounded
      />

      <q-list>
        <q-item v-for="step in store.progress" :key="step.step" class="step-item">
          <q-item-section avatar>
            <q-icon
              v-if="step.status === 'complete'"
              name="check_circle"
              color="positive"
              size="sm"
            />
            <q-spinner-dots
              v-else-if="step.status === 'active'"
              color="primary"
              size="1.2em"
            />
            <q-icon
              v-else-if="step.status === 'error'"
              name="error"
              color="negative"
              size="sm"
            />
            <q-icon v-else name="radio_button_unchecked" color="grey-5" size="sm" />
          </q-item-section>
          <q-item-section>
            <q-item-label :class="{ 'text-grey-5': step.status === 'pending' }">
              {{ step.label }}
            </q-item-label>
            <q-item-label v-if="step.message" caption class="text-negative">
              {{ step.message }}
            </q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-card>

    <!-- Results Card (shown when we have results) -->
    <div v-if="safeResult && !store.isResearching" class="results-container">
      <!-- Company Header -->
      <q-card class="q-pa-lg q-mb-md">
        <div class="row items-center justify-between q-mb-md">
          <div class="text-h4">{{ safeResult.company_name }}</div>
          <div class="actions-row">
            <q-btn
              flat
              round
              icon="content_copy"
              @click="copyToClipboard"
            >
              <q-tooltip>Copy to clipboard</q-tooltip>
            </q-btn>
            <q-btn
              flat
              round
              icon="refresh"
              @click="handleNewSearch"
            >
              <q-tooltip>New search</q-tooltip>
            </q-btn>
          </div>
        </div>

        <p class="text-body1 q-mb-lg">{{ safeResult.overview }}</p>

        <div class="company-meta row q-gutter-md">
          <q-chip v-if="safeResult.founded !== 'N/A'" icon="event" outline>
            Founded {{ safeResult.founded }}
          </q-chip>
          <q-chip v-if="safeResult.headquarters !== 'N/A'" icon="location_on" outline>
            {{ safeResult.headquarters }}
          </q-chip>
          <q-chip v-if="safeResult.employee_count !== 'N/A'" icon="people" outline>
            {{ safeResult.employee_count }} employees
          </q-chip>
        </div>
      </q-card>

      <!-- Leadership Section -->
      <q-card v-if="safeResult.leadership.length > 0" class="q-pa-lg q-mb-md">
        <div class="text-h6 q-mb-md">
          <q-icon name="groups" class="q-mr-sm" />
          Leadership
        </div>
        <div class="row q-gutter-md">
          <q-card
            v-for="leader in safeResult.leadership"
            :key="leader.name"
            flat
            bordered
            class="leader-card"
          >
            <q-card-section>
              <div class="text-subtitle1">{{ leader.name }}</div>
              <div class="text-caption text-grey">{{ leader.title }}</div>
            </q-card-section>
          </q-card>
        </div>
      </q-card>

      <!-- Recent News Section -->
      <q-card v-if="safeResult.recent_news.length > 0" class="q-pa-lg q-mb-md">
        <div class="text-h6 q-mb-md">
          <q-icon name="newspaper" class="q-mr-sm" />
          Recent News
        </div>
        <q-list separator>
          <q-item v-for="news in safeResult.recent_news" :key="news.headline">
            <q-item-section>
              <q-item-label class="text-weight-medium">
                {{ news.headline }}
              </q-item-label>
              <q-item-label v-if="news.date" caption>{{ news.date }}</q-item-label>
              <q-item-label class="q-mt-sm text-body2">
                {{ news.summary }}
              </q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card>

      <!-- Competitors Section -->
      <q-card v-if="safeResult.competitors.length > 0" class="q-pa-lg q-mb-md">
        <div class="text-h6 q-mb-md">
          <q-icon name="compare_arrows" class="q-mr-sm" />
          Competitors
        </div>
        <div class="row q-gutter-sm">
          <q-chip
            v-for="competitor in safeResult.competitors"
            :key="competitor"
            color="primary"
            text-color="white"
            outline
          >
            {{ competitor }}
          </q-chip>
        </div>
      </q-card>

      <!-- Key Insights Section -->
      <q-card v-if="safeResult.key_insights.length > 0" class="q-pa-lg q-mb-md">
        <div class="text-h6 q-mb-md">
          <q-icon name="lightbulb" class="q-mr-sm" />
          Key Insights
        </div>
        <q-list>
          <q-item v-for="(insight, index) in safeResult.key_insights" :key="index">
            <q-item-section avatar>
              <q-icon name="arrow_right" color="primary" />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ insight }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card>

      <!-- Sources Section -->
      <q-card v-if="safeResult.sources.length > 0" class="q-pa-lg">
        <div class="text-h6 q-mb-md">
          <q-icon name="source" class="q-mr-sm" />
          Sources
        </div>
        <q-list dense>
          <q-item
            v-for="source in safeResult.sources"
            :key="source"
            clickable
            tag="a"
            :href="source"
            target="_blank"
          >
            <q-item-section avatar>
              <q-icon name="link" size="xs" color="grey" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="text-primary">{{ source }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card>
    </div>

    <!-- How It Works (shown on initial state) -->
    <q-card
      v-if="!store.isResearching && !safeResult"
      class="q-pa-md q-mt-lg"
      flat
      bordered
    >
      <div class="text-subtitle2 q-mb-sm">How It Works</div>
      <ol class="how-it-works-list">
        <li>Enter a company name and click "Research"</li>
        <li>Our AI agent searches multiple sources in parallel</li>
        <li>Results are synthesized into a comprehensive brief</li>
        <li>Get leadership, news, competitors, and key insights in seconds</li>
      </ol>

      <q-separator class="q-my-md" />

      <div class="text-subtitle2 q-mb-sm">What Makes This Agentic?</div>
      <ul class="how-it-works-list">
        <li>The AI <strong>decides</strong> which searches to run based on findings</li>
        <li>If the company is public, it triggers SEC lookup automatically</li>
        <li>It synthesizes across sources, not just concatenates results</li>
        <li>Each brief is dynamically structured based on available data</li>
      </ul>
    </q-card>
  </div>
</template>

<style scoped>
.company-research {
  padding-top: 2rem;
  max-width: 800px;
  margin: 0 auto;
}

.search-row {
  display: flex;
  gap: 1rem;
  align-items: stretch;
}

.search-input {
  flex: 1;
}

.step-item {
  min-height: 48px;
}

.results-container {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.company-meta {
  flex-wrap: wrap;
}

.leader-card {
  min-width: 180px;
  flex: 1;
  max-width: 220px;
}

.actions-row {
  display: flex;
  gap: 0.25rem;
}

.how-it-works-list {
  margin: 0;
  padding-left: 1.25rem;
}

.how-it-works-list li {
  margin-bottom: 0.5rem;
}

.how-it-works-list li:last-child {
  margin-bottom: 0;
}

/* Dark mode adjustments */
:deep(.body--dark) .leader-card {
  background-color: rgba(255, 255, 255, 0.05);
}
</style>
