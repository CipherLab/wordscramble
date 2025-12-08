// ============================================================================
// ARC LIGHT - Narrative State Machine Game Types
// ============================================================================

// ============================================================================
// CORE STATE TYPES
// ============================================================================

export interface Character {
  id: string
  name: string
  location: string // "Castle Gates", "Market Square", "The Vault"
  emotion: string // "Suspicious", "Determined", "Panicked"
  avatar?: string // Optional emoji/icon
}

export interface NarrativeState {
  // Character tracking
  characters: Character[]

  // Plot mechanics
  tension: number // 0-100, increases toward climax
  plotProgress: number // 0-100, progress toward goal
  currentSceneLocation: string // Primary scene location

  // Goal tracking
  goalReached: boolean

  // Metadata
  turnNumber: number
  totalTurns: number // 5-8 turns typical
}

export type GameGenre = 'heist' | 'romance' | 'mystery' | 'adventure' | 'horror' | 'comedy'

export interface GoalTemplate {
  id: string
  genre: GameGenre
  title: string // "The Midnight Heist"
  description: string // "Steal the artifact from the vault"
  successCondition: string // For AI: "The artifact must be secured by protagonists"
  estimatedTurns: number // 6-8 turns
  initialSceneLocation: string
  initialCharacters: Omit<Character, 'id'>[] // Template characters
}

// ============================================================================
// PLAYER CONTRIBUTIONS & CHOICES
// ============================================================================

export interface ActionChoice {
  id: string
  text: string // "Persuade the scholar to help"
  type: 'diplomatic' | 'aggressive' | 'stealthy' | 'investigative' | 'creative' | 'custom'
  probability: number // 0-100, higher = more likely to succeed
  icon: string // Quasar icon name
  consequence?: string // Optional hint about what might happen
}

export interface PlayerContribution {
  id: string
  turnNumber: number
  playerId: string
  playerName: string

  // What the player chose/wrote
  action: string // "Bob finds a kitten at the gates"
  choiceId?: string // If they picked from generated choices
  isCustom: boolean // True if they typed their own action

  // State context when submitted (for history)
  stateSnapshot: NarrativeState

  submittedAt: number
}

// ============================================================================
// GENERATED NARRATIVE
// ============================================================================

export interface GeneratedTurn {
  turnNumber: number

  // What the AI generated
  proseSnippet: string // The narrative prose
  updatedState: NarrativeState // New state after this turn

  // Metadata
  generatedAt: number
  contributionId: string // Reference to PlayerContribution
}

// ============================================================================
// GAME STATE
// ============================================================================

export type ArcLightPhase =
  | 'lobby'        // Setup: choose goal, enter player names
  | 'briefing'     // Show initial state, explain goal
  | 'submitting'   // Players write their actions
  | 'generating'   // AI generates prose + updates state
  | 'reveal'       // Show generated prose + updated state
  | 'complete'     // Story finished, show full narrative

export interface Player {
  id: string
  name: string
  joinedAt: number
}

export interface ArcLightGame {
  id: string
  hostId: string
  createdAt: number

  // Players
  players: Player[]

  // Game configuration
  goalTemplate: GoalTemplate
  maxTurns: number

  // Current state
  currentState: NarrativeState
  phase: ArcLightPhase

  // Turn tracking
  currentTurnNumber: number
  currentPlayerIndex: number // Whose turn to contribute (for pass-and-play)

  // History
  contributions: PlayerContribution[]
  generatedTurns: GeneratedTurn[]

  // Timer (optional)
  turnStartedAt: number | null
  turnDurationSeconds: number // default 120
}

// ============================================================================
// GOAL TEMPLATES
// ============================================================================

