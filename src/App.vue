<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useQuasar } from 'quasar'
import { useGameStore } from './stores/gameStore'
import { loadDictionary } from './constants/dictionary'
import GameBoard from './components/GameBoard.vue'
import HexGemGame from './components/HexGemGame.vue'
import DailyLeaderboard from './components/DailyLeaderboard.vue'
import type { GameMode } from './stores/gameStore'

const route = useRoute()
const $q = useQuasar()
const gameStore = useGameStore()
const dictionaryLoading = ref(true)
const dictionaryError = ref<string | null>(null)
const showLeaderboardDialog = ref(false)
const isHexMode = ref(false)

// Dark mode setup
const isDarkMode = ref($q.dark.isActive)

function toggleDarkMode() {
  $q.dark.toggle()
  isDarkMode.value = $q.dark.isActive
  localStorage.setItem('wordscramble_darkmode', $q.dark.isActive ? 'true' : 'false')
}

onMounted(async () => {
  // Initialize dark mode from localStorage
  const savedDarkMode = localStorage.getItem('wordscramble_darkmode')
  if (savedDarkMode !== null) {
    $q.dark.set(savedDarkMode === 'true')
    isDarkMode.value = $q.dark.isActive
  }

  try {
    await loadDictionary()
    // Check if hex mode
    isHexMode.value = route.meta.mode === 'hex'
    // Start game based on current route (only for non-hex modes)
    if (!isHexMode.value) {
      const mode = (route.meta.mode as GameMode) || 'random'
      gameStore.startGame(mode)
    }
  } catch (error) {
    dictionaryError.value = error instanceof Error ? error.message : 'Failed to load dictionary'
  } finally {
    dictionaryLoading.value = false
  }
})

// Watch for route changes and start game with appropriate mode
watch(() => route.path, () => {
  if (!dictionaryLoading.value && !dictionaryError.value) {
    isHexMode.value = route.meta.mode === 'hex'
    if (!isHexMode.value) {
      const mode = (route.meta.mode as GameMode) || 'random'
      gameStore.startGame(mode)
    }
  }
})

function reloadPage() {
  window.location.reload()
}

function formatDate(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00')
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}
</script>

<template>
  <q-layout view="hHh lpR fFf">
    <q-header elevated class="bg-primary">
      <q-toolbar>
        <q-toolbar-title>
          Word Scramble
          <div v-if="gameStore.gameMode === 'daily' && gameStore.dailyDate" class="text-caption">
            Daily Puzzle: {{ formatDate(gameStore.dailyDate) }}
          </div>
        </q-toolbar-title>
        <q-btn-group flat>
          <q-btn
            flat
            :outline="gameStore.gameMode === 'random' && !isHexMode"
            label="Random"
            :to="'/'"
          >
            <q-tooltip>Random puzzle with different letters each game</q-tooltip>
          </q-btn>
          <q-btn
            flat
            :outline="gameStore.gameMode === 'daily' && !isHexMode"
            label="Daily"
            :to="'/daily'"
          >
            <q-tooltip>Daily puzzle - same for everyone today</q-tooltip>
          </q-btn>
          <q-btn
            flat
            :outline="isHexMode"
            label="Hex"
            :to="'/hex'"
          >
            <q-tooltip>Physics-based hex gem word game</q-tooltip>
          </q-btn>
        </q-btn-group>
        <q-btn
          v-if="gameStore.gameMode === 'daily' && !isHexMode"
          flat
          round
          dense
          icon="leaderboard"
          @click="showLeaderboardDialog = true"
        >
          <q-tooltip>View Leaderboard</q-tooltip>
        </q-btn>
        <q-btn
          v-if="!isHexMode"
          flat
          round
          dense
          icon="refresh"
          @click="gameStore.startGame()"
        >
          <q-tooltip>New Game</q-tooltip>
        </q-btn>
        <q-btn
          flat
          round
          dense
          :icon="isDarkMode ? 'light_mode' : 'dark_mode'"
          @click="toggleDarkMode"
        >
          <q-tooltip>{{ isDarkMode ? 'Light Mode' : 'Dark Mode' }}</q-tooltip>
        </q-btn>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <q-page class="flex flex-center">
        <!-- Loading Dictionary -->
        <div v-if="dictionaryLoading" class="loading-container">
          <q-spinner-dots color="primary" size="xl" />
          <div class="text-h6 q-mt-md">Loading dictionary...</div>
        </div>

        <!-- Dictionary Error -->
        <div v-else-if="dictionaryError" class="error-container">
          <q-icon name="error" color="negative" size="xl" />
          <div class="text-h6 q-mt-md text-negative">{{ dictionaryError }}</div>
          <q-btn
            color="primary"
            label="Reload"
            class="q-mt-md"
            @click="reloadPage"
          />
        </div>

        <!-- Game Board -->
        <HexGemGame v-else-if="isHexMode" />
        <GameBoard v-else />
      </q-page>
    </q-page-container>

    <!-- Leaderboard Dialog -->
    <q-dialog v-model="showLeaderboardDialog">
      <q-card style="min-width: 350px; max-width: 600px;">
        <q-card-section>
          <div class="text-h6">Daily Leaderboard</div>
          <div v-if="gameStore.dailyDate" class="text-caption text-grey">
            {{ formatDate(gameStore.dailyDate) }}
          </div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <DailyLeaderboard
            v-if="gameStore.dailyDate"
            :score="gameStore.score"
            :date="gameStore.dailyDate"
            :view-only="true"
          />
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Close" color="primary" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-layout>
</template>

<style lang="sass">
body
  margin: 0
  padding: 0
  font-family: 'Roboto', sans-serif

#app
  min-height: 100vh

.loading-container,
.error-container
  display: flex
  flex-direction: column
  align-items: center
  justify-content: center
  padding: 40px
  text-align: center
</style>
