<script setup lang="ts">
import { useArcLightStore } from '../../stores/arcLightStore'
import StateBoard from './StateBoard.vue'
import StoryGraph from './StoryGraph.vue'

const store = useArcLightStore()

function continueStory() {
  store.advanceToNextTurn()
}
</script>

<template>
  <div class="reveal-phase">
    <!-- Story Graph -->
    <div v-if="store.currentState" class="graph-section q-mb-lg">
      <StoryGraph
        :current-state="store.currentState"
        :max-turns="store.currentState.totalTurns"
        :current-turn="store.currentTurnNumber"
      />
    </div>

    <!-- Turn Header -->
    <div class="header q-mb-md">
      <q-chip color="primary" text-color="white" size="lg">
        Turn {{ store.currentGeneratedTurn?.turnNumber || 0 }} of {{ store.currentState?.totalTurns }}
      </q-chip>
    </div>

    <!-- Generated Prose -->
    <q-card flat bordered class="prose-card q-mb-lg">
      <q-card-section class="prose-section">
        <div class="prose-text">
          {{ store.currentGeneratedTurn?.proseSnippet }}
        </div>
      </q-card-section>
    </q-card>

    <!-- Updated State -->
    <div class="state-section q-mb-lg">
      <div class="section-title q-mb-sm">
        <q-icon name="update" size="sm" class="q-mr-xs" />
        Updated State
      </div>
      <StateBoard
        :state="store.currentState"
        :previous-state="store.previousState"
        :goal-description="store.goalTemplate?.description || ''"
        :highlight-changes="true"
      />
    </div>

    <!-- Continue Button -->
    <div class="actions-section">
      <q-btn
        v-if="!store.isStoryComplete"
        size="lg"
        color="primary"
        label="Continue"
        icon="arrow_forward"
        @click="continueStory"
        unelevated
      />
      <q-btn
        v-else
        size="lg"
        color="positive"
        label="See Ending"
        icon="auto_stories"
        @click="continueStory"
        unelevated
      />
    </div>
  </div>
</template>

<style scoped lang="sass">
.reveal-phase
  max-width: 900px
  margin: 0 auto
  padding: 24px

.header
  text-align: center

.prose-card
  background: linear-gradient(135deg, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0.05) 100%)

.prose-section
  padding: 24px

.prose-text
  font-family: Georgia, serif
  font-size: 1.125rem
  line-height: 1.8
  white-space: pre-wrap
  color: rgba(0, 0, 0, 0.87)

.section-title
  font-size: 1rem
  font-weight: 600
  text-transform: uppercase
  letter-spacing: 0.5px
  color: rgba(0, 0, 0, 0.7)
  display: flex
  align-items: center

.actions-section
  text-align: center
  margin-top: 24px

// Dark mode support
:deep(.body--dark)
  .prose-card
    background: linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.05) 100%)

  .prose-text
    color: rgba(255, 255, 255, 0.87)

  .section-title
    color: rgba(255, 255, 255, 0.7)
</style>
