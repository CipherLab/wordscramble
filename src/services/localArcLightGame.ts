// ============================================================================
// LOCAL ARC LIGHT GAME SERVICE
// In-memory game state management with pub/sub pattern
// ============================================================================

import type {
  ArcLightGame,
  GoalTemplate,
  Player,
  PlayerContribution,
  GeneratedTurn,
  NarrativeState,
  Character,
} from '../types/arclight'

// ============================================================================
// STATE
// ============================================================================

let currentGame: ArcLightGame | null = null
let listeners: ((game: ArcLightGame | null) => void)[] = []

// ============================================================================
// SUBSCRIPTION / NOTIFICATION
// ============================================================================

function notify() {
  // Create a shallow copy to trigger Vue reactivity
  const gameCopy = currentGame ? { ...currentGame } : null
  listeners.forEach(callback => callback(gameCopy))
}

export function subscribeToLocalGame(callback: (game: ArcLightGame | null) => void): () => void {
  listeners.push(callback)
  // Immediately call with current state (shallow copy for reactivity)
  const gameCopy = currentGame ? { ...currentGame } : null
  callback(gameCopy)

  // Return unsubscribe function
  return () => {
    listeners = listeners.filter(l => l !== callback)
  }
}

// ============================================================================
// GAME INITIALIZATION
// ============================================================================

/**
 * Create a new local game
 */
export function createLocalGame(
  goalTemplate: GoalTemplate,
  playerNames: string[],
  maxTurns?: number
): ArcLightGame {
  // Validate player names
  if (playerNames.length === 0) {
    throw new Error('At least one player is required')
  }

  // Create players
  const players: Player[] = playerNames.map((name, index) => ({
    id: `player-${index}`,
    name,
    joinedAt: Date.now(),
  }))

  // Initialize characters with IDs
  const characters: Character[] = goalTemplate.initialCharacters.map((char, index) => ({
    id: `char-${index}`,
    name: char.name,
    location: char.location,
    emotion: char.emotion,
    avatar: char.avatar,
  }))

  // Create initial narrative state
  const initialState: NarrativeState = {
    characters,
    tension: 0,
    plotProgress: 0,
    currentSceneLocation: goalTemplate.initialSceneLocation,
    goalReached: false,
    turnNumber: 0,
    totalTurns: maxTurns || goalTemplate.estimatedTurns,
  }

  // Create game
  const hostPlayer = players[0]
  if (!hostPlayer) throw new Error('No players provided')
  currentGame = {
    id: `local-${Date.now()}`,
    hostId: hostPlayer.id,
    createdAt: Date.now(),
    players,
    goalTemplate,
    maxTurns: maxTurns || goalTemplate.estimatedTurns,
    currentState: initialState,
    phase: 'briefing', // Start at briefing to show initial state
    currentTurnNumber: 0,
    currentPlayerIndex: 0,
    contributions: [],
    generatedTurns: [],
    turnStartedAt: null,
    turnDurationSeconds: 120,
  }

  notify()
  return currentGame
}

// ============================================================================
// PHASE TRANSITIONS
// ============================================================================

/**
 * Transition from briefing to first turn
 */
export function startSubmitting(): void {
  if (!currentGame) return

  currentGame.phase = 'submitting'
  currentGame.turnStartedAt = Date.now()
  notify()
}

/**
 * Add a player contribution and transition to generating phase
 */
export function addContribution(contribution: PlayerContribution): void {
  if (!currentGame) return

  currentGame.contributions.push(contribution)
  currentGame.phase = 'generating'
  notify()
}

/**
 * Add generated turn and transition to reveal phase
 */
export function addGeneratedTurn(turn: GeneratedTurn): void {
  if (!currentGame) return

  currentGame.generatedTurns.push(turn)
  currentGame.currentState = turn.updatedState
  currentGame.currentTurnNumber = turn.turnNumber
  currentGame.phase = 'reveal'
  notify()
}

/**
 * Advance to next player's turn or complete the story
 */
export function advanceToNextTurn(): void {
  if (!currentGame) return

  // Check if story is complete
  if (currentGame.currentState.goalReached || currentGame.currentTurnNumber >= currentGame.maxTurns) {
    currentGame.phase = 'complete'
    notify()
    return
  }

  // Next player (for pass-and-play)
  if (currentGame.players.length > 0) {
    currentGame.currentPlayerIndex = (currentGame.currentPlayerIndex + 1) % currentGame.players.length
  }
  currentGame.phase = 'submitting'
  currentGame.turnStartedAt = Date.now()
  notify()
}

/**
 * Mark story as complete
 */
export function completeStory(): void {
  if (!currentGame) return

  currentGame.phase = 'complete'
  notify()
}

// ============================================================================
// GAME RESET
// ============================================================================

/**
 * Reset game state (return to lobby)
 */
export function resetGame(): void {
  currentGame = null
  notify()
}

// ============================================================================
// GETTERS
// ============================================================================

/**
 * Get current game state
 */
export function getCurrentGame(): ArcLightGame | null {
  return currentGame
}

/**
 * Get current player
 */
export function getCurrentPlayer(): Player | null {
  if (!currentGame) return null
  return currentGame.players[currentGame.currentPlayerIndex] || null
}

/**
 * Get previous narrative state (for highlighting changes)
 */
export function getPreviousState(): NarrativeState | null {
  if (!currentGame || currentGame.generatedTurns.length < 2) return null
  const previousTurn = currentGame.generatedTurns[currentGame.generatedTurns.length - 2]
  return previousTurn?.updatedState || null
}

/**
 * Get last contribution
 */
export function getLastContribution(): PlayerContribution | null {
  if (!currentGame || currentGame.contributions.length === 0) return null
  return currentGame.contributions[currentGame.contributions.length - 1] || null
}

/**
 * Check if story is complete
 */
export function isStoryComplete(): boolean {
  if (!currentGame) return false
  return currentGame.currentState.goalReached || currentGame.currentTurnNumber >= currentGame.maxTurns
}
