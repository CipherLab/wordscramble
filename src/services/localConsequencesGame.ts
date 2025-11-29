// Local (pass-and-play) game service for Mad Libs: Consequences
// No Firebase required — all state is in memory

import type {
  ConsequencesGame,
  WordSubmission,
  RoundStory,
} from '../types/consequences'
import { generateGameCode, ROUND_PROMPTS } from '../types/consequences'

let currentGame: ConsequencesGame | null = null
let listeners: ((game: ConsequencesGame | null) => void)[] = []

function notify() {
  listeners.forEach((cb) => cb(currentGame))
}

export function createLocalGame(players: string[]): ConsequencesGame {
  const now = Date.now()

  currentGame = {
    id: generateGameCode(),
    hostId: 'local',
    createdAt: now,
    players: players.map((name, i) => ({
      id: `player-${i}`,
      name,
      joinedAt: now,
    })),
    currentRound: 1,
    totalRounds: 5,
    phase: 'submitting',
    currentPrompts: ROUND_PROMPTS[1] || [],
    submissions: [],
    stories: [],
    roundStartedAt: now,
    roundDurationSeconds: 60,
  }

  notify()
  return currentGame
}

export function getLocalGame(): ConsequencesGame | null {
  return currentGame
}

export function subscribeToLocalGame(
  callback: (game: ConsequencesGame | null) => void
): () => void {
  listeners.push(callback)
  callback(currentGame)

  return () => {
    listeners = listeners.filter((cb) => cb !== callback)
  }
}

export function submitLocalWord(submission: WordSubmission): void {
  if (!currentGame) return

  currentGame.submissions.push(submission)
  currentGame = { ...currentGame } // trigger reactivity
  notify()
}

export function startGeneratingPhase(): void {
  if (!currentGame) return

  currentGame.phase = 'generating'
  currentGame = { ...currentGame }
  notify()
}

export function addLocalStory(story: RoundStory): void {
  if (!currentGame) return

  currentGame.stories.push(story)
  currentGame.phase = 'reveal'
  currentGame = { ...currentGame }
  notify()
}

export function advanceToNextRound(): void {
  if (!currentGame) return

  const nextRound = currentGame.currentRound + 1

  if (nextRound > currentGame.totalRounds) {
    currentGame.phase = 'complete'
  } else {
    currentGame.currentRound = nextRound
    currentGame.currentPrompts = ROUND_PROMPTS[nextRound] || []
    currentGame.phase = 'submitting'
    currentGame.roundStartedAt = Date.now()
  }

  currentGame = { ...currentGame }
  notify()
}

export function resetLocalGame(): void {
  currentGame = null
  notify()
}

// Get current player based on submission state
export function getCurrentPlayerIndex(game: ConsequencesGame): number {
  const currentRoundSubs = game.submissions.filter(s => s.round === game.currentRound)
  const promptsPerPlayer = game.currentPrompts.length

  // Each player submits all prompts before moving to next player
  const completedPlayers = Math.floor(currentRoundSubs.length / promptsPerPlayer)
  return Math.min(completedPlayers, game.players.length - 1)
}

export function getCurrentPromptIndex(game: ConsequencesGame): number {
  const currentRoundSubs = game.submissions.filter(s => s.round === game.currentRound)
  const promptsPerPlayer = game.currentPrompts.length

  return currentRoundSubs.length % promptsPerPlayer
}

export function allPlayersSubmitted(game: ConsequencesGame): boolean {
  const currentRoundSubs = game.submissions.filter(s => s.round === game.currentRound)
  const expectedTotal = game.players.length * game.currentPrompts.length
  return currentRoundSubs.length >= expectedTotal
}
