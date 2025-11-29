<template>
  <div class="hex-gem-game" ref="containerRef">
    <!-- UI Overlay -->
    <div class="game-ui">
      <div class="stats-bar">
        <div class="stat">
          <span class="stat-label">Score</span>
          <span class="stat-value">{{ score }}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Gems Left</span>
          <span class="stat-value">{{ gemsRemaining }}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Word</span>
          <span class="stat-value word-preview" :class="{ valid: isCurrentWordValid, invalid: currentWord.length >= 2 && !isCurrentWordValid }">
            {{ currentWord || '-' }}
          </span>
        </div>
      </div>
    </div>

    <!-- Game Canvas Container -->
    <div class="canvas-container">
      <canvas ref="canvasRef" class="game-canvas"></canvas>
    </div>

    <!-- Game Over Overlay -->
    <div v-if="gameOver" class="game-over-overlay">
      <div class="game-over-card">
        <h2>Game Over!</h2>
        <p class="final-score">Final Score: {{ score }}</p>
        <div v-if="topWord" class="top-word-display">
          <span>Best Word:</span>
          <strong>{{ topWord.word }}</strong>
          <span>({{ topWord.points }} pts)</span>
        </div>
        <button class="play-again-btn" @click="startGame">Play Again</button>
      </div>
    </div>

    <!-- Instructions -->
    <div v-if="!gameStarted" class="start-overlay">
      <div class="start-card">
        <h2>Hex Word Gems</h2>
        <p>Connect adjacent gems to form words!</p>
        <ul>
          <li>Tap and drag to connect letters</li>
          <li>Release to submit the word</li>
          <li>Longer words = more points!</li>
        </ul>
        <button class="start-btn" @click="startGame">Start Game</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import Matter from 'matter-js'
import { getLetterPoints, createLetterBag, shuffleArray } from '../constants/scrabble'
import { loadDictionary, isValidWord } from '../constants/dictionary'
import { getLetterColor } from './utils/letterColors'

// Types
interface HexGem {
  id: string
  letter: string
  points: number
  body: Matter.Body
  selected: boolean
  selectionOrder: number
}

// Constants
const HEX_RADIUS = 35
const HEX_SPACING = 4
const SPAWN_INTERVAL = 150
const MAX_GEMS_ON_SCREEN = 60
const ASPECT_RATIO = 9 / 16 // Phone portrait aspect ratio

// Refs
const containerRef = ref<HTMLElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const gameStarted = ref(false)
const gameOver = ref(false)
const score = ref(0)
const currentWord = ref('')
const topWord = ref<{ word: string; points: number } | null>(null)

// Game state
let engine: Matter.Engine
let runner: Matter.Runner
let gems: HexGem[] = []
let letterBag: string[] = []
let selectedGems: HexGem[] = []
let isSelecting = false
let animationFrameId: number
let spawnTimeoutId: number | null = null
let canvasWidth = 0
let canvasHeight = 0

const gemsRemaining = computed(() => letterBag.length)

const isCurrentWordValid = computed(() => {
  return currentWord.value.length >= 2 && isValidWord(currentWord.value)
})

// Create hexagon vertices
function createHexagonVertices(radius: number): Matter.Vector[] {
  const vertices: Matter.Vector[] = []
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6
    vertices.push({
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle)
    })
  }
  return vertices
}

// Get color for gem based on points
function getGemColor(points: number, selected: boolean): string {
  if (selected) {
    return '#4fc3f7'
  }
  const colors = getLetterColor(points, false)
  return colors.base
}

function getGemBorderColor(points: number, selected: boolean): string {
  if (selected) {
    return '#0288d1'
  }
  const colors = getLetterColor(points, false)
  return colors.highlight
}

// Create a gem body
function createGemBody(x: number, y: number, letter: string): HexGem {
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

  // Ensure the body was created properly
  if (!body) {
    // Fallback to circle if hexagon fails
    const circleBody = Matter.Bodies.circle(x, y, HEX_RADIUS, {
      restitution: 0.3,
      friction: 0.1,
      frictionAir: 0.01,
      label: 'gem'
    })

    const gem: HexGem = {
      id: `gem-${Date.now()}-${Math.random()}`,
      letter,
      points,
      body: circleBody,
      selected: false,
      selectionOrder: -1
    }
    return gem
  }

  const gem: HexGem = {
    id: `gem-${Date.now()}-${Math.random()}`,
    letter,
    points,
    body,
    selected: false,
    selectionOrder: -1
  }

  return gem
}

