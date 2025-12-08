// ============================================================================
// ARC LIGHT PINIA STORE
// Central state management for Arc Light narrative game
// ============================================================================

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  ArcLightGame,
  GoalTemplate,
  Player,
  PlayerContribution,
  NarrativeState,
  ArcLightPhase,
  ActionChoice,
} from '../types/arclight'
import * as localGame from '../services/localArcLightGame'
import { generateNarrativeTurn, type NarrativeGenerationContext } from '../services/narrativeGenerator'
import { generateActionChoices } from '../services/choiceGenerator'

// ============================================================================
// STORE DEFINITION
// ============================================================================

export const useArcLightStore = defineStore('arcLight', () => {
  // ============================================================================
  // STATE
  // ============================================================================

  const game = ref<ArcLightGame | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const currentChoices = ref<ActionChoice[]>([])
  const isGeneratingChoices = ref(false)

  let unsubscribe: (() => void) | null = null

  // ============================================================================
  // COMPUTED
  // ============================================================================

  const phase = computed<ArcLightPhase>(() => game.value?.phase || 'lobby')

  const currentState = computed<NarrativeState | null>(() => game.value?.currentState || null)

  const currentTurnNumber = computed(() => game.value?.currentTurnNumber || 0)

  const currentPlayer = computed<Player | null>(() => {
    if (!game.value) return null
    return game.value.players[game.value.currentPlayerIndex] || null
  })

  const previousState = computed<NarrativeState | null>(() => {
    return localGame.getPreviousState()
  })

  const currentGeneratedTurn = computed(() => {
    if (!game.value || game.value.generatedTurns.length === 0) return null
    return game.value.generatedTurns[game.value.generatedTurns.length - 1]
  })

  const isStoryComplete = computed(() => {
    return localGame.isStoryComplete()
  })

  const allGeneratedTurns = computed(() => {
    return game.value?.generatedTurns || []
  })

  const allContributions = computed(() => {
    return game.value?.contributions || []
  })

  const goalTemplate = computed(() => game.value?.goalTemplate || null)

  // ============================================================================
  // ACTIONS
  // ============================================================================

  /**
   * Start a new local game
   */
  function startLocalGame(
    selectedGoal: GoalTemplate,
    playerNames: string[],
    maxTurns?: number
  ) {
    try {
      error.value = null

      // Create game via service
      localGame.createLocalGame(selectedGoal, playerNames, maxTurns)

      // Subscribe to updates
      unsubscribe = localGame.subscribeToLocalGame((updatedGame) => {
        game.value = updatedGame
      })
    } catch (e: any) {
      error.value = `Failed to start game: ${e.message}`
      console.error('[Arc Light Store] Start game error:', e)
    }
  }

  /**
   * Transition from briefing to first turn
   */
  async function startFirstTurn() {
    if (!game.value) {
      console.error('[Arc Light Store] No game found!')
      return
    }

    try {
      error.value = null
      localGame.startSubmitting()

      // Generate action choices for first turn
      await generateChoices()
    } catch (e: any) {
      error.value = `Failed to start turn: ${e.message}`
      console.error('[Arc Light Store] Start turn error:', e)
    }
  }

  /**
   * Generate action choices for current turn
   */
  async function generateChoices() {
    if (!game.value || !currentState.value || !goalTemplate.value) return

    isGeneratingChoices.value = true
    error.value = null

    try {
      const choices = await generateActionChoices(
        currentState.value,
        goalTemplate.value,
        currentTurnNumber.value + 1
      )
      currentChoices.value = choices
    } catch (e: any) {
      error.value = `Failed to generate choices: ${e.message}`
      console.error('[Arc Light Store] Generate choices error:', e)
      // Set empty array on error so custom action is still available
      currentChoices.value = []
    } finally {
      isGeneratingChoices.value = false
    }
  }

  /**
   * Submit a player action (from choice or custom)
   */
  async function submitAction(actionText: string, choiceId?: string) {
    if (!game.value || !currentPlayer.value || !currentState.value) {
      error.value = 'No active game or player'
      return
    }

    try {
      error.value = null

      // Validate word count only for custom actions
      if (!choiceId) {
        const wordCount = actionText.trim().split(/\s+/).length
        if (wordCount < 10) {
          error.value = 'Action must be at least 10 words'
          return
        }
        if (wordCount > 50) {
          error.value = 'Action must be 50 words or less'
          return
        }
      }

      // Create contribution
      const contribution: PlayerContribution = {
        id: `contrib-${Date.now()}`,
        turnNumber: currentTurnNumber.value + 1, // Next turn number
        playerId: currentPlayer.value.id,
        playerName: currentPlayer.value.name,
        action: actionText.trim(),
        choiceId,
        isCustom: !choiceId,
        stateSnapshot: { ...currentState.value },
        submittedAt: Date.now(),
      }

      // Add to game
      localGame.addContribution(contribution)

      // Trigger AI generation
      await generateNarrative(contribution)
    } catch (e: any) {
      error.value = `Failed to submit action: ${e.message}`
      console.error('[Arc Light Store] Submit action error:', e)
    }
  }

  /**
   * Generate narrative from AI (internal)
   */
  async function generateNarrative(contribution: PlayerContribution) {
    if (!game.value || !currentState.value) return

    isLoading.value = true
    error.value = null

    try {
      // Get previous prose (last 2-3 turns)
      const previousProse = game.value.generatedTurns
        .slice(-3)
        .map(turn => turn.proseSnippet)

      // Build context
      const context: NarrativeGenerationContext = {
        currentState: currentState.value,
        goalTemplate: game.value.goalTemplate,
        playerContribution: contribution.action,
        previousProse,
        turnNumber: contribution.turnNumber,
        maxTurns: game.value.maxTurns,
      }

      // Call AI service
      const generatedTurn = await generateNarrativeTurn(context, contribution.id)

      // Add to game
      localGame.addGeneratedTurn(generatedTurn)
    } catch (e: any) {
      error.value = `AI generation failed: ${e.message}`
      console.error('[Arc Light Store] Generate narrative error:', e)

      // Note: narrativeGenerator.ts already has fallback logic
      // If we reach here, fallback has already been applied
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Advance to next turn or complete
   */
  async function advanceToNextTurn() {
    try {
      error.value = null
      localGame.advanceToNextTurn()

      // Generate choices for next turn if not complete
      if (!isStoryComplete.value && phase.value === 'submitting') {
        await generateChoices()
      }
    } catch (e: any) {
      error.value = `Failed to advance turn: ${e.message}`
      console.error('[Arc Light Store] Advance turn error:', e)
    }
  }

  /**
   * Reset game (return to lobby)
   */
  function resetGame() {
    try {
      error.value = null

      // Unsubscribe from updates
      if (unsubscribe) {
        unsubscribe()
        unsubscribe = null
      }

      // Reset service
      localGame.resetGame()

      // Clear local state
      game.value = null
      isLoading.value = false
    } catch (e: any) {
      error.value = `Failed to reset game: ${e.message}`
      console.error('[Arc Light Store] Reset game error:', e)
    }
  }

  /**
   * Clear error message
   */
  function clearError() {
    error.value = null
  }

  /**
   * Leave game and cleanup
   */
  function leaveGame() {
    resetGame()
  }

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // State
    game,
    isLoading,
    error,
    currentChoices,
    isGeneratingChoices,

    // Computed
    phase,
    currentState,
    currentTurnNumber,
    currentPlayer,
    previousState,
    currentGeneratedTurn,
    isStoryComplete,
    allGeneratedTurns,
    allContributions,
    goalTemplate,

    // Actions
    startLocalGame,
    startFirstTurn,
    submitAction,
    generateChoices,
    advanceToNextTurn,
    resetGame,
    clearError,
    leaveGame,
  }
})
