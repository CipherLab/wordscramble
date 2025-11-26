<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useGameStore } from './stores/gameStore'
import { loadDictionary } from './constants/dictionary'
import GameBoard from './components/GameBoard.vue'

const gameStore = useGameStore()
const dictionaryLoading = ref(true)
const dictionaryError = ref<string | null>(null)

onMounted(async () => {
  try {
    await loadDictionary()
    gameStore.startGame()
  } catch (error) {
    dictionaryError.value = error instanceof Error ? error.message : 'Failed to load dictionary'
  } finally {
    dictionaryLoading.value = false
  }
})
</script>

<template>
  <q-layout view="hHh lpR fFf">
    <q-header elevated class="bg-primary">
      <q-toolbar>
        <q-toolbar-title>
          Word Scramble
        </q-toolbar-title>
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
            @click="() => window.location.reload()"
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