// Spawn a new gem from the top
function spawnGem() {
  if (letterBag.length === 0 || gems.length >= MAX_GEMS_ON_SCREEN) {
    if (letterBag.length === 0 && gems.length === 0) {
      endGame()
    }
    return
  }

  const letter = letterBag.pop()!
  const x = HEX_RADIUS + Math.random() * (canvasWidth - HEX_RADIUS * 2)
  const y = -HEX_RADIUS * 2

  const gem = createGemBody(x, y, letter)
  gems.push(gem)
  Matter.Composite.add(engine.world, gem.body)
}

// Schedule gem spawning
function scheduleSpawn() {
  if (gameOver.value || !gameStarted.value) return

  spawnGem()

  if (letterBag.length > 0 || gems.length > 0) {
    spawnTimeoutId = window.setTimeout(scheduleSpawn, SPAWN_INTERVAL)
  }
}

// Check if two gems are adjacent (touching or very close)
function areGemsAdjacent(gem1: HexGem, gem2: HexGem): boolean {
  const dx = gem1.body.position.x - gem2.body.position.x
  const dy = gem1.body.position.y - gem2.body.position.y
  const distance = Math.sqrt(dx * dx + dy * dy)
  const maxDistance = HEX_RADIUS * 2 + HEX_SPACING + 10 // Allow some tolerance
  return distance <= maxDistance
}

