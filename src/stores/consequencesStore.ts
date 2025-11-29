// Pinia store for Mad Libs: Consequences game state
// Local pass-and-play mode

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  ConsequencesGame,
  WordSubmission,
  RoundStory,
} from '../types/consequences'
import { CHAOS_LEVELS } from '../types/consequences'
import * as localGame from '../services/localConsequencesGame'
import { generateStory } from '../services/storyGenerator'

export const useConsequencesStore = defineStore('consequences', () => {
  // Current game state
  const game = ref<ConsequencesGame | null>(null)

  // UI state
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // Local game subscription
  let unsubscribe: (() => void) | null = null

  // Computed
  const phase = computed(() => game.value?.phase || 'lobby')
  const currentRound = computed(() => game.value?.currentRound || 1)
  const chaosLevel = computed(() => CHAOS_LEVELS[currentRound.value] || 'gentle')
  const currentPrompts = computed(() => game.value?.currentPrompts || [])
  const players = computed(() => game.value?.players || [])

  const currentRoundSubmissions = computed(() =>
    game.value?.submissions.filter((s) => s.round === currentRound.value) || []
  )

  // Current player taking their turn (pass-and-play)
  const currentPlayerIndex = computed(() => {
    if (!game.value) return 0
    return localGame.getCurrentPlayerIndex(game.value)
  })

  const currentPlayer = computed(() => {
    if (!game.value) return null
    return game.value.players[currentPlayerIndex.value] || null
  })

  // Current prompt for the current player
  const currentPromptIndex = computed(() => {
    if (!game.value) return 0
    return localGame.getCurrentPromptIndex(game.value)
  })

  const currentPrompt = computed(() => {
    if (!game.value) return null
    return game.value.currentPrompts[currentPromptIndex.value] || null
  })

  const allPlayersSubmitted = computed(() => {
    if (!game.value) return false
    return localGame.allPlayersSubmitted(game.value)
  })

  const currentStory = computed(() =>
    game.value?.stories.find((s) => s.round === currentRound.value)
  )

  const allStories = computed(() => game.value?.stories || [])
  const allSubmissions = computed(() => game.value?.submissions || [])

  // Actions
  function startLocalGame(playerNames: string[]) {
    if (unsubscribe) unsubscribe()

    localGame.createLocalGame(playerNames)

    unsubscribe = localGame.subscribeToLocalGame((gameData) => {
      game.value = gameData
    })
  }

  function submitWord(word: string) {
    if (!game.value || !currentPlayer.value || !currentPrompt.value) return

    const submission: WordSubmission = {
      round: currentRound.value,
      playerId: currentPlayer.value.id,
      playerName: currentPlayer.value.name,
      promptId: currentPrompt.value.id,
      wordType: currentPrompt.value.type,
      word: word.trim(),
      submittedAt: Date.now(),
    }

    localGame.submitLocalWord(submission)

    // Check if all players have submitted
    if (localGame.allPlayersSubmitted(localGame.getLocalGame()!)) {
      triggerStoryGeneration()
    }
  }

  async function triggerStoryGeneration() {
    if (!game.value) return

    localGame.startGeneratingPhase()
    isLoading.value = true
    error.value = null

    try {
      const roundSubmissions = game.value.submissions.filter(
        (s) => s.round === game.value!.currentRound
      )
      const previousStories = game.value.stories
      const allPreviousSubmissions = game.value.submissions.filter(
        (s) => s.round < game.value!.currentRound
      )

      const storyText = await generateStory({
        round: game.value.currentRound,
        totalRounds: game.value.totalRounds,
        chaosLevel: CHAOS_LEVELS[game.value.currentRound] || 'gentle',
        currentSubmissions: roundSubmissions,
        previousStories,
        previousSubmissions: allPreviousSubmissions,
        players: game.value.players,
      })

      const story: RoundStory = {
        round: game.value.currentRound,
        storyText,
        generatedAt: Date.now(),
      }

      localGame.addLocalStory(story)
    } catch (e) {
      error.value = 'Failed to generate story'
      console.error(e)
    } finally {
      isLoading.value = false
    }
  }

  function nextRound() {
    localGame.advanceToNextRound()
  }

  function leaveGame() {
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
    localGame.resetLocalGame()
    game.value = null
    error.value = null
  }

  return {
    // State
    game,
    isLoading,
    error,

    // Computed
    phase,
    currentRound,
    chaosLevel,
    currentPrompts,
    players,
    currentRoundSubmissions,
    currentPlayerIndex,
    currentPlayer,
    currentPromptIndex,
    currentPrompt,
    allPlayersSubmitted,
    currentStory,
    allStories,
    allSubmissions,

    // Actions
    startLocalGame,
    submitWord,
    nextRound,
    leaveGame,
  }
})
