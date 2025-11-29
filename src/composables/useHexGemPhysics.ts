import { ref, type Ref } from 'vue'
import Matter from 'matter-js'
import { ASPECT_RATIO } from '../constants/hexGem'

export function useHexGemPhysics(
  canvasRef: Ref<HTMLCanvasElement | null>,
  containerRef: Ref<HTMLElement | null>
) {
  const canvasWidth = ref(0)
  const canvasHeight = ref(0)

  let engine: Matter.Engine | null = null
  let runner: Matter.Runner | null = null

  // Calculate canvas dimensions with portrait aspect ratio
  function calculateCanvasDimensions(): { width: number; height: number } {
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

  // Initialize physics engine and canvas
  function init(): Matter.Engine | null {
    if (!canvasRef.value || !containerRef.value) return null

    const dimensions = calculateCanvasDimensions()
    canvasWidth.value = dimensions.width
    canvasHeight.value = dimensions.height

    canvasRef.value.width = canvasWidth.value
    canvasRef.value.height = canvasHeight.value

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
      Matter.Bodies.rectangle(
        canvasWidth.value / 2,
        canvasHeight.value + wallThickness / 2,
        canvasWidth.value,
        wallThickness,
        { isStatic: true }
      ),
      // Left
      Matter.Bodies.rectangle(
        -wallThickness / 2,
        canvasHeight.value / 2,
        wallThickness,
        canvasHeight.value * 2,
        { isStatic: true }
      ),
      // Right
      Matter.Bodies.rectangle(
        canvasWidth.value + wallThickness / 2,
        canvasHeight.value / 2,
        wallThickness,
        canvasHeight.value * 2,
        { isStatic: true }
      )
    ]
    Matter.Composite.add(engine.world, walls)

    return engine
  }

  // Handle window resize
  function handleResize() {
    if (!containerRef.value || !canvasRef.value || !engine) return

    const dimensions = calculateCanvasDimensions()
    canvasWidth.value = dimensions.width
    canvasHeight.value = dimensions.height
    canvasRef.value.width = canvasWidth.value
    canvasRef.value.height = canvasHeight.value

    // Note: Updating wall positions would require recreating them
    // For simplicity, we just update the canvas dimensions
  }

  // Cleanup physics engine
  function cleanup() {
    if (runner) {
      Matter.Runner.stop(runner)
      runner = null
    }
    if (engine) {
      Matter.Engine.clear(engine)
      engine = null
    }
  }

  // Get the engine (for external use)
  function getEngine(): Matter.Engine | null {
    return engine
  }

  return {
    canvasWidth,
    canvasHeight,
    init,
    cleanup,
    handleResize,
    getEngine
  }
}