export const GOAL_TEMPLATES: GoalTemplate[] = [
  {
    id: 'midnight-heist',
    genre: 'heist',
    title: 'The Midnight Heist',
    description: 'A team of thieves must steal the priceless Starfire Diamond from the heavily-guarded museum before dawn.',
    successCondition: 'The Starfire Diamond must be successfully stolen and the team must escape.',
    estimatedTurns: 7,
    initialSceneLocation: 'Museum Rooftop',
    initialCharacters: [
      { name: 'Alex', location: 'Museum Rooftop', emotion: 'Focused', avatar: '🎭' },
      { name: 'Morgan', location: 'Security Office', emotion: 'Nervous', avatar: '💻' },
      { name: 'Riley', location: 'Loading Dock', emotion: 'Confident', avatar: '🔧' },
    ]
  },

  {
    id: 'lighthouse-romance',
    genre: 'romance',
    title: 'Letters from the Lighthouse',
    description: 'Two former lovers, separated by a decade and a misunderstanding, are brought back to the coastal lighthouse where they first met.',
    successCondition: 'The two lovers must confront their past and either reconcile or find closure.',
    estimatedTurns: 6,
    initialSceneLocation: 'Lighthouse Base',
    initialCharacters: [
      { name: 'Sam', location: 'Lighthouse Base', emotion: 'Nostalgic', avatar: '🌊' },
      { name: 'Jordan', location: 'Coastal Path', emotion: 'Apprehensive', avatar: '💌' },
    ]
  },

  {
    id: 'manor-mystery',
    genre: 'mystery',
    title: 'Death at Ashford Manor',
    description: 'The wealthy Lord Ashford has been found dead. Four suspects, all with secrets, are trapped in the manor during a storm.',
    successCondition: 'The true murderer must be identified and their motive revealed.',
    estimatedTurns: 8,
    initialSceneLocation: 'Grand Parlor',
    initialCharacters: [
      { name: 'Detective Vale', location: 'Grand Parlor', emotion: 'Analytical', avatar: '🔍' },
      { name: 'Lady Catherine', location: 'Study', emotion: 'Defensive', avatar: '💎' },
      { name: 'Dr. Hayes', location: 'Library', emotion: 'Troubled', avatar: '📚' },
      { name: 'Groundskeeper Tom', location: 'Conservatory', emotion: 'Evasive', avatar: '🌿' },
    ]
  },

  {
    id: 'temple-quest',
    genre: 'adventure',
    title: 'The Lost Temple of Khar',
    description: 'Archaeologists race against mercenaries to reach the temple\'s inner sanctum and recover the legendary Eye of Khar.',
    successCondition: 'The Eye of Khar must be recovered and the temple\'s guardian trials overcome.',
    estimatedTurns: 7,
    initialSceneLocation: 'Temple Entrance',
    initialCharacters: [
      { name: 'Dr. Chen', location: 'Temple Entrance', emotion: 'Excited', avatar: '🗺️' },
      { name: 'Kane', location: 'Jungle Perimeter', emotion: 'Hostile', avatar: '🔫' },
      { name: 'Zara', location: 'Temple Entrance', emotion: 'Cautious', avatar: '🧭' },
    ]
  },

  {
    id: 'cabin-horror',
    genre: 'horror',
    title: 'The Cabin at Echo Lake',
    description: 'College friends at a remote cabin realize they\'re not alone. Something ancient and hungry lurks in the woods.',
    successCondition: 'The survivors must escape the cabin or destroy the entity haunting Echo Lake.',
    estimatedTurns: 6,
    initialSceneLocation: 'Cabin Living Room',
    initialCharacters: [
      { name: 'Maya', location: 'Cabin Living Room', emotion: 'Uneasy', avatar: '🎒' },
      { name: 'Josh', location: 'Upstairs Bedroom', emotion: 'Skeptical', avatar: '📱' },
      { name: 'Taylor', location: 'Back Porch', emotion: 'Paranoid', avatar: '🔦' },
    ]
  },

  {
    id: 'cooking-contest',
    genre: 'comedy',
    title: 'The Great Bake-Off Disaster',
    description: 'Amateur bakers compete for the Golden Whisk while everything that can go wrong does go wrong.',
    successCondition: 'Someone must present a completed dish to the judges despite escalating chaos.',
    estimatedTurns: 5,
    initialSceneLocation: 'Competition Kitchen',
    initialCharacters: [
      { name: 'Pierre', location: 'Station 1', emotion: 'Overconfident', avatar: '👨‍🍳' },
      { name: 'Betty', location: 'Station 2', emotion: 'Determined', avatar: '🥧' },
      { name: 'Carlos', location: 'Station 3', emotion: 'Flustered', avatar: '🔥' },
    ]
  },
]

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate a random 4-character game code (for multiplayer future)
 */
export function generateGameCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

/**
 * Find a goal template by ID
 */
export function getGoalTemplate(id: string): GoalTemplate | undefined {
  return GOAL_TEMPLATES.find(t => t.id === id)
}

/**
 * Get genre color for UI theming
 */
export function getGenreColor(genre: GameGenre): string {
  const colors: Record<GameGenre, string> = {
    heist: '#1976d2',      // Blue
    romance: '#e91e63',    // Pink
    mystery: '#7b1fa2',    // Purple
    adventure: '#f57c00',  // Orange
    horror: '#c62828',     // Dark Red
    comedy: '#fbc02d',     // Yellow
  }
  return colors[genre]
}
