<template>
  <div class="hex-gem-game" ref="containerRef">
    <!-- UI Overlay -->
    <div class="game-ui">
      <div class="stats-bar">
        <div class="stat">
          <span class="stat-label">Score</span>
          <span class="stat-value">{{ game.score.value }}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Level</span>
          <span class="stat-value level-value">{{ game.level.value }}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Pool</span>
          <span class="stat-value pool-value">{{ game.gemsRemaining.value > 0 ? game.gemsRemaining.value : '∞' }}</span>
        </div>
        <div class="stat combo-stat" :class="{ active: game.comboCount.value > 1 }">
          <span class="stat-label">Combo</span>
          <span class="stat-value combo-value">
            {{ game.comboCount.value > 1 ? `${game.comboCount.value}x` : '-' }}
            <span v-if="game.comboCount.value > 1" class="combo-multiplier">({{ game.comboMultiplier.value.toFixed(1) }}×)</span>
          </span>
          <div v-if="game.comboCount.value > 0" class="combo-timer-bar">
            <div class="combo-timer-fill" :style="{ width: game.comboTimerPercent.value + '%' }"></div>
          </div>
        </div>
        <div class="stat">
          <span class="stat-label">Word</span>
          <span class="stat-value word-preview" :class="{ valid: game.isCurrentWordValid.value, invalid: game.currentWord.value.length >= 2 && !game.isCurrentWordValid.value }">
            {{ game.currentWord.value || '-' }}
          </span>
        </div>
      </div>
    </div>

    <!-- Game Canvas Container -->
    <div class="canvas-container">
      <canvas ref="canvasRef" class="game-canvas"></canvas>
    </div>

    <!-- Game Over Overlay -->
    <div v-if="game.gameOver.value" class="game-over-overlay">
      <div class="game-over-card">
        <h2>Game Over!</h2>
        <p class="final-score">Final Score: {{ game.score.value }}</p>
        <p class="final-level">Level {{ game.level.value }}</p>
        <div v-if="game.topWord.value" class="top-word-display">
          <span>Best Word:</span>
          <strong>{{ game.topWord.value.word }}</strong>
          <span>({{ game.topWord.value.points }} pts)</span>
        </div>
        <button class="play-again-btn" @click="game.startGame">Play Again</button>
      </div>
    </div>

    <!-- Instructions -->
    <div v-if="!game.gameStarted.value" class="start-overlay">
      <div class="start-card">
        <h2>Hex Word Gems</h2>
        <p>Connect adjacent gems to form words!</p>
        <ul>
          <li>Tap and drag to connect letters</li>
          <li>Release to submit the word</li>
          <li>Build combos for bonus multipliers!</li>
          <li>5+ letter words spawn bonus gems</li>
          <li>💣 Bombs explode nearby gems</li>
          <li><span style="color: #69f0ae">×2</span> and <span style="color: #e040fb">×3</span> multiply your score!</li>
        </ul>
        <button class="start-btn" @click="game.startGame">Start Game</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useHexGemPhysics } from '../composables/useHexGemPhysics'
import { useHexGemRenderer } from '../composables/useHexGemRenderer'
import { useHexGemGame } from '../composables/useHexGemGame'

// Refs for DOM elements
const containerRef = ref<HTMLElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)

// Initialize composables
const physics = useHexGemPhysics(canvasRef, containerRef)
const renderer = useHexGemRenderer()
const game = useHexGemGame(physics.getEngine, physics.canvasWidth, physics.canvasHeight)

// Animation state
let animationFrameId: number
let isSelecting = false

