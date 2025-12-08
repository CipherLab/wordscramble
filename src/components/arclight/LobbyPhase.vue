<script setup lang="ts">
import { ref } from 'vue'
import { useArcLightStore } from '../../stores/arcLightStore'
import { GOAL_TEMPLATES, getGenreColor } from '../../types/arclight'
import type { GoalTemplate } from '../../types/arclight'

const store = useArcLightStore()

// ============================================================================
// STATE
// ============================================================================

const selectedGoal = ref<GoalTemplate | null>(null)
const playerName = ref('Player 1') // Single player MVP
const maxTurns = ref<number | null>(null)

// ============================================================================
// METHODS
// ============================================================================

function selectGoal(goal: GoalTemplate) {
  selectedGoal.value = goal
  maxTurns.value = goal.estimatedTurns
}

function startGame() {
  if (!selectedGoal.value || !playerName.value.trim()) {
    return
  }

  store.startLocalGame(
    selectedGoal.value,
    [playerName.value.trim()],
    maxTurns.value || undefined
  )
}
</script>

<template>
  <div class="lobby-phase">
    <div class="header q-mb-lg">
      <h3 class="text-h3 q-mb-sm">Arc Light</h3>
      <p class="text-subtitle1 text-grey-7">
        State-driven collaborative storytelling
      </p>
    </div>

    <!-- Goal Selection -->
    <div class="goal-selection q-mb-lg">
      <div class="section-title q-mb-md">Choose Your Story</div>

      <div class="goal-grid">
        <q-card
          v-for="goal in GOAL_TEMPLATES"
          :key="goal.id"
          flat
          bordered
          clickable
          class="goal-card"
          :class="{ selected: selectedGoal?.id === goal.id }"
          @click="selectGoal(goal)"
        >
          <q-card-section>
            <div class="goal-header q-mb-sm">
              <q-chip
                square
                :color="getGenreColor(goal.genre)"
                text-color="white"
                size="sm"
              >
                {{ goal.genre }}
              </q-chip>
              <q-badge :color="getGenreColor(goal.genre)" :label="`${goal.estimatedTurns} turns`" />
            </div>

            <div class="goal-title text-h6 q-mb-xs">
              {{ goal.title }}
            </div>

            <div class="goal-description text-body2 text-grey-7">
              {{ goal.description }}
            </div>

            <div class="goal-characters q-mt-sm">
              <span
                v-for="(char, idx) in goal.initialCharacters"
                :key="idx"
                class="character-avatar"
              >
                {{ char.avatar }}
              </span>
            </div>
          </q-card-section>

          <q-card-section v-if="selectedGoal?.id === goal.id" class="bg-primary text-white">
            <q-icon name="check_circle" size="sm" class="q-mr-xs" />
            Selected
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Player Setup -->
    <div v-if="selectedGoal" class="player-setup q-mb-lg">
      <div class="section-title q-mb-md">Player Setup</div>

      <q-card flat bordered>
        <q-card-section>
          <q-input
            v-model="playerName"
            filled
            label="Your Name"
            hint="Enter your name"
            :rules="[val => !!val || 'Name is required']"
          />

          <q-input
            v-model.number="maxTurns"
            filled
            type="number"
            label="Number of Turns"
            :hint="`Recommended: ${selectedGoal.estimatedTurns} turns`"
            :min="5"
            :max="10"
            class="q-mt-md"
          />
        </q-card-section>
      </q-card>
    </div>

    <!-- Start Button -->
    <div v-if="selectedGoal" class="start-section">
      <q-btn
        size="lg"
        color="primary"
        label="Begin Story"
        icon="auto_stories"
        :disable="!playerName.trim()"
        @click="startGame"
        unelevated
      />
    </div>
  </div>
</template>

<style scoped lang="sass">
.lobby-phase
  max-width: 1200px
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

.goal-grid
  display: grid
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr))
  gap: 16px

.goal-card
  transition: all 0.3s ease
  cursor: pointer

  &:hover
    transform: translateY(-4px)
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15)

  &.selected
    border-color: var(--q-primary)
    box-shadow: 0 0 0 2px var(--q-primary)

.goal-header
  display: flex
  justify-content: space-between
  align-items: center

.goal-title
  font-weight: 600

.goal-characters
  display: flex
  gap: 4px
  font-size: 1.5rem

.character-avatar
  display: inline-block

.player-setup,
.start-section
  max-width: 500px
  margin-left: auto
  margin-right: auto

.start-section
  text-align: center

// Dark mode support
:deep(.body--dark)
  .section-title
    color: rgba(255, 255, 255, 0.7)
</style>
