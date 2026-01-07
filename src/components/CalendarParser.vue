<script setup lang="ts">
import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'

interface CalendarEvent {
  summary: string
  description: string
  start: Date
  end: Date
  location?: string
}

const $q = useQuasar()
const icsUrl = ref('')
const dateFrom = ref('')
const dateTo = ref('')
const events = ref<CalendarEvent[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const showPasteDialog = ref(false)
const pastedContent = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

const columns = [
  { name: 'start', label: 'Start', field: 'start', sortable: true, format: (val: Date) => formatDateTime(val) },
  { name: 'end', label: 'End', field: 'end', sortable: true, format: (val: Date) => formatDateTime(val) },
  { name: 'summary', label: 'Summary', field: 'summary', sortable: true },
  { name: 'description', label: 'Description', field: 'description', sortable: false },
  { name: 'location', label: 'Location', field: 'location', sortable: true }
]

function formatDateTime(date: Date): string {
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function parseICSDate(dateStr: string): Date {
  // Handle DTSTART;TZID=... format or DTSTART:... format
  const cleanDate = dateStr.replace(/^[^:]*:/, '')

  // Format: YYYYMMDDTHHMMSSZ or YYYYMMDDTHHMMSS or YYYYMMDD
  if (cleanDate.length === 8) {
    // Date only
    return new Date(
      parseInt(cleanDate.slice(0, 4)),
      parseInt(cleanDate.slice(4, 6)) - 1,
      parseInt(cleanDate.slice(6, 8))
    )
  }

  const year = parseInt(cleanDate.slice(0, 4))
  const month = parseInt(cleanDate.slice(4, 6)) - 1
  const day = parseInt(cleanDate.slice(6, 8))
  const hour = parseInt(cleanDate.slice(9, 11)) || 0
  const minute = parseInt(cleanDate.slice(11, 13)) || 0
  const second = parseInt(cleanDate.slice(13, 15)) || 0

  if (cleanDate.endsWith('Z')) {
    return new Date(Date.UTC(year, month, day, hour, minute, second))
  }

  return new Date(year, month, day, hour, minute, second)
}

function parseICS(icsContent: string): CalendarEvent[] {
  const events: CalendarEvent[] = []
  const lines = icsContent.replace(/\r\n /g, '').replace(/\r\n\t/g, '').split(/\r?\n/)

  let currentEvent: Partial<CalendarEvent> | null = null

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      currentEvent = {}
    } else if (line === 'END:VEVENT' && currentEvent) {
      if (currentEvent.summary && currentEvent.start && currentEvent.end) {
        events.push(currentEvent as CalendarEvent)
      }
      currentEvent = null
    } else if (currentEvent) {
      if (line.startsWith('SUMMARY:') || line.startsWith('SUMMARY;')) {
        currentEvent.summary = line.replace(/^SUMMARY[;:]/, '').replace(/\\n/g, '\n').replace(/\\,/g, ',')
      } else if (line.startsWith('DESCRIPTION:') || line.startsWith('DESCRIPTION;')) {
        currentEvent.description = line.replace(/^DESCRIPTION[;:]/, '').replace(/\\n/g, '\n').replace(/\\,/g, ',')
      } else if (line.startsWith('DTSTART')) {
        currentEvent.start = parseICSDate(line)
      } else if (line.startsWith('DTEND')) {
        currentEvent.end = parseICSDate(line)
      } else if (line.startsWith('LOCATION:') || line.startsWith('LOCATION;')) {
        currentEvent.location = line.replace(/^LOCATION[;:]/, '').replace(/\\n/g, '\n').replace(/\\,/g, ',')
      }
    }
  }

  return events
}

const filteredEvents = computed(() => {
  let filtered = [...events.value]

  if (dateFrom.value) {
    const from = new Date(dateFrom.value)
    from.setHours(0, 0, 0, 0)
    filtered = filtered.filter(e => e.start >= from)
  }

  if (dateTo.value) {
    const to = new Date(dateTo.value)
    to.setHours(23, 59, 59, 999)
    filtered = filtered.filter(e => e.start <= to)
  }

  return filtered.sort((a, b) => a.start.getTime() - b.start.getTime())
})

