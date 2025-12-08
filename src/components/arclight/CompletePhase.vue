<script setup lang="ts">
import { computed } from 'vue'
import { useQuasar } from 'quasar'
import { useArcLightStore } from '../../stores/arcLightStore'
import StateBoard from './StateBoard.vue'

const $q = useQuasar()
const store = useArcLightStore()

// ============================================================================
// COMPUTED
// ============================================================================

const fullStory = computed(() => {
  return store.allGeneratedTurns
    .map((turn) => {
      return `=== Turn ${turn.turnNumber} ===\n\n${turn.proseSnippet}`
    })
    .join('\n\n---\n\n')
})

const goalReached = computed(() => {
  return store.currentState?.goalReached || false
})

// ============================================================================
// METHODS
// ============================================================================

async function copyStory() {
  try {
    const storyText = `${store.goalTemplate?.title}\n\n${fullStory.value}`
    await navigator.clipboard.writeText(storyText)

    $q.notify({
      type: 'positive',
      message: 'Story copied to clipboard!',
      position: 'top',
    })
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Failed to copy story',
      position: 'top',
    })
  }
}

function playAgain() {
  store.resetGame()
}
</script>

<template>
  <div class="complete-phase">
    <!-- Header -->
    <div class="header q-mb-lg">
      <h3 class="text-h3 q-mb-sm">{{ store.goalTemplate?.title }}</h3>

      <q-chip
        v-if="goalReached"
        color="positive"
        text-color="white"
        size="lg"
        icon="check_circle"
      >
        Goal Achieved!
      </q-chip>
      <q-chip
        v-else
        color="warning"
        text-color="white"
        size="lg"
        icon="info"
      >
        Story Complete
      </q-chip>
    </div>

    <!-- Final State -->
    <div class="state-section q-mb-lg">
      <div class="section-title q-mb-sm">Final State</div>
      <StateBoard
        :state="store.currentState"
      />
    </div>

    <!-- Full Story -->
    <div class="story-section q-mb-lg">
      <div class="section-title q-mb-sm">Your Complete Story</div>

      <q-card flat bordered class="story-card">
        <q-card-section class="story-content">
          <div class="story-text">
            {{ fullStory }}
          </div>
        </q-card-section>
      </q-card>
    </div>

    <!-- Actions -->
    <div class="actions-section">
      <q-btn
        color="primary"
        label="Copy Story"
        icon="content_copy"
        @click="copyStory"
        outline
        class="q-mr-md"
      />

      <q-btn
        color="primary"
        label="Play Again"
        icon="replay"
        @click="playAgain"
        unelevated
      />
    </div>
  </div>
</template>

<style scoped lang="sass">
.complete-phase
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

.story-card
  background: linear-gradient(135deg, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0.05) 100%)

.story-content
  padding: 24px
  max-height: 60vh
  overflow-y: auto

.story-text
  font-family: Georgia, serif
  font-size: 1.125rem
  line-height: 1.8
  white-space: pre-wrap
  color: rgba(0, 0, 0, 0.87)

.actions-section
  text-align: center
  margin-top: 24px

// Dark mode support
:deep(.body--dark)
  .section-title
    color: rgba(255, 255, 255, 0.7)

  .story-card
    background: linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.05) 100%)

  .story-text
    color: rgba(255, 255, 255, 0.87)
</style>
