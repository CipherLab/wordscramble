<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useArcLightStore } from '../../stores/arcLightStore'
import StateBoard from './StateBoard.vue'

const store = useArcLightStore()

const loadingMessages = [
  'Weaving your story...',
  'The narrative unfolds...',
  'Characters come to life...',
  'Plot threads intertwine...',
  'The tale takes shape...',
  'Imagination at work...',
  'Crafting coherence from chaos...',
]

const currentMessage = ref(loadingMessages[0])

onMounted(() => {
  // Rotate loading messages every 3 seconds
  let index = 0
  const interval = setInterval(() => {
    index = (index + 1) % loadingMessages.length
    currentMessage.value = loadingMessages[index]
  }, 3000)

  // Cleanup
  return () => clearInterval(interval)
})
</script>

<template>
  <div class="generating-phase">
    <div class="header q-mb-lg">
      <q-spinner-dots
        size="80px"
        color="primary"
        class="q-mb-md"
      />

      <h4 class="text-h4 q-mb-sm">{{ currentMessage }}</h4>

      <p class="text-subtitle1 text-grey-7">
        The AI is generating your story...
      </p>
    </div>

    <!-- Current State (static, grayed out) -->
    <div class="state-section">
      <div class="section-title q-mb-sm">Current State</div>
      <div class="state-wrapper">
        <StateBoard
          :state="store.currentState"
          :goal-description="store.goalTemplate?.description || ''"
        />
      </div>
    </div>
  </div>
</template>

<style scoped lang="sass">
.generating-phase
  max-width: 800px
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

.state-wrapper
  opacity: 0.6
  pointer-events: none

// Dark mode support
:deep(.body--dark)
  .section-title
    color: rgba(255, 255, 255, 0.7)
</style>