async function fetchAndParse() {
  if (!icsUrl.value) {
    error.value = 'Please enter an ICS URL'
    return
  }

  loading.value = true
  error.value = null

  try {
    const response = await fetch(icsUrl.value)
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`)
    }
    const icsContent = await response.text()
    events.value = parseICS(icsContent)

    if (events.value.length === 0) {
      error.value = 'No events found in the calendar'
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to fetch calendar'
    if (error.value.includes('NetworkError') || error.value.includes('CORS') || error.value.includes('fetch')) {
      error.value += '. Try uploading a .ics file or pasting the content instead.'
    }
  } finally {
    loading.value = false
  }
}

function handleFileUpload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  loading.value = true
  error.value = null

  const reader = new FileReader()
  reader.onload = (e) => {
    const content = e.target?.result as string
    events.value = parseICS(content)
    loading.value = false

    if (events.value.length === 0) {
      error.value = 'No events found in the calendar'
    } else {
      $q.notify({
        message: `Loaded ${events.value.length} events from file`,
        color: 'positive',
        position: 'top'
      })
    }
  }
  reader.onerror = () => {
    error.value = 'Failed to read file'
    loading.value = false
  }
  reader.readAsText(file)

  // Reset input so same file can be selected again
  input.value = ''
}

function parsePastedContent() {
  if (!pastedContent.value.trim()) {
    error.value = 'Please paste ICS content'
    return
  }

  loading.value = true
  error.value = null
  events.value = parseICS(pastedContent.value)
  loading.value = false
  showPasteDialog.value = false

  if (events.value.length === 0) {
    error.value = 'No events found in the pasted content'
  } else {
    $q.notify({
      message: `Loaded ${events.value.length} events`,
      color: 'positive',
      position: 'top'
    })
    pastedContent.value = ''
  }
}

function copyAsTable() {
  const headers = ['Start', 'End', 'Summary', 'Description', 'Location']
  const rows = filteredEvents.value.map(e => [
    formatDateTime(e.start),
    formatDateTime(e.end),
    e.summary || '',
    e.description || '',
    e.location || ''
  ])

  const tsv = [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n')

  navigator.clipboard.writeText(tsv).then(() => {
    $q.notify({
      message: `Copied ${filteredEvents.value.length} events to clipboard`,
      color: 'positive',
      position: 'top'
    })
  }).catch(() => {
    $q.notify({
      message: 'Failed to copy to clipboard',
      color: 'negative',
      position: 'top'
    })
  })
}

function copyAsMarkdown() {
  const headers = ['Start', 'End', 'Summary', 'Description', 'Location']
  const separator = headers.map(() => '---')
  const rows = filteredEvents.value.map(e => [
    formatDateTime(e.start),
    formatDateTime(e.end),
    e.summary || '',
    (e.description || '').replace(/\n/g, '<br>'),
    e.location || ''
  ])

  const md = [
    '| ' + headers.join(' | ') + ' |',
    '| ' + separator.join(' | ') + ' |',
    ...rows.map(r => '| ' + r.join(' | ') + ' |')
  ].join('\n')

  navigator.clipboard.writeText(md).then(() => {
    $q.notify({
      message: `Copied ${filteredEvents.value.length} events as Markdown`,
      color: 'positive',
      position: 'top'
    })
  }).catch(() => {
    $q.notify({
      message: 'Failed to copy to clipboard',
      color: 'negative',
      position: 'top'
    })
  })
}
</script>

<template>
  <div class="calendar-parser q-pa-md" style="width: 100%; max-width: 1400px;">
    <div class="text-h5 q-mb-md">Calendar Parser</div>

    <q-card class="q-mb-md">
      <q-card-section>
        <div class="row q-col-gutter-md">
          <div class="col-12 col-md-6">
            <q-input
              v-model="icsUrl"
              label="ICS Calendar URL"
              outlined
              placeholder="https://calendar.example.com/calendar.ics"
            >
              <template #prepend>
                <q-icon name="link" />
              </template>
            </q-input>
          </div>
          <div class="col-6 col-md-2">
            <q-input
              v-model="dateFrom"
              label="From Date"
              type="date"
              outlined
            />
          </div>
          <div class="col-6 col-md-2">
            <q-input
              v-model="dateTo"
              label="To Date"
              type="date"
              outlined
            />
          </div>
          <div class="col-12 col-md-2">
            <q-btn
              color="primary"
              label="Fetch URL"
              :loading="loading"
              @click="fetchAndParse"
              class="full-width"
              style="height: 56px;"
            />
          </div>
        </div>
        <div class="row q-col-gutter-md q-mt-sm">
          <div class="col-auto">
            <q-btn
              outline
              color="primary"
              icon="upload_file"
              label="Upload .ics file"
              @click="fileInput?.click()"
            />
            <input
              ref="fileInput"
              type="file"
              accept=".ics"
              style="display: none"
              @change="handleFileUpload"
            />
          </div>
          <div class="col-auto">
            <q-btn
              outline
              color="primary"
              icon="content_paste"
              label="Paste ICS content"
              @click="showPasteDialog = true"
            />
          </div>
        </div>
      </q-card-section>
    </q-card>

    <q-banner v-if="error" class="bg-negative text-white q-mb-md">
      {{ error }}
    </q-banner>

    <q-card v-if="filteredEvents.length > 0">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-subtitle1">{{ filteredEvents.length }} events</div>
        <q-space />
        <q-btn flat icon="content_copy" label="Copy TSV" @click="copyAsTable" class="q-mr-sm" />
        <q-btn flat icon="table_chart" label="Copy Markdown" @click="copyAsMarkdown" />
      </q-card-section>

      <q-card-section>
        <q-table
          :rows="filteredEvents"
          :columns="columns"
          row-key="start"
          flat
          bordered
          wrap-cells
          :pagination="{ rowsPerPage: 50 }"
        >
          <template #body-cell-description="props">
            <q-td :props="props" style="white-space: pre-wrap; max-width: 400px;">
              {{ props.value }}
            </q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>

    <!-- Paste Dialog -->
    <q-dialog v-model="showPasteDialog">
      <q-card style="min-width: 500px; max-width: 800px;">
        <q-card-section>
          <div class="text-h6">Paste ICS Content</div>
        </q-card-section>
        <q-card-section>
          <q-input
            v-model="pastedContent"
            type="textarea"
            outlined
            placeholder="Paste your .ics file content here (starts with BEGIN:VCALENDAR)"
            :rows="12"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn color="primary" label="Parse" @click="parsePastedContent" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<style scoped lang="sass">
.calendar-parser
  margin: 0 auto
</style>
