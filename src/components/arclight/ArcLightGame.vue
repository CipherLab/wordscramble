<script setup lang="ts">
import { useArcLightStore } from '../../stores/arcLightStore'
import LobbyPhase from './LobbyPhase.vue'
import BriefingPhase from './BriefingPhase.vue'
import SubmitPhaseChoices from './SubmitPhaseChoices.vue'
import GeneratingPhase from './GeneratingPhase.vue'
import RevealPhase from './RevealPhase.vue'
import CompletePhase from './CompletePhase.vue'

const store = useArcLightStore()
</script>

<template>
  <div class="arclight-game q-pa-md">
    <!-- Error Banner -->
    <div v-if="store.error" class="error-banner q-mb-md">
      <q-banner class="bg-negative text-white">
        {{ store.error }}
        <template v-slot:action>
          <q-btn flat label="Dismiss" @click="store.clearError()" />
        </template>
      </q-banner>
    </div>

    <!-- Phase Routing -->
    <LobbyPhase v-if="store.phase === 'lobby'" />
    <BriefingPhase v-else-if="store.phase === 'briefing'" />
    <SubmitPhaseChoices v-else-if="store.phase === 'submitting'" />
    <GeneratingPhase v-else-if="store.phase === 'generating'" />
    <RevealPhase v-else-if="store.phase === 'reveal'" />
    <CompletePhase v-else-if="store.phase === 'complete'" />
  </div>
</template>

<style scoped>
.arclight-game {
  max-width: 1200px;
  margin: 0 auto;
  min-height: 100vh;
}
</style>
