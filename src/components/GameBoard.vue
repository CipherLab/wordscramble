<template>
  <div class="game-board">
    <!-- Game Over Overlay -->
    <div v-if="gameStore.gameOver" class="game-over-overlay">
      <div class="game-over-container">
        <q-card class="game-over-card q-mb-md">
          <q-card-section class="text-center">
            <div class="text-h4 q-mb-md">Game Over!</div>
            <div class="text-h5 q-mb-md">Final Score: {{ gameStore.score }}</div>
            <div v-if="gameStore.topWord" class="q-mb-md">
              <div class="text-subtitle1">Top Word</div>
              <div class="text-h6">{{ gameStore.topWord.word }}</div>
              <div class="text-caption">{{ gameStore.topWord.points }} points</div>
            </div>
            <q-btn
              color="primary"
              label="Play Again"
              size="lg"
              @click="gameStore.startGame()"
            />
          </q-card-section>
        </q-card>

        <!-- Daily Leaderboard -->
        <DailyLeaderboard
          v-if="gameStore.gameMode === 'daily' && gameStore.dailyDate"
          :score="gameStore.score"
          :date="gameStore.dailyDate"
          :best-word="gameStore.topWord ? `${gameStore.topWord.word} (${gameStore.topWord.points})` : ''"
        />
      </div>
    </div>

    <!-- Letter Tiles -->
    <div class="tiles-container">
      <div class="tiles-grid">
        <LetterTile
          v-for="(letter, index) in gameStore.letters"
          :key="letter.id"
          :letter="letter"
          :index="index"
          @toggle="gameStore.toggleLetterSelection"
          @drag-start="handleDragStart"
          @drag-end="handleDragEnd"
          @drop="handleDrop"
        />
      </div>
    </div>

    <!-- Current Word Display -->
    <div class="current-word-section">
      <div class="current-word-label">Current Word:</div>
      <div
        class="current-word-display"
        :class="{ 'invalid-word': gameStore.selectedWord && !gameStore.isCurrentWordValid }"
      >
        <span v-if="gameStore.selectedWord" class="word-letters">
          <span
            v-for="(letter, index) in gameStore.selectedLetters"
            :key="index"
            class="word-letter"
          >
            {{ letter }}
          </span>
        </span>
        <span v-else class="word-placeholder">-</span>
      </div>
      <div class="bonus-multipliers" v-if="gameStore.selectedLetters.length > 0">
        <span
          v-for="(_letter, index) in gameStore.selectedLetters"
          :key="index"
          class="multiplier-badge"
          :class="{ 'has-multiplier': getWordPositionMultiplier(index) > 1 }"
        >
          <span v-if="getWordPositionMultiplier(index) > 1">
            x{{ getWordPositionMultiplier(index) }}
          </span>
        </span>
      </div>
    </div>

    <!-- Control Buttons -->
    <div class="controls-section">
      <q-btn
        color="warning"
        label="Shuffle"
        icon="shuffle"
        @click="gameStore.shuffleLetters()"
        :disable="gameStore.gameOver"
      />
      <q-btn
        color="negative"
        label="Clear"
        icon="clear"
        @click="gameStore.clearSelection()"
        :disable="gameStore.gameOver || gameStore.selectedLetters.length === 0"
      />
      <q-btn
        color="positive"
        label="Submit"
        icon="check"
        @click="handleSubmit"
        :disable="gameStore.gameOver || gameStore.selectedLetters.length < 1"
      />
    </div>

    <!-- Game Stats -->
    <div class="stats-section">
      <q-card class="stat-card">
        <q-card-section class="text-center">
          <div class="stat-label">Score</div>
          <div class="stat-value">{{ gameStore.score }}</div>
        </q-card-section>
      </q-card>

      <q-card class="stat-card">
        <q-card-section class="text-center">
          <div class="stat-label">Letters Left</div>
          <div class="stat-value">{{ gameStore.lettersLeft }}</div>
        </q-card-section>
      </q-card>

      <q-card class="stat-card">
        <q-card-section class="text-center">
          <div class="stat-label">Word Value</div>
          <div class="stat-value">{{ currentWordValue }}</div>
        </q-card-section>
      </q-card>
    </div>

    <!-- Words Played -->
    <div class="words-section">
      <q-card>
        <q-card-section>
          <div class="text-h6 q-mb-md">All Words</div>
          <div v-if="gameStore.wordsPlayed.length === 0" class="text-caption text-grey">
            No words played yet
          </div>
          <q-list v-else dense>
            <q-item
              v-for="(word, index) in sortedWords"
              :key="index"
              :class="{ 'top-word': word === gameStore.topWord }"
            >
              <q-item-section>
                <q-item-label>{{ word.word }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-item-label>{{ word.points }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
      </q-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useQuasar } from 'quasar'
import { useGameStore } from '../stores/gameStore'
import LetterTile from './LetterTile.vue'
import DailyLeaderboard from './DailyLeaderboard.vue'
import { getLetterPoints } from '../constants/scrabble'

const $q = useQuasar()
const gameStore = useGameStore()
const draggedIndex = ref<number | null>(null)

const currentWordValue = computed(() => {
  if (gameStore.selectedLetters.length === 0) return 0

  // Calculate base points from letter values
  let basePoints = 0
  gameStore.selectedLetters.forEach(letter => {
    basePoints += getLetterPoints(letter)
  })

  // Apply length multiplier
  const wordLength = gameStore.selectedLetters.length
  let multiplier = 1
  if (wordLength >= 4) multiplier = 2
  if (wordLength >= 5) multiplier = 3
  if (wordLength >= 6) multiplier = 4
  if (wordLength >= 7) multiplier = 5
  if (wordLength >= 8) multiplier = 6
  if (wordLength >= 9) multiplier = 7

  return basePoints * multiplier
})

const sortedWords = computed(() => {
  return [...gameStore.wordsPlayed].sort((a, b) => b.points - a.points)
})

function getWordPositionMultiplier(index: number): number {
  // Show multipliers based on position in the selected word
  const wordLength = gameStore.selectedLetters.length
  if (wordLength >= 4 && index === 3) return 2
  if (wordLength >= 5 && index === 4) return 3
  if (wordLength >= 6 && index === 5) return 4
  if (wordLength >= 7 && index === 6) return 5
  if (wordLength >= 8 && index === 7) return 6
  if (wordLength >= 9 && index === 8) return 7
  return 1
}

function handleDragStart(index: number) {
  draggedIndex.value = index
}

function handleDragEnd() {
  draggedIndex.value = null
}

function handleDrop(targetIndex: number) {
  if (draggedIndex.value !== null && draggedIndex.value !== targetIndex) {
    gameStore.reorderLetters(draggedIndex.value, targetIndex)
  }
  draggedIndex.value = null
}

function handleSubmit() {
  const result = gameStore.submitWord()

  if (result.success) {
    $q.notify({
      type: 'positive',
      message: result.message,
      position: 'top',
      timeout: 2000
    })
  } else {
    $q.notify({
      type: 'negative',
      message: result.message,
      position: 'top',
      timeout: 2000
    })
  }
}
</script>

<style scoped lang="sass">
.game-board
  max-width: 1200px
  margin: 0 auto
  padding: 20px
  position: relative

.game-over-overlay
  position: fixed
  top: 0
  left: 0
  right: 0
  bottom: 0
  background: rgba(0, 0, 0, 0.7)
  display: flex
  align-items: center
  justify-content: center
  z-index: 1000
  overflow-y: auto
  padding: 20px

.game-over-container
  width: 100%
  max-width: 600px
  margin: 0 auto

.game-over-card
  min-width: 300px
  padding: 20px

.tiles-container
  margin-bottom: 30px

.tiles-grid
  display: flex
  flex-wrap: wrap
  gap: 12px
  justify-content: center
  min-height: 120px

.tile-enter-active,
.tile-leave-active
  transition: all 0.3s ease

.tile-enter-from
  opacity: 0
  transform: scale(0.8)

.tile-leave-to
  opacity: 0
  transform: scale(0.8)

.current-word-section
  background: #f5f5f5
  border: 2px solid #ddd
  border-radius: 8px
  padding: 20px
  margin-bottom: 20px
  text-align: center

.current-word-label
  font-size: 14px
  color: #666
  margin-bottom: 8px

.current-word-display
  font-size: 32px
  font-weight: bold
  color: #333
  min-height: 40px
  margin-bottom: 8px
  transition: color 0.2s ease

  &.invalid-word
    color: #c10015

.word-letters
  display: inline-flex
  gap: 8px

.word-letter
  letter-spacing: 2px

.word-placeholder
  letter-spacing: 4px
  color: #999

.bonus-multipliers
  display: flex
  gap: 8px
  justify-content: center
  align-items: center
  min-height: 24px

.multiplier-badge
  min-width: 40px
  height: 24px
  display: flex
  align-items: center
  justify-content: center

  &.has-multiplier span
    background: linear-gradient(135deg, #e3f2fd, #bbdefb)
    padding: 2px 10px
    border-radius: 4px
    border: 1px solid #64b5f6
    font-size: 12px
    font-weight: bold
    color: #1976d2

.controls-section
  display: flex
  gap: 12px
  justify-content: center
  margin-bottom: 30px

  .q-btn
    min-width: 120px

.stats-section
  display: grid
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr))
  gap: 12px
  margin-bottom: 30px

.stat-card
  .stat-label
    font-size: 12px
    color: #666
    margin-bottom: 4px

  .stat-value
    font-size: 28px
    font-weight: bold
    color: #1976d2

.words-section
  .top-word
    background: #fff3e0
    font-weight: bold

.q-item
  border-bottom: 1px solid #eee

  &:last-child
    border-bottom: none
</style>