// Find gem at position
function getGemAtPosition(x: number, y: number): HexGem | null {
  for (const gem of gems) {
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
  currentWord.value = selectedGems.map(g => g.letter).join('')
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

  // Length multiplier (same as original game)
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

// Submit word
function submitWord() {
  const word = currentWord.value

  if (word.length < 2) {
    clearSelection()
    return
  }

  if (!isValidWord(word)) {
    // Invalid word - just clear
    clearSelection()
    return
  }

  // Valid word! Calculate score
  const points = calculateWordScore(word)
  score.value += points

  // Track top word
  if (!topWord.value || points > topWord.value.points) {
    topWord.value = { word, points }
  }

  // Remove selected gems
  for (const gem of selectedGems) {
    Matter.Composite.remove(engine.world, gem.body)
    const index = gems.indexOf(gem)
    if (index > -1) {
      gems.splice(index, 1)
    }
  }

  selectedGems = []
  currentWord.value = ''

  // Check for game over
  if (letterBag.length === 0 && gems.length === 0) {
    endGame()
  }
}

// End game
function endGame() {
  gameOver.value = true
  if (spawnTimeoutId) {
    clearTimeout(spawnTimeoutId)
    spawnTimeoutId = null
  }
}

// Custom render function for gems
function renderGems(ctx: CanvasRenderingContext2D) {
  for (const gem of gems) {
    const pos = gem.body.position
    const angle = gem.body.angle

    ctx.save()
    ctx.translate(pos.x, pos.y)
    ctx.rotate(angle)

    // Draw hexagon
    ctx.beginPath()
    for (let i = 0; i < 6; i++) {
      const hexAngle = (Math.PI / 3) * i - Math.PI / 6
      const x = HEX_RADIUS * Math.cos(hexAngle)
      const y = HEX_RADIUS * Math.sin(hexAngle)
      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }
    ctx.closePath()

    // Fill
    const gradient = ctx.createLinearGradient(-HEX_RADIUS, -HEX_RADIUS, HEX_RADIUS, HEX_RADIUS)
    const baseColor = getGemColor(gem.points, gem.selected)
    const highlightColor = getGemBorderColor(gem.points, gem.selected)
    gradient.addColorStop(0, baseColor)
    gradient.addColorStop(1, highlightColor)
    ctx.fillStyle = gradient
    ctx.fill()

    // Stroke
    ctx.strokeStyle = gem.selected ? '#0288d1' : '#999'
    ctx.lineWidth = gem.selected ? 3 : 2
    ctx.stroke()

    // Draw selection order indicator
    if (gem.selected && gem.selectionOrder >= 0) {
      ctx.beginPath()
      ctx.arc(HEX_RADIUS - 12, -HEX_RADIUS + 12, 10, 0, Math.PI * 2)
      ctx.fillStyle = '#0288d1'
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 12px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText((gem.selectionOrder + 1).toString(), HEX_RADIUS - 12, -HEX_RADIUS + 12)
    }

    // Draw letter
    ctx.rotate(-angle) // Unrotate for text
    ctx.fillStyle = gem.selected ? '#fff' : '#333'
    ctx.font = `bold ${gem.letter.length > 1 ? 20 : 26}px Arial`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(gem.letter, 0, 0)

    // Draw points
    ctx.fillStyle = gem.selected ? '#e0e0e0' : '#666'
    ctx.font = 'bold 12px Arial'
    ctx.fillText(gem.points.toString(), 0, HEX_RADIUS - 14)

    ctx.restore()
  }

  // Draw selection lines
  if (selectedGems.length > 1) {
    ctx.beginPath()
    ctx.strokeStyle = '#0288d1'
    ctx.lineWidth = 3
    ctx.setLineDash([5, 5])

    for (let i = 0; i < selectedGems.length; i++) {
      const gem = selectedGems[i]!
      if (i === 0) {
        ctx.moveTo(gem.body.position.x, gem.body.position.y)
      } else {
        ctx.lineTo(gem.body.position.x, gem.body.position.y)
      }
    }
    ctx.stroke()
    ctx.setLineDash([])
  }
}

// Main render loop
function gameLoop() {
  if (!canvasRef.value) return

  const ctx = canvasRef.value.getContext('2d')
  if (!ctx) return

  // Clear canvas
  ctx.fillStyle = '#1a1a2e'
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)

  // Render gems
  renderGems(ctx)

  // Remove gems that fell off screen
  const gemsToRemove = gems.filter(gem => gem.body.position.y > canvasHeight + HEX_RADIUS * 2)
  for (const gem of gemsToRemove) {
    Matter.Composite.remove(engine.world, gem.body)
    const index = gems.indexOf(gem)
    if (index > -1) {
      gems.splice(index, 1)
    }
  }

  // Check for game over
  if (letterBag.length === 0 && gems.length === 0 && !gameOver.value) {
    endGame()
  }

  animationFrameId = requestAnimationFrame(gameLoop)
}

// Handle pointer events
function handlePointerDown(e: PointerEvent) {
  if (gameOver.value || !gameStarted.value) return

  const rect = canvasRef.value!.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top

  const gem = getGemAtPosition(x, y)
  if (gem) {
    isSelecting = true
    selectGem(gem)
  }
}

function handlePointerMove(e: PointerEvent) {
  if (!isSelecting || gameOver.value) return

  const rect = canvasRef.value!.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top

  const gem = getGemAtPosition(x, y)
  if (gem) {
    // Check if we're backtracking
    if (selectedGems.length >= 2) {
      const secondToLast = selectedGems[selectedGems.length - 2]
      if (gem === secondToLast) {
        deselectLastGem()
        return
      }
    }

    // Select new gem
    if (!gem.selected) {
      selectGem(gem)
    }
  }
}

function handlePointerUp() {
  if (isSelecting) {
    isSelecting = false
    submitWord()
  }
}

// Calculate canvas dimensions with portrait aspect ratio
function calculateCanvasDimensions() {
  if (!containerRef.value) return { width: 360, height: 640 }

  const containerWidth = containerRef.value.clientWidth
  const containerHeight = containerRef.value.clientHeight - 60 // Account for stats bar

  // For portrait: height should be larger than width
  // Start by using full height, calculate width from aspect ratio
  let height = containerHeight
  let width = height * ASPECT_RATIO

  // If calculated width exceeds container, constrain by width
  if (width > containerWidth * 0.95) {
    width = containerWidth * 0.95
    height = width / ASPECT_RATIO
  }

  // Ensure minimum size for playability
  const minWidth = 280
  if (width < minWidth) {
    width = minWidth
    height = width / ASPECT_RATIO
  }

  return { width: Math.floor(width), height: Math.floor(height) }
}

// Initialize game
function initPhysics() {
  if (!canvasRef.value || !containerRef.value) return

  const dimensions = calculateCanvasDimensions()
  canvasWidth = dimensions.width
  canvasHeight = dimensions.height

  canvasRef.value.width = canvasWidth
  canvasRef.value.height = canvasHeight

  // Create engine
  engine = Matter.Engine.create({
    gravity: { x: 0, y: 0.5 }
  })

  // Create runner
  runner = Matter.Runner.create()
  Matter.Runner.run(runner, engine)

  // Create walls
  const wallThickness = 50
  const walls = [
    // Bottom
    Matter.Bodies.rectangle(canvasWidth / 2, canvasHeight + wallThickness / 2, canvasWidth, wallThickness, { isStatic: true }),
    // Left
    Matter.Bodies.rectangle(-wallThickness / 2, canvasHeight / 2, wallThickness, canvasHeight * 2, { isStatic: true }),
    // Right
    Matter.Bodies.rectangle(canvasWidth + wallThickness / 2, canvasHeight / 2, wallThickness, canvasHeight * 2, { isStatic: true })
  ]
  Matter.Composite.add(engine.world, walls)

  // Add pointer events
  canvasRef.value.addEventListener('pointerdown', handlePointerDown)
  canvasRef.value.addEventListener('pointermove', handlePointerMove)
  canvasRef.value.addEventListener('pointerup', handlePointerUp)
  canvasRef.value.addEventListener('pointerleave', handlePointerUp)

  // Start render loop
  gameLoop()
}

// Start/restart game
async function startGame() {
  // Load dictionary if needed
  await loadDictionary()

  // Reset state
  gameOver.value = false
  gameStarted.value = true
  score.value = 0
  currentWord.value = ''
  topWord.value = null

  // Clear existing gems
  if (engine) {
    for (const gem of gems) {
      Matter.Composite.remove(engine.world, gem.body)
    }
  }
  gems = []
  selectedGems = []

  // Create new letter bag (shuffled)
  letterBag = shuffleArray(createLetterBag())

  // Start spawning gems
  scheduleSpawn()
}

// Cleanup
function cleanup() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }
  if (spawnTimeoutId) {
    clearTimeout(spawnTimeoutId)
  }
  if (runner) {
    Matter.Runner.stop(runner)
  }
  if (engine) {
    Matter.Engine.clear(engine)
  }
  if (canvasRef.value) {
    canvasRef.value.removeEventListener('pointerdown', handlePointerDown)
    canvasRef.value.removeEventListener('pointermove', handlePointerMove)
    canvasRef.value.removeEventListener('pointerup', handlePointerUp)
    canvasRef.value.removeEventListener('pointerleave', handlePointerUp)
  }
}

