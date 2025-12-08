<script setup lang="ts">
import { computed } from 'vue'
import type { NarrativeState, Character } from '../../types/arclight'

// ============================================================================
// PROPS
// ============================================================================

interface Props {
  currentState: NarrativeState
  maxTurns: number
  currentTurn: number
}

const props = defineProps<Props>()

// ============================================================================
// CONSTANTS
// ============================================================================

const SVG_WIDTH = 800
const SVG_HEIGHT = 200
const NODE_RADIUS = 30
const AVATAR_SIZE = 50
const PADDING = 60

// ============================================================================
// COMPUTED
// ============================================================================

const nodePositions = computed(() => {
  const positions = []
  const spacing = (SVG_WIDTH - PADDING * 2) / (props.maxTurns - 1)

  for (let i = 0; i < props.maxTurns; i++) {
    positions.push({
      x: PADDING + i * spacing,
      y: SVG_HEIGHT / 2,
      turn: i + 1,
      isActive: i === props.currentTurn,
      isCompleted: i < props.currentTurn,
    })
  }

  return positions
})

const pathData = computed(() => {
  const positions = nodePositions.value
  if (positions.length === 0) return ''

  // Create smooth curved path through nodes
  let path = `M ${positions[0].x} ${positions[0].y}`

  for (let i = 1; i < positions.length; i++) {
    const prev = positions[i - 1]
    const curr = positions[i]

    // Control point for bezier curve
    const cpX = (prev.x + curr.x) / 2

    path += ` Q ${cpX} ${prev.y - 20}, ${curr.x} ${curr.y}`
  }

  return path
})

const completedPathData = computed(() => {
  if (props.currentTurn === 0) return ''

  const positions = nodePositions.value.slice(0, props.currentTurn + 1)
  if (positions.length < 2) return ''

  let path = `M ${positions[0].x} ${positions[0].y}`

  for (let i = 1; i < positions.length; i++) {
    const prev = positions[i - 1]
    const curr = positions[i]
    const cpX = (prev.x + curr.x) / 2
    path += ` Q ${cpX} ${prev.y - 20}, ${curr.x} ${curr.y}`
  }

  return path
})

// Position characters at current turn
const characterPositions = computed(() => {
  const currentNode = nodePositions.value[props.currentTurn]
  if (!currentNode) return []

  return props.currentState.characters.map((char, index) => ({
    ...char,
    x: currentNode.x,
    y: currentNode.y - NODE_RADIUS - AVATAR_SIZE - 10 - (index * 15), // Stack characters
    offsetX: (index - (props.currentState.characters.length - 1) / 2) * 25, // Spread horizontally
  }))
})

function getNodeIcon(turn: number): string {
  // Vary icons based on turn for visual interest
  const icons = ['🏛️', '🌲', '📚', '🗝️', '⚔️', '👑', '🔮', '🎭']
  return icons[(turn - 1) % icons.length]
}
</script>

