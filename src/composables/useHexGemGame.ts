import { ref, computed, type Ref } from 'vue'
import Matter from 'matter-js'
import type { HexGem, GemType, PopAnimation } from '../types/hexGem'
import {
  HEX_RADIUS,
  HEX_SPACING,
  SPAWN_INTERVAL,
  MAX_GEMS_ON_SCREEN,
  BOMB_CHANCE,
  MULTIPLY_3X_CHANCE,
  MULTIPLY_2X_CHANCE,
  EXPLOSION_FORCE,
  EXPLOSION_RADIUS_MULTIPLIER,
  BOMB_FUSE_TIME,
  POP_STAGGER,
  COMBO_WINDOW,
  LEVEL_THRESHOLDS,
  ENDLESS_LETTERS
} from '../constants/hexGem'
import { getLetterPoints, createLetterBag, shuffleArray } from '../constants/scrabble'
import { loadDictionary, isValidWord } from '../constants/dictionary'
import { createHexagonVertices, getGemColor, getGemBorderColor } from './useHexGemRenderer'

export function useHexGemGame(
  getEngine: () => Matter.Engine | null,
  canvasWidth: Ref<number>,
  canvasHeight: Ref<number>
) {
  // Game state refs
  const gameStarted = ref(false)
  const gameOver = ref(false)
  const score = ref(0)
  const currentWord = ref('')
  const topWord = ref<{ word: string; points: number } | null>(null)

  // Combo system refs
  const comboCount = ref(0)
  const comboTimeLeft = ref(0)
  const lastWordTime = ref(0)
  const level = ref(1)
  const wordsThisLevel = ref(0)

  // Internal game state (not reactive for performance)
  let gems: HexGem[] = []
  let letterBag: string[] = []
  let selectedGems: HexGem[] = []
  let popAnimations: PopAnimation[] = []
  let spawnTimeoutId: number | null = null

  // Computed properties
  const gemsRemaining = computed(() => letterBag.length)

  const isCurrentWordValid = computed(() => {
    return currentWord.value.length >= 2 && isValidWord(currentWord.value)
  })

  const currentLevel = computed(() => {
    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
      if (score.value >= LEVEL_THRESHOLDS[i]!) {
        return i + 1
      }
    }
    return 1
  })

  const comboMultiplier = computed(() => {
    if (comboCount.value <= 1) return 1
    if (comboCount.value === 2) return 1.5
    if (comboCount.value === 3) return 2
    if (comboCount.value === 4) return 2.5
    return Math.min(5, 2.5 + (comboCount.value - 4) * 0.5)
  })

  const comboTimerPercent = computed(() => {
    return Math.max(0, (comboTimeLeft.value / COMBO_WINDOW) * 100)
  })

  const potentialScore = computed(() => {
    if (currentWord.value.length < 1) return 0
    const basePoints = calculateWordScore(currentWord.value)

    // Apply multipliers from selected special gems
    let gemMultiplier = 1
    for (const gem of selectedGems) {
      if (gem.gemType === 'multiply2x') gemMultiplier *= 2
      if (gem.gemType === 'multiply3x') gemMultiplier *= 3
    }

    return Math.floor(basePoints * gemMultiplier * comboMultiplier.value)
  })

  // Get a random letter for endless mode
  function getRandomLetter(): string {
    return ENDLESS_LETTERS[Math.floor(Math.random() * ENDLESS_LETTERS.length)]!
  }

  // Create a gem body
  function createGemBody(x: number, y: number, letter: string, gemType: GemType = 'normal'): HexGem {
    const points = getLetterPoints(letter)
    const vertices = createHexagonVertices(HEX_RADIUS)

    const body = Matter.Bodies.fromVertices(x, y, [vertices], {
      restitution: 0.3,
      friction: 0.1,
      frictionAir: 0.01,
      label: 'gem',
      render: {
        fillStyle: getGemColor(points, false),
        strokeStyle: getGemBorderColor(points, false),
        lineWidth: 2
      }
    })

    // Fallback to circle if hexagon fails
    if (!body) {
      const circleBody = Matter.Bodies.circle(x, y, HEX_RADIUS, {
        restitution: 0.3,
        friction: 0.1,
        frictionAir: 0.01,
        label: 'gem'
      })

      return {
        id: `gem-${Date.now()}-${Math.random()}`,
        letter,
        points,
        body: circleBody,
        selected: false,
        selectionOrder: -1,
        gemType,
        spawnTime: gemType === 'bomb' ? performance.now() : undefined
      }
    }

    return {
      id: `gem-${Date.now()}-${Math.random()}`,
      letter,
      points,
      body,
      selected: false,
      selectionOrder: -1,
      gemType,
      spawnTime: gemType === 'bomb' ? performance.now() : undefined
    }
  }

  // Spawn a new gem from the top
  function spawnGem() {
    const engine = getEngine()
    if (!engine || gems.length >= MAX_GEMS_ON_SCREEN) return

    const x = HEX_RADIUS + Math.random() * (canvasWidth.value - HEX_RADIUS * 2)
    const y = -HEX_RADIUS * 2

    // Check for special gem spawns (don't use letters from bag)
    const roll = Math.random()
    if (roll < BOMB_CHANCE) {
      const gem = createGemBody(x, y, '', 'bomb')
      gems.push(gem)
      Matter.Composite.add(engine.world, gem.body)
      return
    } else if (roll < BOMB_CHANCE + MULTIPLY_3X_CHANCE) {
      const gem = createGemBody(x, y, '', 'multiply3x')
      gems.push(gem)
      Matter.Composite.add(engine.world, gem.body)
      return
    } else if (roll < BOMB_CHANCE + MULTIPLY_3X_CHANCE + MULTIPLY_2X_CHANCE) {
      const gem = createGemBody(x, y, '', 'multiply2x')
      gems.push(gem)
      Matter.Composite.add(engine.world, gem.body)
      return
    }

    // Normal letter gem - use bag if available, otherwise endless mode
    let letter: string
    if (letterBag.length > 0) {
      letter = letterBag.pop()!
    } else {
      // Endless mode: generate random letters to keep board full
      letter = getRandomLetter()
    }

    const gem = createGemBody(x, y, letter, 'normal')
    gems.push(gem)
    Matter.Composite.add(engine.world, gem.body)
  }

  // Schedule gem spawning
  function scheduleSpawn() {
    if (gameOver.value || !gameStarted.value) return

    if (gems.length < MAX_GEMS_ON_SCREEN) {
      spawnGem()
    }

    // Speed up spawning at higher levels
    const spawnDelay = Math.max(80, SPAWN_INTERVAL - (level.value - 1) * 10)
    spawnTimeoutId = window.setTimeout(scheduleSpawn, spawnDelay)
  }

  // Check if two gems are adjacent
  function areGemsAdjacent(gem1: HexGem, gem2: HexGem): boolean {
    const dx = gem1.body.position.x - gem2.body.position.x
    const dy = gem1.body.position.y - gem2.body.position.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    const maxDistance = HEX_RADIUS * 2 + HEX_SPACING + 10
    return distance <= maxDistance
  }

  // Find gem at position (skip animating gems)
  function getGemAtPosition(x: number, y: number): HexGem | null {
    const animatingIds = new Set(popAnimations.map(a => a.gem.id))
    for (const gem of gems) {
      if (animatingIds.has(gem.id)) continue

      const dx = gem.body.position.x - x
      const dy = gem.body.position.y - y
      const distance = Math.sqrt(dx * dx + dy * dy)
      if (distance <= HEX_RADIUS) {
        return gem
      }
    }
    return null
  }

  // Select a gem
  function selectGem(gem: HexGem) {
    if (gem.selected) return

    // Check if this gem is adjacent to the last selected gem
    if (selectedGems.length > 0) {
      const lastGem = selectedGems[selectedGems.length - 1]
      if (!areGemsAdjacent(gem, lastGem!)) {
        return // Not adjacent, can't select
      }
    }

    gem.selected = true
    gem.selectionOrder = selectedGems.length
    selectedGems.push(gem)
    updateCurrentWord()
  }

  // Deselect last gem (for backtracking)
  function deselectLastGem() {
    if (selectedGems.length === 0) return

    const gem = selectedGems.pop()!
    gem.selected = false
    gem.selectionOrder = -1
    updateCurrentWord()
  }

  // Update current word display
  function updateCurrentWord() {
    currentWord.value = selectedGems
      .filter(g => g.gemType === 'normal')
      .map(g => g.letter)
      .join('')
  }

  // Clear selection
  function clearSelection() {
    for (const gem of selectedGems) {
      gem.selected = false
      gem.selectionOrder = -1
    }
    selectedGems = []
    currentWord.value = ''
  }

  // Calculate word score
  function calculateWordScore(word: string): number {
    let basePoints = 0
    for (const letter of word) {
      basePoints += getLetterPoints(letter)
    }

    const wordLength = word.length
    let multiplier = 1
    if (wordLength >= 4) multiplier = 2
    if (wordLength >= 5) multiplier = 3
    if (wordLength >= 6) multiplier = 4
    if (wordLength >= 7) multiplier = 5
    if (wordLength >= 8) multiplier = 6
    if (wordLength >= 9) multiplier = 7

    return basePoints * multiplier
  }

  // Spawn bonus gem as reward
  function spawnBonusGem(gemType: GemType) {
    const engine = getEngine()
    if (!engine) return

    const x = HEX_RADIUS + Math.random() * (canvasWidth.value - HEX_RADIUS * 2)
    const y = -HEX_RADIUS * 2
    const gem = createGemBody(x, y, '', gemType)
    gems.push(gem)
    Matter.Composite.add(engine.world, gem.body)
  }

  // Update combo timer
  function updateComboTimer() {
    if (comboCount.value > 0) {
      const now = performance.now()
      const elapsed = now - lastWordTime.value
      comboTimeLeft.value = Math.max(0, COMBO_WINDOW - elapsed)

      if (comboTimeLeft.value <= 0) {
        comboCount.value = 0
      }
    }
  }

  // Check for rewards
  function checkForRewards(word: string, combo: number) {
    if (word.length >= 7) {
      spawnBonusGem('multiply3x')
    } else if (word.length >= 5) {
      spawnBonusGem('multiply2x')
    }

    if (combo === 3) {
      spawnBonusGem('bomb')
    } else if (combo === 5) {
      spawnBonusGem('multiply2x')
    } else if (combo >= 7 && combo % 2 === 1) {
      spawnBonusGem('multiply3x')
    }
  }

  // Trigger push explosion from bomb gems (when used in a word - just shoves gems)
  function triggerPushExplosion(bombGem: HexGem) {
    const explosionRadius = HEX_RADIUS * EXPLOSION_RADIUS_MULTIPLIER
    const bombPos = bombGem.body.position

    for (const gem of gems) {
      if (gem === bombGem || gem.selected) continue

      const dx = gem.body.position.x - bombPos.x
      const dy = gem.body.position.y - bombPos.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance < explosionRadius && distance > 0) {
        const forceMultiplier = EXPLOSION_FORCE * (1 - distance / explosionRadius)
        const force = {
          x: (dx / distance) * forceMultiplier,
          y: (dy / distance) * forceMultiplier - 0.05
        }
        Matter.Body.applyForce(gem.body, gem.body.position, force)
        const torque = (Math.random() - 0.5) * 0.1
        Matter.Body.setAngularVelocity(gem.body, gem.body.angularVelocity + torque)
      }
    }
  }

  // Trigger destructive explosion (when bomb timer expires - destroys gems)
  function triggerDestructiveExplosion(bombGem: HexGem) {
    const engine = getEngine()
    if (!engine) return

    const explosionRadius = HEX_RADIUS * EXPLOSION_RADIUS_MULTIPLIER
    const bombPos = bombGem.body.position
    const now = performance.now()

    // Find gems in range to destroy
    const gemsToDestroy: HexGem[] = []
    for (const gem of gems) {
      if (gem === bombGem) continue

      const dx = gem.body.position.x - bombPos.x
      const dy = gem.body.position.y - bombPos.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance < explosionRadius) {
        gemsToDestroy.push(gem)
      }
    }

    // Queue pop animations for destroyed gems (staggered by distance)
    gemsToDestroy.sort((a, b) => {
      const distA = Math.hypot(a.body.position.x - bombPos.x, a.body.position.y - bombPos.y)
      const distB = Math.hypot(b.body.position.x - bombPos.x, b.body.position.y - bombPos.y)
      return distA - distB
    })

    for (let i = 0; i < gemsToDestroy.length; i++) {
      const gem = gemsToDestroy[i]!
      Matter.Body.setStatic(gem.body, true)
      popAnimations.push({
        gem,
        startTime: now,
        delay: i * 30 // Fast stagger for explosion
      })
    }

    // Also pop the bomb itself
    Matter.Body.setStatic(bombGem.body, true)
    popAnimations.push({
      gem: bombGem,
      startTime: now,
      delay: 0
    })
  }

  // Check and process bomb timers
  function processBombTimers() {
    const now = performance.now()
    const animatingIds = new Set(popAnimations.map(a => a.gem.id))

    for (const gem of gems) {
      if (gem.gemType === 'bomb' && gem.spawnTime && !gem.selected && !animatingIds.has(gem.id)) {
        const elapsed = now - gem.spawnTime
        if (elapsed >= BOMB_FUSE_TIME) {
          triggerDestructiveExplosion(gem)
        }
      }
    }
  }

  // Get bomb fuse progress (0 to 1) for rendering
  function getBombFuseProgress(gem: HexGem): number {
    if (gem.gemType !== 'bomb' || !gem.spawnTime) return 0
    const elapsed = performance.now() - gem.spawnTime
    return Math.min(1, elapsed / BOMB_FUSE_TIME)
  }

  // Submit word
  function submitWord() {
    const word = currentWord.value

    if (word.length < 2) {
      clearSelection()
      return
    }

    if (!isValidWord(word)) {
      clearSelection()
      return
    }

    // Valid word! Update combo
    const wordTime = performance.now()
    if (wordTime - lastWordTime.value <= COMBO_WINDOW) {
      comboCount.value++
    } else {
      comboCount.value = 1
    }
    lastWordTime.value = wordTime
    comboTimeLeft.value = COMBO_WINDOW
    wordsThisLevel.value++

    // Calculate score
    let basePoints = calculateWordScore(word)

    // Apply multipliers from special gems
    let gemMultiplier = 1
    for (const gem of selectedGems) {
      if (gem.gemType === 'multiply2x') gemMultiplier *= 2
      if (gem.gemType === 'multiply3x') gemMultiplier *= 3
    }

    const points = Math.floor(basePoints * gemMultiplier * comboMultiplier.value)
    score.value += points

    // Check for level up
    if (currentLevel.value > level.value) {
      level.value = currentLevel.value
      wordsThisLevel.value = 0
    }

    // Check for rewards
    checkForRewards(word, comboCount.value)

    // Track top word
    if (!topWord.value || points > topWord.value.points) {
      topWord.value = { word, points }
    }

    // Sort selected gems for staggered pop animation
    const sortedGems = [...selectedGems].sort((a, b) => a.selectionOrder - b.selectionOrder)

    // Queue pop animations
    const now = performance.now()
    for (let i = 0; i < sortedGems.length; i++) {
      const gem = sortedGems[i]!
      Matter.Body.setStatic(gem.body, true)
      popAnimations.push({
        gem,
        startTime: now,
        delay: i * POP_STAGGER
      })
    }

    // Check for bomb gems - using in a word triggers push explosion (just shoves, doesn't destroy)
    const bombGems = selectedGems.filter(g => g.gemType === 'bomb')
    if (bombGems.length > 0) {
      setTimeout(() => {
        for (const bomb of bombGems) {
          triggerPushExplosion(bomb)
        }
      }, sortedGems.length * POP_STAGGER)
    }

    selectedGems = []
    currentWord.value = ''
  }

  // Remove completed animations and fallen gems
  function processAnimationsAndCleanup(completedAnims: PopAnimation[]) {
    const engine = getEngine()
    if (!engine) return

    // Remove completed animations and their gems
    for (const anim of completedAnims) {
      const animIndex = popAnimations.indexOf(anim)
      if (animIndex > -1) {
        popAnimations.splice(animIndex, 1)
      }
      Matter.Composite.remove(engine.world, anim.gem.body)
      const gemIndex = gems.indexOf(anim.gem)
      if (gemIndex > -1) {
        gems.splice(gemIndex, 1)
      }
    }

    // Remove gems that fell off screen
    const gemsToRemove = gems.filter(gem => gem.body.position.y > canvasHeight.value + HEX_RADIUS * 2)
    for (const gem of gemsToRemove) {
      Matter.Composite.remove(engine.world, gem.body)
      const index = gems.indexOf(gem)
      if (index > -1) {
        gems.splice(index, 1)
      }
    }
  }

  // Start/restart game
  async function startGame() {
    const engine = getEngine()
    await loadDictionary()

    // Reset state
    gameOver.value = false
    gameStarted.value = true
    score.value = 0
    currentWord.value = ''
    topWord.value = null
    comboCount.value = 0
    comboTimeLeft.value = 0
    lastWordTime.value = 0
    level.value = 1
    wordsThisLevel.value = 0

    // Clear existing gems
    if (engine) {
      for (const gem of gems) {
        Matter.Composite.remove(engine.world, gem.body)
      }
    }
    gems = []
    selectedGems = []
    popAnimations = []

    // Create new letter bag
    letterBag = shuffleArray(createLetterBag())

    // Start spawning
    scheduleSpawn()
  }

  // Cleanup
  function cleanup() {
    if (spawnTimeoutId) {
      clearTimeout(spawnTimeoutId)
      spawnTimeoutId = null
    }
  }

  // Getters for internal state
  function getGems(): HexGem[] {
    return gems
  }

  function getSelectedGems(): HexGem[] {
    return selectedGems
  }

  function getPopAnimations(): PopAnimation[] {
    return popAnimations
  }

  function getAnimatingGemIds(): Set<string> {
    return new Set(popAnimations.map(a => a.gem.id))
  }

  return {
    // State refs
    gameStarted,
    gameOver,
    score,
    currentWord,
    topWord,
    comboCount,
    comboTimeLeft,
    level,
    wordsThisLevel,

    // Computed
    gemsRemaining,
    isCurrentWordValid,
    currentLevel,
    comboMultiplier,
    comboTimerPercent,
    potentialScore,

    // Methods
    startGame,
    cleanup,
    spawnGem,
    selectGem,
    deselectLastGem,
    clearSelection,
    submitWord,
    updateComboTimer,
    processAnimationsAndCleanup,
    getGemAtPosition,
    areGemsAdjacent,

    // Getters for internal state
    getGems,
    getSelectedGems,
    getPopAnimations,
    getAnimatingGemIds
  }
}
