// Pinia store for Mad Libs: Consequences game state

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  ConsequencesGame,
  WordSubmission,
  RoundStory,
} from '../types/consequences'
import { CHAOS_LEVELS } from '../types/consequences'
import * as gameService from '../services/consequencesFirebase'
import { generateStory } from '../services/storyGenerator'
import type { Unsubscribe } from 'firebase/firestore'

export const useConsequencesStore = defineStore('consequences', () => {
  // Local player state
  const playerId = ref<string | null>(null)
  const playerName = ref<string>('')

  // Current game state (synced from Firebase)
  const game = ref<ConsequencesGame | null>(null)
  const gameId = ref<string | null>(null)

  // UI state
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const mySubmissions = ref<Map<string, string>>(new Map()) // promptId -> word

  // Firebase subscription
  let unsubscribe: Unsubscribe | null = null

  // Computed
  const isHost = computed(() => game.value?.hostId === playerId.value)

  const currentPlayer = computed(() =>
    game.value?.players.find((p) => p.id === playerId.value)
  )

  const phase = computed(() => game.value?.phase || 'lobby')

  const currentRound = computed(() => game.value?.currentRound || 1)

  const chaosLevel = computed(() => CHAOS_LEVELS[currentRound.value] || 'gentle')

  const currentPrompts = computed(() => game.value?.currentPrompts || [])

  const currentRoundSubmissions = computed(() =>
    game.value?.submissions.filter((s) => s.round === currentRound.value) || []
  )

  const myCurrentRoundSubmissions = computed(() =>
    currentRoundSubmissions.value.filter((s) => s.playerId === playerId.value)
  )

  const hasSubmittedAllPrompts = computed(() => {
    if (!game.value) return false
    const mySubmitted = myCurrentRoundSubmissions.value.map((s) => s.promptId)
    return currentPrompts.value.every((p) => mySubmitted.includes(p.id))
  })

  const allPlayersSubmitted = computed(() => {
    if (!game.value) return false
    const expectedCount = game.value.players.length * currentPrompts.value.length
    return currentRoundSubmissions.value.length >= expectedCount
  })

  const currentStory = computed(() =>
    game.value?.stories.find((s) => s.round === currentRound.value)
  )

  const allStories = computed(() => game.value?.stories || [])

  const allSubmissions = computed(() => game.value?.submissions || [])

  // Actions
  async function createGame(name: string) {
    isLoading.value = true
    error.value = null

    try {
      playerName.value = name
      const result = await gameService.createGame(name)
      playerId.value = result.playerId
      gameId.value = result.gameId

      // Save to localStorage for reconnection
      localStorage.setItem('consequences_playerId', result.playerId)
      localStorage.setItem('consequences_gameId', result.gameId)
      localStorage.setItem('consequences_playerName', name)

      subscribeToGame(result.gameId)
    } catch (e) {
      error.value = 'Failed to create game'
      console.error(e)
    } finally {
      isLoading.value = false
    }
  }

  async function joinGame(code: string, name: string) {
    isLoading.value = true
    error.value = null

    try {
      playerName.value = name
      const result = await gameService.joinGame(code, name)

      if (!result.success) {
        error.value = result.error || 'Failed to join game'
        return
      }

      playerId.value = result.playerId!
      gameId.value = code.toUpperCase()

      // Save to localStorage
      localStorage.setItem('consequences_playerId', result.playerId!)
      localStorage.setItem('consequences_gameId', code.toUpperCase())
      localStorage.setItem('consequences_playerName', name)

      subscribeToGame(code.toUpperCase())
    } catch (e) {
      error.value = 'Failed to join game'
      console.error(e)
    } finally {
      isLoading.value = false
    }
  }

  function subscribeToGame(id: string) {
    if (unsubscribe) {
      unsubscribe()
    }

    unsubscribe = gameService.subscribeToGame(id, (gameData) => {
      game.value = gameData

      // Auto-trigger story generation when all submitted (host only)
      if (
        gameData &&
        gameData.phase === 'submitting' &&
        gameData.hostId === playerId.value
      ) {
        const expectedCount = gameData.players.length * gameData.currentPrompts.length
        const currentCount = gameData.submissions.filter(
          (s) => s.round === gameData.currentRound
        ).length

        if (currentCount >= expectedCount) {
          triggerStoryGeneration()
        }
      }
    })
  }

  async function startGame() {
    if (!gameId.value || !isHost.value) return

    isLoading.value = true
    try {
      await gameService.startGame(gameId.value)
    } catch (e) {
      error.value = 'Failed to start game'
      console.error(e)
    } finally {
      isLoading.value = false
    }
  }

  async function submitWord(promptId: string, word: string) {
    if (!gameId.value || !playerId.value || !game.value) return

    const prompt = currentPrompts.value.find((p) => p.id === promptId)
    if (!prompt) return

    const submission: WordSubmission = {
      round: currentRound.value,
      playerId: playerId.value,
      playerName: playerName.value,
      promptId,
      wordType: prompt.type,
      word: word.trim(),
      submittedAt: Date.now(),
    }

    try {
      await gameService.submitWord(gameId.value, submission)
      mySubmissions.value.set(promptId, word)
    } catch (e) {
      error.value = 'Failed to submit word'
      console.error(e)
    }
  }

  async function triggerStoryGeneration() {
    if (!gameId.value || !game.value) return

    await gameService.startGenerating(gameId.value)

    try {
      // Gather all submissions for context
      const roundSubmissions = game.value.submissions.filter(
        (s) => s.round === game.value!.currentRound
      )
      const previousStories = game.value.stories
      const allPreviousSubmissions = game.value.submissions.filter(
        (s) => s.round < game.value!.currentRound
      )

      // Generate the story
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

      await gameService.addStoryAndReveal(gameId.value, story)
    } catch (e) {
      error.value = 'Failed to generate story'
      console.error(e)
    }
  }

  async function nextRound() {
    if (!gameId.value || !isHost.value) return

    mySubmissions.value.clear()

    try {
      await gameService.nextRound(gameId.value)
    } catch (e) {
      error.value = 'Failed to advance round'
      console.error(e)
    }
  }

  function leaveGame() {
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }

    game.value = null
    gameId.value = null
    playerId.value = null
    playerName.value = ''
    mySubmissions.value.clear()
    error.value = null

    localStorage.removeItem('consequences_playerId')
    localStorage.removeItem('consequences_gameId')
    localStorage.removeItem('consequences_playerName')
  }

  // Try to reconnect to existing game
  function tryReconnect() {
    const savedPlayerId = localStorage.getItem('consequences_playerId')
    const savedGameId = localStorage.getItem('consequences_gameId')
    const savedName = localStorage.getItem('consequences_playerName')

    if (savedPlayerId && savedGameId && savedName) {
      playerId.value = savedPlayerId
      gameId.value = savedGameId
      playerName.value = savedName
      subscribeToGame(savedGameId)
      return true
    }
    return false
  }

  return {
    // State
    playerId,
    playerName,
    game,
    gameId,
    isLoading,
    error,
    mySubmissions,

    // Computed
    isHost,
    currentPlayer,
    phase,
    currentRound,
    chaosLevel,
    currentPrompts,
    currentRoundSubmissions,
    myCurrentRoundSubmissions,
    hasSubmittedAllPrompts,
    allPlayersSubmitted,
    currentStory,
    allStories,
    allSubmissions,

    // Actions
    createGame,
    joinGame,
    startGame,
    submitWord,
    nextRound,
    leaveGame,
    tryReconnect,
  }
})
