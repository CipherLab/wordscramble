<script setup lang="ts">
import { ref, computed } from 'vue'
import { useConsequencesStore } from '../../stores/consequencesStore'

const store = useConsequencesStore()

// Track input values locally
const inputs = ref<Record<string, string>>({})

// Check which prompts are already submitted
const submittedPromptIds = computed(() =>
  store.myCurrentRoundSubmissions.map((s) => s.promptId)
)

// Submit a single word
async function submitWord(promptId: string) {
  const word = inputs.value[promptId]?.trim()
  if (!word) return
  await store.submitWord(promptId, word)
}

// Submit all words at once
async function submitAll() {
  for (const prompt of store.currentPrompts) {
    if (!submittedPromptIds.value.includes(prompt.id)) {
      const word = inputs.value[prompt.id]?.trim()
      if (word) {
        await store.submitWord(prompt.id, word)
      }
    }
  }
}

// Count submitted players
const submissionProgress = computed(() => {
  if (!store.game) return { submitted: 0, total: 0 }
  const expectedPerPlayer = store.currentPrompts.length
  const playerSubmissions = new Map<string, number>()

  store.currentRoundSubmissions.forEach((s) => {
    playerSubmissions.set(s.playerId, (playerSubmissions.get(s.playerId) || 0) + 1)
  })

  let fullySubmitted = 0
  store.game.players.forEach((p) => {
    if ((playerSubmissions.get(p.id) || 0) >= expectedPerPlayer) {
      fullySubmitted++
    }
  })

  return { submitted: fullySubmitted, total: store.game.players.length }
})

// All inputs filled
const allFilled = computed(() => {
  return store.currentPrompts.every((p) => {
    if (submittedPromptIds.value.includes(p.id)) return true
    return inputs.value[p.id]?.trim()
  })
})
</script>

<template>
  <div class="submit-phase">
    <div class="text-center q-mb-lg">
      <p class="text-overline">ROUND {{ store.currentRound }} of {{ store.game?.totalRounds }}</p>
      <h2 class="text-h4">Submit Your Words</h2>
      <q-badge :color="store.currentRound <= 2 ? 'positive' : store.currentRound <= 4 ? 'warning' : 'negative'">
        {{ store.chaosLevel }}
      </q-badge>
    </div>

    <q-card class="q-pa-md q-mb-lg">
      <div v-for="prompt in store.currentPrompts" :key="prompt.id" class="q-mb-md">
        <template v-if="submittedPromptIds.includes(prompt.id)">
          <q-input
            :model-value="store.mySubmissions.get(prompt.id)"
            :label="`${prompt.type.toUpperCase()}: ${prompt.hint}`"
            outlined
            readonly
            bg-color="positive"
            class="submitted-input"
          >
            <template v-slot:append>
              <q-icon name="check" color="positive" />
            </template>
          </q-input>
        </template>
        <template v-else>
          <q-input
            v-model="inputs[prompt.id]"
            :label="`${prompt.type.toUpperCase()}: ${prompt.hint}`"
            outlined
            @keyup.enter="submitWord(prompt.id)"
          >
            <template v-slot:append>
              <q-btn
                flat
                dense
                icon="send"
                color="primary"
                :disable="!inputs[prompt.id]?.trim()"
                @click="submitWord(prompt.id)"
              />
            </template>
          </q-input>
        </template>
      </div>

      <q-btn
        v-if="!store.hasSubmittedAllPrompts"
        color="primary"
        size="lg"
        class="full-width q-mt-md"
        label="Submit All"
        :disable="!allFilled"
        @click="submitAll"
      />
    </q-card>

    <q-card class="q-pa-md">
      <div class="text-subtitle2 q-mb-sm">Waiting for players...</div>
      <q-linear-progress
        :value="submissionProgress.submitted / submissionProgress.total"
        color="primary"
        class="q-mb-sm"
      />
      <div class="text-caption text-grey text-center">
        {{ submissionProgress.submitted }} / {{ submissionProgress.total }} players submitted
      </div>

      <q-list dense class="q-mt-md">
        <q-item v-for="player in store.game?.players" :key="player.id">
          <q-item-section avatar>
            <q-icon
              :name="
                store.currentRoundSubmissions.filter((s) => s.playerId === player.id).length >=
                store.currentPrompts.length
                  ? 'check_circle'
                  : 'hourglass_empty'
              "
              :color="
                store.currentRoundSubmissions.filter((s) => s.playerId === player.id).length >=
                store.currentPrompts.length
                  ? 'positive'
                  : 'grey'
              "
            />
          </q-item-section>
          <q-item-section>
            {{ player.name }}
            <span v-if="player.id === store.playerId" class="text-caption text-primary">
              (you)
            </span>
          </q-item-section>
        </q-item>
      </q-list>
    </q-card>
  </div>
</template>

<style scoped>
.submit-phase {
  padding-top: 1rem;
}

.submitted-input :deep(.q-field__control) {
  background: rgba(33, 186, 69, 0.1) !important;
}
</style>
