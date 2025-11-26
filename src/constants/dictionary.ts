// Collins Scrabble Words (2019) - 279,496 words
// Loaded from words.txt for O(1) lookup performance

let VALID_WORDS: Set<string> | null = null
let loadingPromise: Promise<void> | null = null

export async function loadDictionary(): Promise<void> {
  // Return existing promise if already loading
  if (loadingPromise) {
    return loadingPromise
  }

  // Return immediately if already loaded
  if (VALID_WORDS) {
    return Promise.resolve()
  }

  loadingPromise = (async () => {
    try {
      const response = await fetch('/src/constants/words.txt')
      if (!response.ok) {
        throw new Error(`Failed to load dictionary: ${response.status}`)
      }

      const text = await response.text()
      const lines = text.split('\n')

      // Skip first 2 lines (header and empty line), trim and filter empty lines
      const words = lines
        .slice(2)
        .map(line => line.trim())
        .filter(line => line.length > 0)

      VALID_WORDS = new Set(words)
      console.log(`Dictionary loaded: ${VALID_WORDS.size} words`)
    } catch (error) {
      console.error('Failed to load dictionary:', error)
      // Fallback to empty set to prevent crashes
      VALID_WORDS = new Set()
    }
  })()

  return loadingPromise
}

export function isValidWord(word: string): boolean {
  if (!VALID_WORDS) {
    console.warn('Dictionary not loaded yet')
    return false
  }
  return VALID_WORDS.has(word.toUpperCase())
}

export function isDictionaryLoaded(): boolean {
  return VALID_WORDS !== null
}
