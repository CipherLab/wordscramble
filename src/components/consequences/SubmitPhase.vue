<script setup lang="ts">
import { ref, watch } from 'vue'
import { useConsequencesStore } from '../../stores/consequencesStore'

const store = useConsequencesStore()

const currentWord = ref('')
const showPassScreen = ref(false)
const lastPlayerIndex = ref(-1)

// Show pass screen when player changes
watch(() => store.currentPlayerIndex, (newIndex, oldIndex) => {
  if (oldIndex !== undefined && newIndex !== oldIndex && newIndex > 0) {
    showPassScreen.value = true
  }
  lastPlayerIndex.value = newIndex
})

function submitWord() {
  const word = currentWord.value.trim()
  if (!word) return

  store.submitWord(word)
  currentWord.value = ''
}

function continueAfterPass() {
  showPassScreen.value = false
}
</script>

<template>
  <div class="submit-phase">
    <!-- Pass the device screen -->
    <div v-if="showPassScreen" class="pass-screen text-center">
      <q-icon name="smartphone" size="80px" color="primary" class="q-mb-lg" />
      <h2 class="text-h4 q-mb-md">Pass to {{ store.currentPlayer?.name }}</h2>
      <p class="text-grey q-mb-xl">Don't peek at their words!</p>
      <q-btn
        color="primary"
        size="lg"
        label="I'm Ready"
        @click="continueAfterPass"
      />
    </div>

    <!-- Word input screen -->
    <template v-else>
      <div class="text-center q-mb-lg">
        <p class="text-overline">
          ROUND {{ store.currentRound }} of {{ store.game?.totalRounds }}
        </p>
        <q-badge
          :color="store.currentRound <= 2 ? 'positive' : store.currentRound <= 4 ? 'warning' : 'negative'"
          class="q-mb-md"
        >
          {{ store.chaosLevel }}
        </q-badge>
      </div>

      <q-card class="prompt-card q-pa-lg q-mb-lg text-center">
        <div class="player-turn q-mb-lg">
          <q-avatar size="60px" color="primary" text-color="white" class="q-mb-sm">
            {{ store.currentPlayer?.name?.charAt(0)?.toUpperCase() }}
          </q-avatar>
          <h3 class="text-h5 q-mb-none">{{ store.currentPlayer?.name }}'s turn</h3>
        </div>

        <div class="prompt-request q-mb-lg">
          <p class="text-overline text-grey q-mb-xs">Enter a...</p>
          <h2 class="text-h3 text-weight-bold text-primary q-mb-sm">
            {{ store.currentPrompt?.type?.toUpperCase() }}
          </h2>
          <p class="text-subtitle1 text-grey">
            {{ store.currentPrompt?.hint }}
          </p>
        </div>

        <q-input
          v-model="currentWord"
          outlined
          autofocus
          placeholder="Type your word..."
          class="word-input q-mb-md"
          @keyup.enter="submitWord"
        />

        <q-btn
          color="primary"
          size="lg"
          class="full-width"
          label="Submit"
          :disable="!currentWord.trim()"
          @click="submitWord"
        />

        <div class="progress-indicator q-mt-lg">
          <div class="text-caption text-grey q-mb-xs">
            Prompt {{ store.currentPromptIndex + 1 }} of {{ store.currentPrompts.length }}
          </div>
          <q-linear-progress
            :value="(store.currentPromptIndex + 1) / store.currentPrompts.length"
            color="primary"
            track-color="grey-3"
          />
        </div>
      </q-card>

      <q-card class="q-pa-sm" flat bordered>
        <div class="player-progress">
          <span
            v-for="(player, i) in store.players"
            :key="player.id"
            class="player-dot"
            :class="{
              'active': i === store.currentPlayerIndex,
              'done': i < store.currentPlayerIndex
            }"
          >
            <q-tooltip>{{ player.name }}</q-tooltip>
          </span>
        </div>
        <div class="text-caption text-center text-grey">
          {{ store.currentPlayerIndex + 1 }} / {{ store.players.length }} players
        </div>
      </q-card>
    </template>
  </div>
</template>

<style scoped>
.submit-phase {
  padding-top: 1rem;
}

.pass-screen {
  padding: 4rem 2rem;
}

.prompt-card {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
}

:deep(.body--dark) .prompt-card {
  background: linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 100%);
}

.word-input :deep(input) {
  font-size: 1.5rem;
  text-align: center;
}

.player-progress {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem;
}

.player-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #ddd;
  cursor: pointer;
  transition: all 0.2s;
}

.player-dot.active {
  background: var(--q-primary);
  transform: scale(1.3);
}

.player-dot.done {
  background: #21ba45;
}
</style>