// Main render loop
function gameLoop() {
  if (!canvasRef.value) return

  const ctx = canvasRef.value.getContext('2d')
  if (!ctx) return

  const now = performance.now()

  // Update combo timer
  game.updateComboTimer()

  // Check bomb timers
  game.processBombTimers()

  // Clear canvas
  renderer.clearCanvas(ctx, physics.canvasWidth.value, physics.canvasHeight.value)

  // Render current word in background
  renderer.renderWordBackground(
    ctx,
    physics.canvasWidth.value,
    physics.canvasHeight.value,
    game.currentWord.value,
    game.isCurrentWordValid.value,
    game.potentialScore.value
  )

  // Render gems
  renderer.renderGems(
    ctx,
    game.getGems(),
    game.getSelectedGems(),
    game.getAnimatingGemIds(),
    game.getBombFuseProgress
  )

  // Process and render pop animations
  const completedAnims = renderer.processPopAnimations(ctx, game.getPopAnimations(), now)

  // Cleanup completed animations and fallen gems
  game.processAnimationsAndCleanup(completedAnims)

  // Continue loop
  animationFrameId = requestAnimationFrame(gameLoop)
}

// Pointer event handlers
function handlePointerDown(e: PointerEvent) {
  if (game.gameOver.value || !game.gameStarted.value) return

  const rect = canvasRef.value!.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top

  const gem = game.getGemAtPosition(x, y)
  if (gem) {
    isSelecting = true
    game.selectGem(gem)
  }
}

function handlePointerMove(e: PointerEvent) {
  if (!isSelecting || game.gameOver.value) return

  const rect = canvasRef.value!.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top

  const gem = game.getGemAtPosition(x, y)
  if (gem) {
    const selectedGems = game.getSelectedGems()
    // Check if we're backtracking
    if (selectedGems.length >= 2) {
      const secondToLast = selectedGems[selectedGems.length - 2]
      if (gem === secondToLast) {
        game.deselectLastGem()
        return
      }
    }

    // Select new gem
    if (!gem.selected) {
      game.selectGem(gem)
    }
  }
}

function handlePointerUp() {
  if (isSelecting) {
    isSelecting = false
    game.submitWord()
  }
}

// Handle window resize
function handleResize() {
  physics.handleResize()
}

// Lifecycle hooks
onMounted(() => {
  physics.init()

  // Add pointer events
  if (canvasRef.value) {
    canvasRef.value.addEventListener('pointerdown', handlePointerDown)
    canvasRef.value.addEventListener('pointermove', handlePointerMove)
    canvasRef.value.addEventListener('pointerup', handlePointerUp)
    canvasRef.value.addEventListener('pointerleave', handlePointerUp)
  }

  window.addEventListener('resize', handleResize)

  // Start render loop
  gameLoop()
})

onUnmounted(() => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }

  game.cleanup()
  physics.cleanup()

  if (canvasRef.value) {
    canvasRef.value.removeEventListener('pointerdown', handlePointerDown)
    canvasRef.value.removeEventListener('pointermove', handlePointerMove)
    canvasRef.value.removeEventListener('pointerup', handlePointerUp)
    canvasRef.value.removeEventListener('pointerleave', handlePointerUp)
  }

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
  position: relative

  .stat-label
    font-size: 12px
    color: #888
    text-transform: uppercase

  .stat-value
    font-size: 24px
    font-weight: bold
    color: #fff

    &.level-value
      color: #ffd700

    &.combo-value
      font-size: 20px

    &.word-preview
      font-size: 18px
      min-width: 100px
      text-align: center

      &.valid
        color: #4caf50

      &.invalid
        color: #f44336

.combo-stat
  min-width: 80px
  transition: all 0.3s ease

  &.active
    .stat-label
      color: #ff9800

    .combo-value
      color: #ff9800
      animation: pulse-combo 0.5s ease

.combo-multiplier
  font-size: 12px
  color: #ffcc80
  display: block

.combo-timer-bar
  position: absolute
  bottom: -4px
  left: 0
  right: 0
  height: 3px
  background: rgba(255, 255, 255, 0.2)
  border-radius: 2px
  overflow: hidden

.combo-timer-fill
  height: 100%
  background: linear-gradient(90deg, #ff5722, #ff9800)
  transition: width 0.1s linear

@keyframes pulse-combo
  0%
    transform: scale(1)
  50%
    transform: scale(1.2)
  100%
    transform: scale(1)

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

.final-level
  font-size: 18px !important
  color: #4fc3f7 !important
  margin-top: -10px

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
