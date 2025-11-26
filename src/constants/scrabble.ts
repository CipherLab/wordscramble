// Scrabble letter distribution and points
export interface LetterConfig {
  letter: string
  points: number
  count: number
}

export const SCRABBLE_LETTERS: LetterConfig[] = [
  { letter: 'A', points: 1, count: 9 },
  { letter: 'B', points: 3, count: 2 },
  { letter: 'C', points: 3, count: 2 },
  { letter: 'D', points: 2, count: 4 },
  { letter: 'E', points: 1, count: 12 },
  { letter: 'F', points: 4, count: 2 },
  { letter: 'G', points: 2, count: 3 },
  { letter: 'H', points: 4, count: 2 },
  { letter: 'I', points: 1, count: 9 },
  { letter: 'J', points: 8, count: 1 },
  { letter: 'K', points: 5, count: 1 },
  { letter: 'L', points: 1, count: 4 },
  { letter: 'M', points: 3, count: 2 },
  { letter: 'N', points: 1, count: 6 },
  { letter: 'O', points: 1, count: 8 },
  { letter: 'P', points: 3, count: 2 },
  { letter: 'Q', points: 10, count: 0 },
  { letter: 'QU', points: 11, count: 1 },
  { letter: 'R', points: 1, count: 6 },
  { letter: 'S', points: 1, count: 4 },
  { letter: 'T', points: 1, count: 6 },
  { letter: 'U', points: 1, count: 4 },
  { letter: 'V', points: 4, count: 2 },
  { letter: 'W', points: 4, count: 2 },
  { letter: 'X', points: 8, count: 1 },
  { letter: 'Y', points: 4, count: 2 },
  { letter: 'Z', points: 10, count: 1 },
]

// Create a bag of all letters based on distribution
export function createLetterBag(): string[] {
  const bag: string[] = []
  SCRABBLE_LETTERS.forEach(({ letter, count }) => {
    for (let i = 0; i < count; i++) {
      bag.push(letter)
    }
  })
  return bag
}

// Get points for a letter (handles both single letters and QU)
export function getLetterPoints(letter: string): number {
  const upperLetter = letter.toUpperCase()
  const config = SCRABBLE_LETTERS.find(l => l.letter === upperLetter)
  return config?.points || 0
}

// Simple seeded random number generator (Mulberry32)
function seededRandom(seed: number) {
  return function() {
    seed = (seed + 0x6D2B79F5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Convert date string (YYYY-MM-DD) to seed number
export function dateToSeed(dateString: string): number {
  let hash = 0
  for (let i = 0; i < dateString.length; i++) {
    const char = dateString.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

// Get today's date as YYYY-MM-DD string
export function getTodayDateString(): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Shuffle array (Fisher-Yates algorithm) with optional seed
export function shuffleArray<T>(array: T[], seed?: number): T[] {
  const shuffled = [...array]
  const random = seed !== undefined ? seededRandom(seed) : Math.random

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    const temp = shuffled[i]
    const itemJ = shuffled[j]
    if (temp !== undefined && itemJ !== undefined) {
      shuffled[i] = itemJ
      shuffled[j] = temp
    }
  }
  return shuffled
}
