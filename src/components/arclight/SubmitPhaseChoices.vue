<script setup lang="ts">
import { ref, computed } from 'vue'
import { useArcLightStore } from '../../stores/arcLightStore'
import StoryGraph from './StoryGraph.vue'
import type { ActionChoice } from '../../types/arclight'

const store = useArcLightStore()

// ============================================================================
// STATE
// ============================================================================

const showCustomAction = ref(false)
const customActionText = ref('')

// ============================================================================
// COMPUTED
// ============================================================================

const wordCount = computed(() => {
  if (!customActionText.value) return 0
  return customActionText.value.trim().split(/\s+/).filter(word => word.length > 0).length
})

const isValidWordCount = computed(() => {
  return wordCount.value >= 10 && wordCount.value <= 50
})

// ============================================================================
// METHODS
// ============================================================================

async function selectChoice(choice: ActionChoice) {
  await store.submitAction(choice.text, choice.id)
}

async function submitCustomAction() {
  if (!isValidWordCount.value) return

  await store.submitAction(customActionText.value)
  customActionText.value = ''
  showCustomAction.value = false
}

function getProbabilityColor(probability: number): string {
  if (probability >= 75) return 'positive'
  if (probability >= 50) return 'warning'
  return 'negative'
}

function getChoiceIcon(choice: ActionChoice): string {
  return choice.icon || 'arrow_forward'
}
</script>

<template>
  <div class="submit-phase-choices">
    <!-- Story Graph -->
    <div v-if="store.currentState" class="graph-section q-mb-lg">
      <StoryGraph
        :current-state="store.currentState"
        :max-turns="store.currentState.totalTurns"
        :current-turn="store.currentTurnNumber"
      />
    </div>

    <!-- Choice Selection -->
    <div class="choices-section">
      <div class="section-header q-mb-md">
        <div class="section-title">Choose Your Action</div>
        <div class="section-subtitle">
          {{ store.goalTemplate?.title }} • Turn {{ store.currentTurnNumber + 1 }}
        </div>
      </div>

      <!-- Loading Choices -->
      <div v-if="store.isGeneratingChoices" class="loading-choices">
        <q-spinner-dots size="40px" color="primary" />
        <div class="loading-text">Analyzing possibilities...</div>
      </div>

      <!-- Action Choices -->
      <div v-else-if="!showCustomAction" class="choices-grid">
        <!-- Generated Choices -->
        <q-card
          v-for="choice in store.currentChoices"
          :key="choice.id"
          flat
          bordered
          clickable
          class="choice-card"
          @click="selectChoice(choice)"
        >
          <q-card-section class="choice-content">
            <!-- Probability Badge -->
            <div class="choice-header">
              <q-badge
                :color="getProbabilityColor(choice.probability)"
                :label="`${choice.probability}%`"
                class="probability-badge"
              />
              <q-icon :name="getChoiceIcon(choice)" size="sm" class="choice-icon" />
            </div>

            <!-- Choice Text -->
            <div class="choice-text">
              {{ choice.text }}
            </div>

            <!-- Consequence Hint -->
            <div v-if="choice.consequence" class="choice-consequence">
              <q-icon name="info" size="xs" class="q-mr-xs" />
              {{ choice.consequence }}
            </div>
          </q-card-section>

          <!-- Hover Effect -->
          <div class="choice-hover-overlay"></div>
        </q-card>

        <!-- Custom Action Button -->
        <q-card
          flat
          bordered
          clickable
          class="choice-card custom-choice-card"
          @click="showCustomAction = true"
        >
          <q-card-section class="choice-content">
            <div class="choice-header">
              <q-icon name="edit" size="sm" class="choice-icon" />
            </div>

            <div class="choice-text">
              Write Your Own Action
            </div>

            <div class="choice-consequence">
              <q-icon name="lightbulb" size="xs" class="q-mr-xs" />
              Express your creativity freely
            </div>
          </q-card-section>

          <div class="choice-hover-overlay"></div>
        </q-card>
      </div>

      <!-- Custom Action Input -->
      <q-card v-else flat bordered class="custom-action-card">
        <q-card-section>
          <div class="custom-action-header q-mb-md">
            <q-btn
              flat
              round
              dense
              icon="arrow_back"
              @click="showCustomAction = false"
            />
            <span class="text-h6">Custom Action</span>
          </div>

          <q-input
            v-model="customActionText"
            filled
            autofocus
            type="textarea"
            placeholder="Describe what happens next (10-50 words)..."
            :rows="4"
            @keydown.ctrl.enter="submitCustomAction"
          >
            <template v-slot:append>
              <q-chip
                :color="isValidWordCount ? 'positive' : 'negative'"
                text-color="white"
                size="sm"
              >
                {{ wordCount }} words
              </q-chip>
            </template>
          </q-input>

          <div class="hint-text q-mt-sm text-caption text-grey-6">
            Tip: Press Ctrl+Enter to submit
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn
            flat
            label="Cancel"
            @click="showCustomAction = false"
          />
          <q-btn
            color="primary"
            label="Submit"
            icon="send"
            :disable="!isValidWordCount || store.isLoading"
            :loading="store.isLoading"
            @click="submitCustomAction"
            unelevated
          />
        </q-card-actions>
      </q-card>
    </div>
  </div>
