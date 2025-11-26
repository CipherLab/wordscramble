import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Letter, WordEntry } from '../types/game'
import { createLetterBag, shuffleArray, getLetterPoints } from '../constants/scrabble'
import { isValidWord } from '../constants/dictionary'

const INITIAL_LETTERS = 9
const LETTER_TIMER = 60 // seconds per letter

export const useGameStore = defineStore('game', () => {
  // State
  const letters = ref<Letter[]>([])
  const letterBag = ref<string[]>([])
  const selectedLetters = ref<string[]>([])
  const score = ref(0)
  const wordsPlayed = ref<WordEntry[]>([])
  const gameOver = ref(false)
  const timerIntervals = ref<Map<string, number>>(new Map())

  // Computed
  const lettersLeft = computed(() => letterBag.value.length)
  const selectedWord = computed(() => selectedLetters.value.join(''))
  const isCurrentWordValid = computed(() => {
    if (selectedLetters.value.length < 3) return false
    return isValidWord(selectedWord.value)
  })
  const topWord = computed(() => {
    if (wordsPlayed.value.length === 0) return null
    return wordsPlayed.value.reduce((max, word) =>
      word.points > max.points ? word : max
    )
  })

  // Actions
  function startGame() {
    // Initialize letter bag
    letterBag.value = shuffleArray(createLetterBag())

    // Reset state
    letters.value = []
    selectedLetters.value = []
    score.value = 0
    wordsPlayed.value = []
    gameOver.value = false

    // Clear any existing timers
    timerIntervals.value.forEach(interval => clearInterval(interval))
    timerIntervals.value.clear()

    // Draw initial letters
    for (let i = 0; i < INITIAL_LETTERS; i++) {
      drawLetter()
    }
  }

  function drawLetter() {
    if (letterBag.value.length === 0) {
      checkGameOver()
      return
    }

    const letter = letterBag.value.pop()!
    const letterId = `${letter}-${Date.now()}-${Math.random()}`

    const newLetter: Letter = {
      id: letterId,
      letter,
      points: getLetterPoints(letter),
      timeLeft: LETTER_TIMER,
      maxTime: LETTER_TIMER,
      selected: false
    }

    letters.value.push(newLetter)
    startLetterTimer(newLetter)
  }

  function startLetterTimer(letter: Letter) {
    const interval = setInterval(() => {
      // Find the letter index in the array
      const letterIndex = letters.value.findIndex(l => l.id === letter.id)
      if (letterIndex !== -1) {
        const currentLetter = letters.value[letterIndex]
        if (currentLetter) {
          // Decrement the time
          currentLetter.timeLeft--

          if (currentLetter.timeLeft <= 0) {
            removeLetter(currentLetter.id)
          } else {
            // Force reactivity by creating a new array reference
            letters.value = [...letters.value]
          }
        }
      }
    }, 1000) as unknown as number

    timerIntervals.value.set(letter.id, interval)
  }

  function removeLetter(letterId: string, shouldDrawReplacement = true) {
    const interval = timerIntervals.value.get(letterId)
    if (interval) {
      clearInterval(interval)
      timerIntervals.value.delete(letterId)
    }

    const letterIndex = letters.value.findIndex(l => l.id === letterId)
    if (letterIndex !== -1) {
      const letter = letters.value[letterIndex]
      if (letter) {
        // If letter was selected, remove from selection
        const selectedIndex = selectedLetters.value.indexOf(letter.letter)
        if (selectedIndex !== -1) {
          selectedLetters.value.splice(selectedIndex, 1)
        }
      }

      letters.value.splice(letterIndex, 1)

      // Draw a replacement letter to maintain 9 letters if possible
      if (shouldDrawReplacement && letterBag.value.length > 0) {
        drawLetter()
      } else {
        checkGameOver()
      }
    }
  }

  function toggleLetterSelection(letterId: string) {
    const letter = letters.value.find(l => l.id === letterId)
    if (!letter) return

    letter.selected = !letter.selected

    if (letter.selected) {
      selectedLetters.value.push(letter.letter)
    } else {
      const index = selectedLetters.value.lastIndexOf(letter.letter)
      if (index !== -1) {
        selectedLetters.value.splice(index, 1)
      }
    }
  }

  function clearSelection() {
    letters.value.forEach(letter => {
      letter.selected = false
    })
    selectedLetters.value = []
  }

  function shuffleLetters() {
    const currentLetters = [...letters.value]
    for (let i = currentLetters.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const temp = currentLetters[i]
      const itemJ = currentLetters[j]
      if (temp !== undefined && itemJ !== undefined) {
        currentLetters[i] = itemJ
        currentLetters[j] = temp
      }
    }
    letters.value = currentLetters
  }

  function reorderLetters(fromIndex: number, toIndex: number) {
    const currentLetters = [...letters.value]
    const movedLetter = currentLetters.splice(fromIndex, 1)[0]
    if (movedLetter) {
      currentLetters.splice(toIndex, 0, movedLetter)
      letters.value = currentLetters
    }
  }

  function submitWord() {
    if (selectedLetters.value.length < 3) {
      return { success: false, message: 'Word must be at least 3 letters' }
    }

    const word = selectedWord.value.toUpperCase()
    const wordIsValid = isValidWord(word)

    // Calculate points: base letter values × length multiplier (only if valid)
    let points = 0
    if (wordIsValid) {
      // Calculate base points from letter values
      let basePoints = 0
      selectedLetters.value.forEach(letter => {
        basePoints += getLetterPoints(letter)
      })

      // Apply length multiplier
      const wordLength = selectedLetters.value.length
      let multiplier = 1
      if (wordLength >= 4) multiplier = 2
      if (wordLength >= 5) multiplier = 3
      if (wordLength >= 6) multiplier = 4
      if (wordLength >= 7) multiplier = 5
      if (wordLength >= 8) multiplier = 6
      if (wordLength >= 9) multiplier = 7

      points = basePoints * multiplier

      console.log(`Word: ${word}, Length: ${wordLength}, Base: ${basePoints}, Multiplier: ${multiplier}, Final: ${points}`)
    } else {
      console.log(`Word: ${word}, Invalid - 0 points`)
    }

    // Add word to played words
    const wordEntry = {
      word,
      points,
      timestamp: Date.now()
    }
    console.log('Adding to wordsPlayed:', wordEntry)
    wordsPlayed.value.push(wordEntry)

    // Update score
    console.log(`Adding ${points} to score. Old score: ${score.value}, New score: ${score.value + points}`)
    score.value += points

    // Remove used letters
    const letterIds = letters.value
      .filter(l => l.selected)
      .map(l => l.id)

    letterIds.forEach(id => removeLetter(id))

    clearSelection()

    const message = wordIsValid
      ? `${word}: ${points} points!`
      : `${word} discarded (not a valid word)`

    return { success: true, message, points }
  }

  function checkGameOver() {
    if (letters.value.length === 0 && letterBag.value.length === 0) {
      gameOver.value = true
      timerIntervals.value.forEach(interval => clearInterval(interval))
      timerIntervals.value.clear()
    }
  }

  return {
    // State
    letters,
    letterBag,
    selectedLetters,
    score,
    wordsPlayed,
    gameOver,

    // Computed
    lettersLeft,
    selectedWord,
    isCurrentWordValid,
    topWord,

    // Actions
    startGame,
    drawLetter,
    removeLetter,
    toggleLetterSelection,
    clearSelection,
    shuffleLetters,
    reorderLetters,
    submitWord,
  }
})
