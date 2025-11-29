<script setup lang="ts">
import { ref } from 'vue'
import { useQuasar } from 'quasar'
import { useConsequencesStore } from '../../stores/consequencesStore'
import { testGeminiConnection } from '../../services/storyGenerator'

const $q = useQuasar()
const store = useConsequencesStore()

const playerNames = ref<string[]>(['', ''])
const testingApi = ref(false)

async function testGemini() {
  testingApi.value = true
  try {
    const response = await testGeminiConnection()
    $q.notify({
      type: 'positive',
      message: 'Gemini API connected!',
      caption: response.substring(0, 100) + '...',
      timeout: 5000,
    })
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Gemini API Error',
      caption: error instanceof Error ? error.message : 'Unknown error',
      timeout: 10000,
    })
  } finally {
    testingApi.value = false
  }
}

function addPlayer() {
  if (playerNames.value.length < 8) {
    playerNames.value.push('')
  }
}

function removePlayer(index: number) {
  if (playerNames.value.length > 2) {
    playerNames.value.splice(index, 1)
  }
}

function startGame() {
  const validNames = playerNames.value
    .map((n) => n.trim())
    .filter((n) => n.length > 0)

  if (validNames.length >= 2) {
    store.startLocalGame(validNames)
  }
}

const validPlayerCount = () =>
  playerNames.value.filter((n) => n.trim().length > 0).length
</script>

<template>
  <div class="lobby-phase">
    <div class="text-center q-mb-xl">
      <h1 class="text-h3 q-mb-sm">Mad Libs: Consequences</h1>
      <p class="text-subtitle1 text-grey">A chaotic storytelling party game</p>
      <p class="text-caption text-grey-6">Pass the device — each player enters words secretly</p>
    </div>

    <q-card class="q-pa-lg">
      <div class="text-h6 q-mb-md">Who's playing?</div>

      <div v-for="(_, index) in playerNames" :key="index" class="player-row q-mb-sm">
        <q-input
          v-model="playerNames[index]"
          :label="`Player ${index + 1}`"
          outlined
          dense
          class="player-input"
        >
          <template v-slot:prepend>
            <q-avatar size="sm" color="primary" text-color="white">
              {{ index + 1 }}
            </q-avatar>
          </template>
        </q-input>
        <q-btn
          v-if="playerNames.length > 2"
          flat
          round
          dense
          icon="close"
          color="grey"
          @click="removePlayer(index)"
        />
      </div>

      <q-btn
        v-if="playerNames.length < 8"
        flat
        color="primary"
        icon="add"
        label="Add Player"
        class="q-mb-lg"
        @click="addPlayer"
      />

      <q-separator class="q-my-md" />

      <q-btn
        color="primary"
        size="lg"
        class="full-width"
        label="Start Game"
        :disable="validPlayerCount() < 2"
        @click="startGame"
      />

      <p v-if="validPlayerCount() < 2" class="text-center text-caption text-grey q-mt-sm">
        Need at least 2 players
      </p>
    </q-card>

    <q-card class="q-pa-md q-mt-lg" flat bordered>
      <div class="text-subtitle2 q-mb-sm">How to Play</div>
      <ol class="rules-list">
        <li>Each round, players take turns entering words <strong>without seeing the story</strong></li>
        <li>After everyone submits, AI weaves the words into a deadpan narrative</li>
        <li>Words from earlier rounds become "load-bearing" — the AI references them later</li>
        <li>Chaos escalates each round. By round 5, expect callbacks to everything.</li>
      </ol>
    </q-card>

    <!-- Debug: Test Gemini API -->
    <q-btn
      flat
      size="sm"
      color="grey"
      icon="bug_report"
      label="Test Gemini API"
      class="q-mt-lg"
      :loading="testingApi"
      @click="testGemini"
    />
  </div>
</template>

<style scoped>
.lobby-phase {
  padding-top: 2rem;
}

.player-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.player-input {
  flex: 1;
}

.rules-list {
  margin: 0;
  padding-left: 1.25rem;
}

.rules-list li {
  margin-bottom: 0.5rem;
}

.rules-list li:last-child {
  margin-bottom: 0;
}
</style>