<template>
  <div class="story-graph">
    <svg :width="SVG_WIDTH" :height="SVG_HEIGHT" class="graph-svg">
      <!-- Background grid (subtle) -->
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.02)" stroke-width="1"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />

      <!-- Path background (full path) -->
      <path
        :d="pathData"
        fill="none"
        stroke="rgba(255,255,255,0.1)"
        stroke-width="3"
        stroke-dasharray="5,5"
      />

      <!-- Completed path (golden trail) -->
      <path
        v-if="completedPathData"
        :d="completedPathData"
        fill="none"
        stroke="#d4af37"
        stroke-width="4"
        class="golden-path"
      />

      <!-- Turn nodes -->
      <g v-for="node in nodePositions" :key="node.turn">
        <!-- Node circle -->
        <circle
          :cx="node.x"
          :cy="node.y"
          :r="NODE_RADIUS"
          :class="{
            'node-circle': true,
            'node-active': node.isActive,
            'node-completed': node.isCompleted,
            'node-pending': !node.isActive && !node.isCompleted
          }"
        />

        <!-- Node icon/number -->
        <text
          :x="node.x"
          :y="node.y + 5"
          text-anchor="middle"
          class="node-icon"
          :class="{ 'node-text-active': node.isActive }"
        >
          {{ node.isCompleted || node.isActive ? getNodeIcon(node.turn) : node.turn }}
        </text>

        <!-- Turn label below -->
        <text
          :x="node.x"
          :y="node.y + NODE_RADIUS + 20"
          text-anchor="middle"
          class="turn-label"
        >
          Turn {{ node.turn }}
        </text>
      </g>

      <!-- Character avatars -->
      <g v-for="(char, index) in characterPositions" :key="char.id">
        <!-- Avatar background circle -->
        <circle
          :cx="char.x + char.offsetX"
          :cy="char.y"
          :r="AVATAR_SIZE / 2 + 2"
          fill="rgba(0,0,0,0.5)"
          stroke="#d4af37"
          stroke-width="2"
        />

        <!-- Avatar emoji -->
        <text
          :x="char.x + char.offsetX"
          :y="char.y + 8"
          text-anchor="middle"
          class="character-avatar"
        >
          {{ char.avatar }}
        </text>

        <!-- Character name tag -->
        <text
          :x="char.x + char.offsetX"
          :y="char.y + AVATAR_SIZE / 2 + 18"
          text-anchor="middle"
          class="character-name"
        >
          {{ char.name }}
        </text>
      </g>
    </svg>

    <!-- Progress indicator -->
    <div class="progress-info">
      <span class="progress-text">
        Turn {{ currentTurn + 1 }} of {{ maxTurns }}
      </span>
      <span class="progress-bar-container">
        <span
          class="progress-bar-fill"
          :style="{ width: `${((currentTurn + 1) / maxTurns) * 100}%` }"
        />
      </span>
    </div>
  </div>
</template>

<style scoped lang="sass">
.story-graph
  background: linear-gradient(135deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.6) 100%)
  border-radius: 12px
  padding: 24px
  border: 1px solid rgba(212, 175, 55, 0.2)

.graph-svg
  display: block
  margin: 0 auto

.node-circle
  transition: all 0.3s ease

.node-pending
  fill: rgba(255, 255, 255, 0.05)
  stroke: rgba(255, 255, 255, 0.2)
  stroke-width: 2

.node-completed
  fill: rgba(212, 175, 55, 0.2)
  stroke: #d4af37
  stroke-width: 2

.node-active
  fill: rgba(212, 175, 55, 0.4)
  stroke: #d4af37
  stroke-width: 3
  filter: drop-shadow(0 0 8px rgba(212, 175, 55, 0.6))
  animation: pulse 2s ease-in-out infinite

.node-icon
  font-size: 20px
  fill: rgba(255, 255, 255, 0.5)
  user-select: none
  pointer-events: none

.node-text-active
  fill: #d4af37
  font-weight: bold

.turn-label
  font-size: 11px
  fill: rgba(255, 255, 255, 0.4)
  font-family: system-ui
  user-select: none

.golden-path
  animation: flow 2s linear infinite
  filter: drop-shadow(0 0 4px rgba(212, 175, 55, 0.5))

.character-avatar
  font-size: 28px
  user-select: none
  pointer-events: none
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5))

.character-name
  font-size: 11px
  fill: white
  font-weight: 600
  font-family: system-ui
  user-select: none
  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.8))

.progress-info
  display: flex
  align-items: center
  gap: 16px
  margin-top: 16px
  padding-top: 16px
  border-top: 1px solid rgba(255, 255, 255, 0.1)

.progress-text
  font-size: 14px
  font-weight: 600
  color: #d4af37
  white-space: nowrap

.progress-bar-container
  flex: 1
  height: 8px
  background: rgba(255, 255, 255, 0.1)
  border-radius: 4px
  overflow: hidden

.progress-bar-fill
  display: block
  height: 100%
  background: linear-gradient(90deg, #d4af37 0%, #f4e4a6 100%)
  border-radius: 4px
  transition: width 0.5s ease
  box-shadow: 0 0 8px rgba(212, 175, 55, 0.5)

@keyframes pulse
  0%, 100%
    transform: scale(1)
  50%
    transform: scale(1.05)

@keyframes flow
  0%
    stroke-dashoffset: 0
  100%
    stroke-dashoffset: 20

// Dark mode support
:deep(.body--dark)
  .story-graph
    background: linear-gradient(135deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.8) 100%)
</style>