</template>

<style scoped lang="sass">
.submit-phase-choices
  max-width: 1000px
  margin: 0 auto
  padding: 24px

.section-header
  text-align: center

.section-title
  font-size: 1.75rem
  font-weight: 600
  color: rgba(0, 0, 0, 0.87)

.section-subtitle
  font-size: 1rem
  color: rgba(0, 0, 0, 0.6)
  margin-top: 4px

.loading-choices
  display: flex
  flex-direction: column
  align-items: center
  justify-content: center
  padding: 60px 20px
  text-align: center

.loading-text
  margin-top: 16px
  font-size: 1.125rem
  color: rgba(0, 0, 0, 0.6)

.choices-grid
  display: grid
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr))
  gap: 16px

.choice-card
  position: relative
  background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.1) 100%)
  border: 2px solid rgba(212, 175, 55, 0.2)
  transition: all 0.3s ease
  overflow: hidden

  &:hover
    transform: translateY(-4px)
    border-color: rgba(212, 175, 55, 0.6)
    box-shadow: 0 8px 24px rgba(212, 175, 55, 0.2)

    .choice-hover-overlay
      opacity: 1

.custom-choice-card
  border-style: dashed
  border-color: rgba(33, 150, 243, 0.3)

  &:hover
    border-color: rgba(33, 150, 243, 0.6)
    box-shadow: 0 8px 24px rgba(33, 150, 243, 0.2)

.choice-content
  position: relative
  z-index: 1
  min-height: 140px
  display: flex
  flex-direction: column
  gap: 12px

.choice-header
  display: flex
  justify-content: space-between
  align-items: center

.probability-badge
  font-size: 0.875rem
  font-weight: 700
  padding: 4px 12px

.choice-icon
  color: rgba(212, 175, 55, 0.8)

.choice-text
  font-size: 1.125rem
  font-weight: 500
  line-height: 1.5
  color: rgba(0, 0, 0, 0.87)
  flex: 1

.choice-consequence
  font-size: 0.875rem
  color: rgba(0, 0, 0, 0.6)
  display: flex
  align-items: center
  font-style: italic

.choice-hover-overlay
  position: absolute
  top: 0
  left: 0
  right: 0
  bottom: 0
  background: linear-gradient(135deg, rgba(212, 175, 55, 0.05) 0%, rgba(212, 175, 55, 0.1) 100%)
  opacity: 0
  transition: opacity 0.3s ease
  pointer-events: none

.custom-action-card
  max-width: 600px
  margin: 0 auto

.custom-action-header
  display: flex
  align-items: center
  gap: 12px

.hint-text
  font-style: italic

// Dark mode support
:deep(.body--dark)
  .section-title
    color: rgba(255, 255, 255, 0.87)

  .section-subtitle
    color: rgba(255, 255, 255, 0.6)

  .loading-text
    color: rgba(255, 255, 255, 0.6)

  .choice-card
    background: linear-gradient(135deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.6) 100%)

  .choice-text
    color: rgba(255, 255, 255, 0.87)

  .choice-consequence
    color: rgba(255, 255, 255, 0.6)
</style>
