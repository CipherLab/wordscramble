import type Matter from 'matter-js'

export type GemType = 'normal' | 'bomb' | 'multiply2x' | 'multiply3x'

export interface HexGem {
  id: string
  letter: string
  points: number
  body: Matter.Body
  selected: boolean
  selectionOrder: number
  gemType: GemType
}

export interface PopAnimation {
  gem: HexGem
  startTime: number
  delay: number
}
