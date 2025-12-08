<script setup lang="ts">
import { useArcLightStore } from '../../stores/arcLightStore'
import StateBoard from './StateBoard.vue'

const store = useArcLightStore()

function start() {
  store.startFirstTurn()
}
</script>

<template>
  <div class="briefing-phase">
    <div class="header q-mb-lg">
      <h4 class="text-h4 q-mb-sm">{{ store.goalTemplate?.title }}</h4>
      <p class="text-subtitle1 text-grey-7">
        {{ store.goalTemplate?.description }}
      </p>
    </div>

    <!-- Success Condition -->
    <q-card flat bordered class="success-card q-mb-lg">
      <q-card-section>
        <div class="text-overline text-primary">Success Condition</div>
        <div class="text-body1">
          {{ store.goalTemplate?.successCondition }}
        </div>
      </q-card-section>
    </q-card>

    <!-- Initial State -->
    <div class="state-section q-mb-lg">
      <div class="section-title q-mb-md">Initial State</div>
      <StateBoard
        :state="store.currentState"
        :goal-description="store.goalTemplate?.description || ''"
      />
    </div>

    <!-- Instructions -->
    <q-card flat bordered class="instructions-card q-mb-lg">
      <q-card-section>
        <div class="text-h6 q-mb-sm">How to Play</div>
        <ul class="instructions-list">
          <li>Each turn, you'll write a brief action (15-50 words)</li>
          <li>The AI weaves your action into the story</li>
          <li>Watch the state dashboard change as the plot unfolds</li>
          <li>Guide the story toward the goal condition</li>
        </ul>
      </q-card-section>
    </q-card>

    <!-- Start Button -->
    <div class="start-section">
      <q-btn
        size="lg"
        color="primary"
        label="Start"
        icon="play_arrow"
        @click="start"
        unelevated
      />
    </div>
  </div>
</template>

<style scoped lang="sass">
.briefing-phase
  max-width: 800px
  margin: 0 auto
  padding: 24px

.header
  text-align: center

.section-title
  font-size: 1.25rem
  font-weight: 600
  text-transform: uppercase
  letter-spacing: 0.5px
  color: rgba(0, 0, 0, 0.7)

.success-card
  text-align: center

.instructions-list
  margin: 0
  padding-left: 24px

  li
    margin-bottom: 8px

.start-section
  text-align: center

// Dark mode support
:deep(.body--dark)
  .section-title
    color: rgba(255, 255, 255, 0.7)
</style>
