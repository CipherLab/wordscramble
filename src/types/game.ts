export interface Letter {
  id: string
  letter: string
  points: number
  timeLeft: number // seconds
  maxTime: number // seconds
  selected: boolean
}

export interface WordEntry {
  word: string
  points: number
  timestamp: number
}

export interface GameState {
  letters: Letter[]
  letterBag: string[]
  selectedLetters: string[]
  score: number
  wordsPlayed: WordEntry[]
  gameOver: boolean
  lettersLeft: number
}
