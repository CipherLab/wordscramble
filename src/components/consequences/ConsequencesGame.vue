<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useConsequencesStore } from '../../stores/consequencesStore'
import LobbyPhase from './LobbyPhase.vue'
import SubmitPhase from './SubmitPhase.vue'
import GeneratingPhase from './GeneratingPhase.vue'
import RevealPhase from './RevealPhase.vue'
import CompletePhase from './CompletePhase.vue'

const store = useConsequencesStore()

onMounted(() => {
  // Try to reconnect to existing game
  store.tryReconnect()
})

onUnmounted(() => {
  // Cleanup handled by store
})
</script>

<template>
  <div class="consequences-game q-pa-md">
    <div v-if="store.error" class="error-banner q-mb-md">
      <q-banner class="bg-negative text-white">
        {{ store.error }}
        <template v-slot:action>
          <q-btn flat label="Dismiss" @click="store.error = null" />
        </template>
      </q-banner>
    </div>

    <!-- No game joined yet -->
    <LobbyPhase v-if="!store.gameId || store.phase === 'lobby'" />

    <!-- Submitting words -->
    <SubmitPhase v-else-if="store.phase === 'submitting'" />

    <!-- AI generating story -->
    <GeneratingPhase v-else-if="store.phase === 'generating'" />

    <!-- Story reveal -->
    <RevealPhase v-else-if="store.phase === 'reveal'" />

    <!-- Game complete -->
    <CompletePhase v-else-if="store.phase === 'complete'" />
  </div>
</template>

<style scoped>
.consequences-game {
  max-width: 800px;
  margin: 0 auto;
  min-height: 100vh;
}
</style>