// Handle window resize
function handleResize() {
  if (!containerRef.value || !canvasRef.value || !engine) return

  const dimensions = calculateCanvasDimensions()
  canvasWidth = dimensions.width
  canvasHeight = dimensions.height
  canvasRef.value.width = canvasWidth
  canvasRef.value.height = canvasHeight

  // Update wall positions would require recreating them
  // For simplicity, we'll just update the dimensions
}

onMounted(() => {
  initPhysics()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  cleanup()
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped lang="sass">
.hex-gem-game
  position: relative
  width: 100%
  height: calc(100vh - 50px)
  min-height: 500px
  background: #1a1a2e
  overflow: hidden

.game-ui
  position: absolute
  top: 0
  left: 0
  right: 0
  z-index: 10
  padding: 10px
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.8), transparent)

.stats-bar
  display: flex
  justify-content: space-around
  align-items: center
  gap: 20px

.stat
  display: flex
  flex-direction: column
  align-items: center

  .stat-label
    font-size: 12px
    color: #888
    text-transform: uppercase

  .stat-value
    font-size: 24px
    font-weight: bold
    color: #fff

    &.word-preview
      font-size: 18px
      min-width: 100px
      text-align: center

      &.valid
        color: #4caf50

      &.invalid
        color: #f44336

.canvas-container
  position: absolute
  top: 60px
  left: 0
  right: 0
  bottom: 0
  display: flex
  align-items: center
  justify-content: center

.game-canvas
  display: block
  touch-action: none
  border-radius: 12px
  box-shadow: 0 0 40px rgba(79, 195, 247, 0.3)

.game-over-overlay,
.start-overlay
  position: absolute
  top: 0
  left: 0
  right: 0
  bottom: 0
  background: rgba(0, 0, 0, 0.85)
  display: flex
  align-items: center
  justify-content: center
  z-index: 100

.game-over-card,
.start-card
  background: #2a2a4a
  border-radius: 16px
  padding: 40px
  text-align: center
  color: #fff
  max-width: 400px
  margin: 20px

  h2
    font-size: 32px
    margin-bottom: 20px
    color: #4fc3f7

  p
    font-size: 18px
    margin-bottom: 15px
    color: #ccc

  ul
    text-align: left
    margin: 20px 0
    padding-left: 20px

    li
      margin-bottom: 10px
      color: #aaa

.final-score
  font-size: 28px !important
  color: #ffd700 !important

.top-word-display
  margin: 20px 0
  padding: 15px
  background: rgba(255, 255, 255, 0.1)
  border-radius: 8px

  strong
    display: block
    font-size: 24px
    color: #4fc3f7
    margin: 5px 0

.play-again-btn,
.start-btn
  background: linear-gradient(135deg, #4fc3f7, #0288d1)
  border: none
  color: #fff
  font-size: 18px
  font-weight: bold
  padding: 15px 40px
  border-radius: 30px
  cursor: pointer
  transition: transform 0.2s, box-shadow 0.2s
  margin-top: 20px

  &:hover
    transform: scale(1.05)
    box-shadow: 0 8px 20px rgba(79, 195, 247, 0.4)

  &:active
    transform: scale(0.98)
</style>
