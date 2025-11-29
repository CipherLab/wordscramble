<script setup lang="ts">
import { useConsequencesStore } from '../../stores/consequencesStore'

const store = useConsequencesStore()

const loadingMessages = [
  'The narrator clears their throat...',
  'Consulting the chaos budget...',
  'Weaving narrative threads...',
  'Maintaining deadpan composure...',
  'Connecting the dots absurdly...',
  'Treating premises with undue seriousness...',
]

const message = loadingMessages[Math.floor(Math.random() * loadingMessages.length)]
</script>

<template>
  <div class="generating-phase text-center">
    <div class="q-mb-xl">
      <p class="text-overline">ROUND {{ store.currentRound }}</p>
      <h2 class="text-h4">Generating Story...</h2>
    </div>

    <q-spinner-dots size="80px" color="primary" class="q-mb-lg" />

    <p class="text-subtitle1 text-grey">{{ message }}</p>

    <q-card class="q-pa-md q-mt-xl" flat bordered>
      <div class="text-subtitle2 q-mb-sm">Words submitted this round:</div>
      <div class="word-cloud">
        <q-chip
          v-for="submission in store.currentRoundSubmissions"
          :key="`${submission.playerId}-${submission.promptId}`"
          color="primary"
          text-color="white"
          size="md"
        >
          "{{ submission.word }}"
          <q-tooltip>{{ submission.wordType }} by {{ submission.playerName }}</q-tooltip>
        </q-chip>
      </div>
    </q-card>
  </div>
</template>

<style scoped>
.generating-phase {
  padding-top: 4rem;
}

.word-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
}
</style>
