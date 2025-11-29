<script setup lang="ts">
import { ref } from 'vue'
import { useConsequencesStore } from '../../stores/consequencesStore'

const store = useConsequencesStore()

const playerName = ref('')
const gameCode = ref('')
const showJoin = ref(false)

async function handleCreate() {
  if (!playerName.value.trim()) return
  await store.createGame(playerName.value.trim())
}

async function handleJoin() {
  if (!playerName.value.trim() || !gameCode.value.trim()) return
  await store.joinGame(gameCode.value.trim(), playerName.value.trim())
}

async function handleStart() {
  await store.startGame()
}
</script>

<template>
  <div class="lobby-phase">
    <!-- Not in a game yet -->
    <template v-if="!store.gameId">
      <div class="text-center q-mb-xl">
        <h1 class="text-h3 q-mb-sm">Mad Libs: Consequences</h1>
        <p class="text-subtitle1 text-grey">A chaotic storytelling party game</p>
      </div>

      <q-card class="q-pa-lg">
        <q-input
          v-model="playerName"
          label="Your Name"
          outlined
          class="q-mb-md"
          :disable="store.isLoading"
        />

        <template v-if="!showJoin">
          <q-btn
            color="primary"
            size="lg"
            class="full-width q-mb-md"
            label="Create New Game"
            :loading="store.isLoading"
            :disable="!playerName.trim()"
            @click="handleCreate"
          />
          <q-btn
            flat
            color="grey"
            class="full-width"
            label="Join Existing Game"
            @click="showJoin = true"
          />
        </template>

        <template v-else>
          <q-input
            v-model="gameCode"
            label="Game Code"
            outlined
            class="q-mb-md"
            :disable="store.isLoading"
            mask="AAAA"
            :rules="[(v) => v.length === 4 || 'Enter 4-character code']"
          />
          <q-btn
            color="primary"
            size="lg"
            class="full-width q-mb-md"
            label="Join Game"
            :loading="store.isLoading"
            :disable="!playerName.trim() || gameCode.length !== 4"
            @click="handleJoin"
          />
          <q-btn
            flat
            color="grey"
            class="full-width"
            label="Back"
            @click="showJoin = false"
          />
        </template>
      </q-card>
    </template>

    <!-- In lobby, waiting to start -->
    <template v-else-if="store.game">
      <div class="text-center q-mb-lg">
        <p class="text-overline text-grey">GAME CODE</p>
        <h2 class="text-h2 text-weight-bold">{{ store.gameId }}</h2>
        <p class="text-caption text-grey">Share this code with friends</p>
      </div>

      <q-card class="q-pa-md q-mb-lg">
        <div class="text-subtitle2 q-mb-sm">Players ({{ store.game.players.length }})</div>
        <q-list>
          <q-item v-for="player in store.game.players" :key="player.id">
            <q-item-section avatar>
              <q-avatar color="primary" text-color="white">
                {{ player.name.charAt(0).toUpperCase() }}
              </q-avatar>
            </q-item-section>
            <q-item-section>
              {{ player.name }}
              <span v-if="player.id === store.game.hostId" class="text-caption text-grey">
                (host)
              </span>
              <span v-if="player.id === store.playerId" class="text-caption text-primary">
                (you)
              </span>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card>

      <template v-if="store.isHost">
        <q-btn
          color="primary"
          size="lg"
          class="full-width q-mb-md"
          label="Start Game"
          :loading="store.isLoading"
          :disable="store.game.players.length < 2"
          @click="handleStart"
        />
        <p v-if="store.game.players.length < 2" class="text-center text-caption text-grey">
          Need at least 2 players to start
        </p>
      </template>
      <template v-else>
        <p class="text-center text-grey">Waiting for host to start the game...</p>
      </template>

      <q-btn
        flat
        color="negative"
        class="full-width q-mt-lg"
        label="Leave Game"
        @click="store.leaveGame()"
      />
    </template>
  </div>
</template>

<style scoped>
.lobby-phase {
  padding-top: 2rem;
}
</style>
