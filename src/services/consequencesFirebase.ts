// Firebase service for Mad Libs: Consequences multiplayer sync

import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  arrayUnion,
} from 'firebase/firestore'
import type { Unsubscribe } from 'firebase/firestore'
import { db } from './firebase'
import type {
  ConsequencesGame,
  Player,
  WordSubmission,
  RoundStory,
} from '../types/consequences'
import { generateGameCode, ROUND_PROMPTS } from '../types/consequences'

const GAMES_COLLECTION = 'consequences_games'

// Create a new game lobby
export async function createGame(hostName: string): Promise<{ gameId: string; playerId: string }> {
  const gameCode = generateGameCode()
  const playerId = crypto.randomUUID()

  const game: ConsequencesGame = {
    id: gameCode,
    hostId: playerId,
    createdAt: Date.now(),
    players: [
      {
        id: playerId,
        name: hostName,
        joinedAt: Date.now(),
      },
    ],
    currentRound: 1,
    totalRounds: 5,
    phase: 'lobby',
    currentPrompts: [],
    submissions: [],
    stories: [],
    roundStartedAt: null,
    roundDurationSeconds: 60,
  }

  await setDoc(doc(db, GAMES_COLLECTION, gameCode), game)

  return { gameId: gameCode, playerId }
}

// Join an existing game
export async function joinGame(
  gameCode: string,
  playerName: string
): Promise<{ success: boolean; playerId?: string; error?: string }> {
  const gameRef = doc(db, GAMES_COLLECTION, gameCode.toUpperCase())
  const gameSnap = await getDoc(gameRef)

  if (!gameSnap.exists()) {
    return { success: false, error: 'Game not found' }
  }

  const game = gameSnap.data() as ConsequencesGame

  if (game.phase !== 'lobby') {
    return { success: false, error: 'Game already in progress' }
  }

  const playerId = crypto.randomUUID()
  const newPlayer: Player = {
    id: playerId,
    name: playerName,
    joinedAt: Date.now(),
  }

  await updateDoc(gameRef, {
    players: arrayUnion(newPlayer),
  })

  return { success: true, playerId }
}

// Subscribe to game state changes
export function subscribeToGame(
  gameId: string,
  callback: (game: ConsequencesGame | null) => void
): Unsubscribe {
  const gameRef = doc(db, GAMES_COLLECTION, gameId)

  return onSnapshot(gameRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data() as ConsequencesGame)
    } else {
      callback(null)
    }
  })
}

// Start the game (host only)
export async function startGame(gameId: string): Promise<void> {
  const gameRef = doc(db, GAMES_COLLECTION, gameId)

  await updateDoc(gameRef, {
    phase: 'submitting',
    currentRound: 1,
    currentPrompts: ROUND_PROMPTS[1],
    roundStartedAt: Date.now(),
  })
}

// Submit a word
export async function submitWord(
  gameId: string,
  submission: WordSubmission
): Promise<void> {
  const gameRef = doc(db, GAMES_COLLECTION, gameId)

  await updateDoc(gameRef, {
    submissions: arrayUnion(submission),
  })
}

// Check if all players have submitted for current round
export async function checkAllSubmitted(gameId: string): Promise<boolean> {
  const gameRef = doc(db, GAMES_COLLECTION, gameId)
  const gameSnap = await getDoc(gameRef)

  if (!gameSnap.exists()) return false

  const game = gameSnap.data() as ConsequencesGame
  const currentRoundSubmissions = game.submissions.filter(
    (s) => s.round === game.currentRound
  )

  // Each player should have submitted one word per prompt
  const expectedSubmissions = game.players.length * game.currentPrompts.length
  return currentRoundSubmissions.length >= expectedSubmissions
}

// Transition to generating phase
export async function startGenerating(gameId: string): Promise<void> {
  const gameRef = doc(db, GAMES_COLLECTION, gameId)

  await updateDoc(gameRef, {
    phase: 'generating',
  })
}

// Add generated story and transition to reveal
export async function addStoryAndReveal(
  gameId: string,
  story: RoundStory
): Promise<void> {
  const gameRef = doc(db, GAMES_COLLECTION, gameId)

  await updateDoc(gameRef, {
    stories: arrayUnion(story),
    phase: 'reveal',
  })
}

// Move to next round
export async function nextRound(gameId: string): Promise<void> {
  const gameRef = doc(db, GAMES_COLLECTION, gameId)
  const gameSnap = await getDoc(gameRef)

  if (!gameSnap.exists()) return

  const game = gameSnap.data() as ConsequencesGame
  const nextRoundNum = game.currentRound + 1

  if (nextRoundNum > game.totalRounds) {
    // Game complete
    await updateDoc(gameRef, {
      phase: 'complete',
    })
  } else {
    // Start next round
    await updateDoc(gameRef, {
      currentRound: nextRoundNum,
      currentPrompts: ROUND_PROMPTS[nextRoundNum] || [],
      phase: 'submitting',
      roundStartedAt: Date.now(),
    })
  }
}

// Get game state (one-time fetch)
export async function getGame(gameId: string): Promise<ConsequencesGame | null> {
  const gameRef = doc(db, GAMES_COLLECTION, gameId)
  const gameSnap = await getDoc(gameRef)

  if (gameSnap.exists()) {
    return gameSnap.data() as ConsequencesGame
  }
  return null
}
