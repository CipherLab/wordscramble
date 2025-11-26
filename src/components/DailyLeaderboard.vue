<template>
  <q-card class="leaderboard-card">
    <q-card-section>
      <div class="text-h6 q-mb-md text-center">
        Daily Leaderboard
        <div class="text-caption text-grey">{{ formatDate(date) }}</div>
      </div>

      <!-- Username Input (if not submitted) -->
      <div v-if="!scoreSubmitted && !submitting" class="q-mb-md">
        <q-input
          v-model="localUsername"
          label="Your Name"
          placeholder="Enter your name"
          outlined
          dense
          maxlength="20"
          :rules="[val => !!val && val.trim().length > 0 || 'Name is required']"
        >
          <template v-slot:append>
            <q-btn
              color="primary"
              label="Submit Score"
              :disable="!localUsername || localUsername.trim().length === 0"
              @click="handleSubmit"
              dense
              no-caps
            />
          </template>
        </q-input>
      </div>

      <!-- Submitting State -->
      <div v-if="submitting" class="text-center q-pa-md">
        <q-spinner color="primary" size="md" />
        <div class="text-caption q-mt-sm">Submitting score...</div>
      </div>

      <!-- Error Message -->
      <q-banner v-if="error" class="bg-negative text-white q-mb-md" dense>
        {{ error }}
      </q-banner>

      <!-- Loading State -->
      <div v-if="loading" class="text-center q-pa-md">
        <q-spinner color="primary" size="md" />
        <div class="text-caption q-mt-sm">Loading leaderboard...</div>
      </div>

      <!-- Leaderboard List -->
      <q-list v-else-if="entries.length > 0" dense separator>
        <q-item
          v-for="(entry, index) in entries.slice(0, 10)"
          :key="index"
          :class="{ 'user-entry': entry.username === localUsername && scoreSubmitted }"
        >
          <q-item-section avatar>
            <q-avatar
              :color="index < 3 ? getMedalColor(index) : 'grey-5'"
              text-color="white"
              size="sm"
            >
              {{ index + 1 }}
            </q-avatar>
          </q-item-section>
          <q-item-section>
            <q-item-label>{{ entry.username }}</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-item-label class="text-bold">{{ entry.score }}</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>

      <!-- No Scores Yet -->
      <div v-else class="text-center text-grey q-pa-md">
        No scores submitted yet. Be the first!
      </div>

      <!-- User Rank (if outside top 10) -->
      <div v-if="userRank && userRank > 10" class="q-mt-md text-center">
        <q-separator class="q-mb-sm" />
        <div class="text-caption">
          Your rank: <span class="text-bold">#{{ userRank }}</span> out of {{ totalPlayers }}
        </div>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useGameStore } from '../stores/gameStore'
import { submitScore, getTopScores, getUserStats } from '../services/leaderboard'
import type { LeaderboardEntry } from '../services/leaderboard'

const props = defineProps<{
  score: number
  date: string
}>()

const gameStore = useGameStore()
const localUsername = ref(gameStore.username)
const scoreSubmitted = ref(gameStore.scoreSubmitted)
const submitting = ref(false)
const loading = ref(true)
const error = ref<string | null>(null)

const entries = ref<LeaderboardEntry[]>([])
const userRank = ref<number | null>(null)
const totalPlayers = ref(0)

onMounted(async () => {
  await loadLeaderboard()
})

// Watch for username changes in the store
watch(() => gameStore.username, (newVal) => {
  localUsername.value = newVal
})

async function loadLeaderboard() {
  try {
    loading.value = true
    error.value = null
    const scores = await getTopScores(props.date)
    entries.value = scores
  } catch (err) {
    console.error('Error loading leaderboard:', err)
    error.value = 'Failed to load leaderboard. Please try again.'
  } finally {
    loading.value = false
  }
}

async function handleSubmit() {
  if (!localUsername.value || localUsername.value.trim().length === 0) {
    return
  }

  try {
    submitting.value = true
    error.value = null

    // Save username to store
    gameStore.setUsername(localUsername.value)

    // Submit score to Firebase
    await submitScore(localUsername.value, props.score, props.date)

    // Mark as submitted
    gameStore.scoreSubmitted = true
    scoreSubmitted.value = true

    // Reload leaderboard and get user stats
    const stats = await getUserStats(localUsername.value, props.score, props.date)
    entries.value = stats.entries
    userRank.value = stats.userRank
    totalPlayers.value = stats.totalPlayers
  } catch (err) {
    console.error('Error submitting score:', err)
    error.value = 'Failed to submit score. Please try again.'
  } finally {
    submitting.value = false
  }
}

function getMedalColor(index: number): string {
  if (index === 0) return 'amber-6'
  if (index === 1) return 'grey-6'
  if (index === 2) return 'orange-9'
  return 'grey-5'
}

function formatDate(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00')
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
}
</script>

<style scoped lang="sass">
.leaderboard-card
  max-width: 500px
  margin: 0 auto

.user-entry
  background: #e3f2fd
  font-weight: 500
</style>
