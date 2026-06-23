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
      const response = await fetch(`${import.meta.env.BASE_URL}words.txt`)
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

// Cached pools of words bucketed by length range, built lazily on first use so
// we don't materialize an array out of the 279k-word Set until something needs
// to sample random words (e.g. the Lexicon Defense letter feed).
const poolCache = new Map<string, string[]>()

/**
 * Return a random dictionary word whose length is within [minLen, maxLen],
 * or null if the dictionary isn't loaded yet. Used to source coherent,
 * scrambleable letter sets rather than purely random letters.
 */
export function getRandomWord(minLen = 3, maxLen = 7): string | null {
  if (!VALID_WORDS) {
    console.warn('Dictionary not loaded yet')
    return null
  }
  const key = `${minLen}-${maxLen}`
  let pool = poolCache.get(key)
  if (!pool) {
    pool = []
    for (const w of VALID_WORDS) {
      if (w.length >= minLen && w.length <= maxLen) pool.push(w)
    }
    poolCache.set(key, pool)
  }
  if (pool.length === 0) return null
  return pool[Math.floor(Math.random() * pool.length)]!
}
