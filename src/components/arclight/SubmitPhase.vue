<script setup lang="ts">
import { ref, computed } from 'vue'
import { useArcLightStore } from '../../stores/arcLightStore'
import StateBoard from './StateBoard.vue'
import StoryGraph from './StoryGraph.vue'

const store = useArcLightStore()

// ============================================================================
// STATE
// ============================================================================

const actionText = ref('')

// ============================================================================
// COMPUTED
// ============================================================================

const wordCount = computed(() => {
  if (!actionText.value) return 0
  return actionText.value.trim().split(/\s+/).filter(word => word.length > 0).length
})

const isValidWordCount = computed(() => {
  return wordCount.value >= 10 && wordCount.value <= 50
})

const wordCountColor = computed(() => {
  if (wordCount.value === 0) return 'grey'
  if (wordCount.value < 10) return 'negative'
  if (wordCount.value > 50) return 'negative'
  return 'positive'
})

const wordCountLabel = computed(() => {
  if (wordCount.value < 10) return `${wordCount.value}/10 (minimum)`
  if (wordCount.value > 50) return `${wordCount.value}/50 (too many)`
  return `${wordCount.value} words`
})

// ============================================================================
// METHODS
// ============================================================================

async function submitAction() {
  if (!isValidWordCount.value) return

  await store.submitAction(actionText.value)
  actionText.value = '' // Clear for next turn
}
</script>

<template>
  <div class="submit-phase">
    <!-- Story Graph -->
    <div v-if="store.currentState" class="graph-section q-mb-lg">
      <StoryGraph
        :current-state="store.currentState"
        :max-turns="store.currentState.totalTurns"
        :current-turn="store.currentTurnNumber"
      />
    </div>

    <!-- State Dashboard -->
    <div class="state-section q-mb-lg">
      <div class="section-title q-mb-sm">Current State</div>
      <StateBoard
        :state="store.currentState"
        :goal-description="store.goalTemplate?.description || ''"
      />
    </div>

    <!-- Action Input -->
    <q-card flat bordered class="action-card">
      <q-card-section>
        <div class="text-h6 q-mb-sm">What happens next?</div>
        <p class="text-body2 text-grey-7 q-mb-md">
          Write a brief action (10-50 words). Describe what a character does, what they discover, or how the situation changes.
        </p>

        <q-input
          v-model="actionText"
          filled
          autofocus
          type="textarea"
          placeholder="Example: Alex spots a security guard approaching and quickly hides behind a marble pillar, heart pounding..."
          :rows="4"
          @keydown.ctrl.enter="submitAction"
        >
          <template v-slot:append>
            <q-chip
              :color="wordCountColor"
              text-color="white"
              size="sm"
            >
              {{ wordCountLabel }}
            </q-chip>
          </template>
        </q-input>

        <div class="hint-text q-mt-sm text-caption text-grey-6">
          Tip: Press Ctrl+Enter to submit
        </div>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn
          color="primary"
          label="Submit"
          icon="send"
          :disable="!isValidWordCount || store.isLoading"
          :loading="store.isLoading"
          @click="submitAction"
          unelevated
        />
      </q-card-actions>
    </q-card>
  </div>
</template>

<style scoped lang="sass">
.submit-phase
  max-width: 900px
  margin: 0 auto
  padding: 24px

.header
  text-align: center

.section-title
  font-size: 1rem
  font-weight: 600
  text-transform: uppercase
  letter-spacing: 0.5px
  color: rgba(0, 0, 0, 0.7)

.action-card
  margin-top: 16px

.hint-text
  font-style: italic

// Dark mode support
:deep(.body--dark)
  .section-title
    color: rgba(255, 255, 255, 0.7)
</style>
