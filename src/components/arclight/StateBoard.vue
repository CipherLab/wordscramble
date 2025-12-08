<script setup lang="ts">
import { computed } from 'vue'
import type { NarrativeState, Character } from '../../types/arclight'

// ============================================================================
// PROPS
// ============================================================================

interface Props {
  state: NarrativeState | null
  highlightChanges?: boolean
  previousState?: NarrativeState | null
  goalDescription?: string
}

const props = withDefaults(defineProps<Props>(), {
  highlightChanges: false,
  previousState: null,
  goalDescription: '',
})

// ============================================================================
// COMPUTED
// ============================================================================

const tensionColor = computed(() => {
  if (!props.state) return 'grey'
  const tension = props.state.tension
  if (tension < 30) return 'green'
  if (tension < 60) return 'yellow'
  if (tension < 80) return 'orange'
  return 'red'
})

const tensionPercentage = computed(() => {
  return props.state?.tension || 0
})

const plotProgressPercentage = computed(() => {
  return props.state?.plotProgress || 0
})

/**
 * Check if a character's location changed
 */
function hasLocationChanged(char: Character): boolean {
  if (!props.highlightChanges || !props.previousState) return false
  const prevChar = props.previousState.characters.find(c => c.id === char.id)
  return prevChar ? prevChar.location !== char.location : false
}

/**
 * Check if a character's emotion changed
 */
function hasEmotionChanged(char: Character): boolean {
  if (!props.highlightChanges || !props.previousState) return false
  const prevChar = props.previousState.characters.find(c => c.id === char.id)
  return prevChar ? prevChar.emotion !== char.emotion : false
}

/**
 * Get emotion color
 */
function getEmotionColor(emotion: string): string {
  const lowerEmotion = emotion.toLowerCase()

  // Positive emotions
  if (lowerEmotion.includes('happy') || lowerEmotion.includes('joy') || lowerEmotion.includes('excited')) {
    return 'positive'
  }

  // Negative emotions
  if (lowerEmotion.includes('angry') || lowerEmotion.includes('hostile') || lowerEmotion.includes('furious')) {
    return 'negative'
  }

  // Neutral/cautious
  if (lowerEmotion.includes('suspicious') || lowerEmotion.includes('cautious') || lowerEmotion.includes('analytical')) {
    return 'info'
  }

  // Fear/anxiety
  if (lowerEmotion.includes('afraid') || lowerEmotion.includes('nervous') || lowerEmotion.includes('panicked') || lowerEmotion.includes('paranoid')) {
    return 'warning'
  }

  // Default
  return 'grey'
}
</script>

<template>
  <div v-if="state" class="state-board">
    <!-- Scene Location -->
    <div class="scene-location q-mb-md">
      <q-icon name="place" size="sm" class="q-mr-xs" />
      <span class="text-h6">{{ state.currentSceneLocation }}</span>
    </div>

    <!-- Goal Reminder (if provided) -->
    <div v-if="goalDescription" class="goal-reminder q-mb-md">
      <q-chip square color="primary" text-color="white" icon="flag">
        Goal: {{ goalDescription }}
      </q-chip>
    </div>

    <!-- Characters -->
    <div class="characters-section q-mb-md">
      <div class="section-label q-mb-sm">Characters</div>
      <div class="characters-grid">
        <q-card
          v-for="char in state.characters"
          :key="char.id"
          flat
          bordered
          class="character-card"
          :class="{ 'highlight-change': highlightChanges && (hasLocationChanged(char) || hasEmotionChanged(char)) }"
        >
          <q-card-section class="q-pa-sm">
            <div class="character-header q-mb-xs">
              <span v-if="char.avatar" class="avatar">{{ char.avatar }}</span>
              <span class="name text-weight-bold">{{ char.name }}</span>
            </div>

            <div class="character-detail">
              <q-icon name="location_on" size="xs" />
              <span
                class="detail-text"
                :class="{ 'changed': hasLocationChanged(char) }"
              >
                {{ char.location }}
              </span>
            </div>

            <div class="character-detail">
              <q-icon name="mood" size="xs" />
              <q-chip
                size="sm"
                :color="getEmotionColor(char.emotion)"
                text-color="white"
                class="emotion-chip"
                :class="{ 'changed': hasEmotionChanged(char) }"
              >
                {{ char.emotion }}
              </q-chip>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Meters -->
    <div class="meters-section">
      <!-- Tension Meter -->
      <div class="meter q-mb-sm">
        <div class="meter-label">
          <q-icon name="bolt" size="xs" />
          <span>Tension</span>
          <span class="meter-value">{{ tensionPercentage }}/100</span>
        </div>
        <q-linear-progress
          :value="tensionPercentage / 100"
          :color="tensionColor"
          size="20px"
          rounded
          class="meter-bar"
        />
      </div>

      <!-- Plot Progress Meter -->
      <div class="meter">
        <div class="meter-label">
          <q-icon name="auto_stories" size="xs" />
          <span>Plot Progress</span>
          <span class="meter-value">{{ plotProgressPercentage }}/100</span>
        </div>
        <q-linear-progress
          :value="plotProgressPercentage / 100"
          color="primary"
          size="20px"
          rounded
          class="meter-bar"
        />
      </div>
    </div>
  </div>

  <div v-else class="state-board-empty">
    <q-icon name="help_outline" size="lg" color="grey-5" />
    <div class="text-grey-5 q-mt-sm">No state available</div>
  </div>
</template>

<style scoped lang="sass">
.state-board
  padding: 16px
  background: rgba(0, 0, 0, 0.02)
  border-radius: 8px
  border: 1px solid rgba(0, 0, 0, 0.12)

.scene-location
  display: flex
  align-items: center
  padding: 8px
  background: white
  border-radius: 4px
  border-left: 4px solid var(--q-primary)

.goal-reminder
  text-align: center

.section-label
  font-weight: 600
  font-size: 0.875rem
  text-transform: uppercase
  letter-spacing: 0.5px
  color: rgba(0, 0, 0, 0.6)

.characters-grid
  display: grid
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr))
  gap: 12px

.character-card
  background: white
  transition: all 0.3s ease

  &.highlight-change
    border-color: var(--q-primary)
    box-shadow: 0 0 8px rgba(25, 118, 210, 0.3)

.character-header
  display: flex
  align-items: center
  gap: 8px

.avatar
  font-size: 1.5rem

.name
  font-size: 1rem

.character-detail
  display: flex
  align-items: center
  gap: 6px
  margin-top: 6px
  font-size: 0.875rem
  color: rgba(0, 0, 0, 0.7)

.detail-text
  transition: color 0.3s ease

  &.changed
    color: var(--q-primary)
    font-weight: 600

.emotion-chip
  margin: 0
  transition: transform 0.3s ease

  &.changed
    transform: scale(1.1)

.meters-section
  padding-top: 8px

.meter
  .meter-label
    display: flex
    align-items: center
    gap: 6px
    margin-bottom: 4px
    font-size: 0.875rem
    font-weight: 500

    .meter-value
      margin-left: auto
      font-weight: 600

.meter-bar
  transition: all 0.5s ease

.state-board-empty
  display: flex
  flex-direction: column
  align-items: center
  justify-content: center
  padding: 48px
  color: grey

// Dark mode support
:deep(.body--dark)
  .state-board
    background: rgba(255, 255, 255, 0.05)
    border-color: rgba(255, 255, 255, 0.12)

  .scene-location,
  .character-card
    background: rgba(255, 255, 255, 0.05)

  .section-label
    color: rgba(255, 255, 255, 0.7)

  .character-detail
    color: rgba(255, 255, 255, 0.7)
</style>
