// Mad Libs: Consequences - Type Definitions

export type WordType = 'noun' | 'verb' | 'adjective' | 'adverb' | 'place' | 'name' | 'exclamation'

export interface Player {
  id: string
  name: string
  joinedAt: number
}

export interface WordPrompt {
  id: string
  type: WordType
  hint: string // e.g., "a type of vehicle" or "something you'd find in a kitchen"
}

export interface WordSubmission {
  round: number
  playerId: string
  playerName: string
  promptId: string
  wordType: WordType
  word: string
  submittedAt: number
}

export type GamePhase = 'lobby' | 'submitting' | 'generating' | 'reveal' | 'complete'

export interface RoundStory {
  round: number
  storyText: string
  generatedAt: number
}

export interface ConsequencesGame {
  id: string
  hostId: string
  createdAt: number

  // Players
  players: Player[]

  // Round state
  currentRound: number  // 1-5
  totalRounds: number   // default 5
  phase: GamePhase

  // Current round prompts (what words players need to submit)
  currentPrompts: WordPrompt[]

  // All submissions across all rounds (for callbacks)
  submissions: WordSubmission[]

  // Generated stories per round
  stories: RoundStory[]

  // Timer
  roundStartedAt: number | null
  roundDurationSeconds: number  // default 60
}

// Chaos budget increases each round
export const CHAOS_LEVELS: Record<number, string> = {
  1: 'gentle',      // Light silliness, establish characters/setting
  2: 'building',    // Complications arise, first callbacks
  3: 'escalating',  // Things go wrong, callbacks intensify
  4: 'chaotic',     // Everything collides, heavy callbacks
  5: 'unhinged',    // Full absurdity, ALL previous words referenced
}

// Prompts get weirder each round
export const ROUND_PROMPTS: Record<number, WordPrompt[]> = {
  1: [
    { id: 'r1-noun', type: 'noun', hint: 'a person or creature' },
    { id: 'r1-place', type: 'place', hint: 'a location' },
    { id: 'r1-adj', type: 'adjective', hint: 'describing something' },
  ],
  2: [
    { id: 'r2-verb', type: 'verb', hint: 'an action (past tense)' },
    { id: 'r2-noun', type: 'noun', hint: 'an object you can hold' },
    { id: 'r2-exclaim', type: 'exclamation', hint: 'something you\'d shout' },
  ],
  3: [
    { id: 'r3-adj', type: 'adjective', hint: 'an emotion' },
    { id: 'r3-noun', type: 'noun', hint: 'a body part' },
    { id: 'r3-verb', type: 'verb', hint: 'something done secretly' },
  ],
  4: [
    { id: 'r4-name', type: 'name', hint: 'a celebrity or fictional character' },
    { id: 'r4-noun', type: 'noun', hint: 'something from a nightmare' },
    { id: 'r4-adverb', type: 'adverb', hint: 'how someone would do something suspiciously' },
  ],
  5: [
    { id: 'r5-exclaim', type: 'exclamation', hint: 'last words before disaster' },
    { id: 'r5-noun', type: 'noun', hint: 'something that should never exist' },
    { id: 'r5-verb', type: 'verb', hint: 'how this all ends' },
  ],
}

// Helper to generate a simple game code
export function generateGameCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // No I/1, O/0 confusion
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}
