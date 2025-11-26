<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useGameStore } from './stores/gameStore'
import { loadDictionary } from './constants/dictionary'
import GameBoard from './components/GameBoard.vue'
import type { GameMode } from './stores/gameStore'

const route = useRoute()
const gameStore = useGameStore()
const dictionaryLoading = ref(true)
const dictionaryError = ref<string | null>(null)

onMounted(async () => {
  try {
    await loadDictionary()
    // Start game based on current route
    const mode = (route.meta.mode as GameMode) || 'random'
    gameStore.startGame(mode)
  } catch (error) {
    dictionaryError.value = error instanceof Error ? error.message : 'Failed to load dictionary'
  } finally {
    dictionaryLoading.value = false
  }
})

// Watch for route changes and start game with appropriate mode
watch(() => route.path, () => {
  if (!dictionaryLoading.value && !dictionaryError.value) {
    const mode = (route.meta.mode as GameMode) || 'random'
    gameStore.startGame(mode)
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
            :outline="gameStore.gameMode === 'random'"
            label="Random"
            :to="'/'"
          >
            <q-tooltip>Random puzzle with different letters each game</q-tooltip>
          </q-btn>
          <q-btn
            flat
            :outline="gameStore.gameMode === 'daily'"
            label="Daily"
            :to="'/daily'"
          >
            <q-tooltip>Daily puzzle - same for everyone today</q-tooltip>
          </q-btn>
        </q-btn-group>
        <q-btn
          flat
          round
          dense
          icon="refresh"
          @click="gameStore.startGame()"
        >
          <q-tooltip>New Game</q-tooltip>
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
        <GameBoard v-else />
      </q-page>
    </q-page-container>
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
