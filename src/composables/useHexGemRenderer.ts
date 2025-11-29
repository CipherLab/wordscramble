import type { HexGem, PopAnimation } from '../types/hexGem'
import { HEX_RADIUS, POP_DURATION } from '../constants/hexGem'
import { getLetterColor } from '../components/utils/letterColors'

// Create hexagon vertices for physics body
export function createHexagonVertices(radius: number): { x: number; y: number }[] {
  const vertices: { x: number; y: number }[] = []
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
export function getGemColor(points: number, selected: boolean): string {
  if (selected) {
    return '#4fc3f7'
  }
  const colors = getLetterColor(points, false)
  return colors.base
}

export function getGemBorderColor(points: number, selected: boolean): string {
  if (selected) {
    return '#0288d1'
  }
  const colors = getLetterColor(points, false)
  return colors.highlight
}

export function useHexGemRenderer() {
  // Render a single gem (normal, not animating)
  function renderGem(ctx: CanvasRenderingContext2D, gem: HexGem, fuseProgress: number = 0) {
    const pos = gem.body.position
    const angle = gem.body.angle

    ctx.save()
    ctx.translate(pos.x, pos.y)
    ctx.rotate(angle)

    // Draw hexagon path
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

    // Fill with gradient - use special colors for special gems
    const gradient = ctx.createLinearGradient(-HEX_RADIUS, -HEX_RADIUS, HEX_RADIUS, HEX_RADIUS)
    if (gem.selected) {
      gradient.addColorStop(0, '#4fc3f7')
      gradient.addColorStop(1, '#0288d1')
    } else if (gem.gemType === 'bomb') {
      // Bomb color intensifies as fuse runs down
      const r = Math.floor(255 - fuseProgress * 50)
      const g = Math.floor(107 - fuseProgress * 80)
      const b = Math.floor(53 - fuseProgress * 53)
      gradient.addColorStop(0, `rgb(${r}, ${g}, ${b})`)
      gradient.addColorStop(1, '#d32f2f')
    } else if (gem.gemType === 'multiply3x') {
      gradient.addColorStop(0, '#e040fb')
      gradient.addColorStop(1, '#7b1fa2')
    } else if (gem.gemType === 'multiply2x') {
      gradient.addColorStop(0, '#69f0ae')
      gradient.addColorStop(1, '#00c853')
    } else if (gem.gemType === 'stone') {
      gradient.addColorStop(0, '#5a5a6e')
      gradient.addColorStop(1, '#3a3a4e')
    } else {
      const baseColor = getGemColor(gem.points, gem.selected)
      const highlightColor = getGemBorderColor(gem.points, gem.selected)
      gradient.addColorStop(0, baseColor)
      gradient.addColorStop(1, highlightColor)
    }
    ctx.fillStyle = gradient
    ctx.fill()

    // Stroke - special gems get glow effects
    if (gem.selected) {
      ctx.strokeStyle = '#0288d1'
      ctx.lineWidth = 3
      ctx.shadowBlur = 0
    } else if (gem.gemType === 'stone') {
      ctx.strokeStyle = '#4a4a5e'
      ctx.lineWidth = 2
      ctx.shadowBlur = 0
    } else if (gem.gemType === 'bomb') {
      // Bomb pulses faster and glows more as fuse runs down
      const pulseSpeed = 2 + fuseProgress * 8
      const pulse = Math.sin(performance.now() / 1000 * pulseSpeed * Math.PI) * 0.5 + 0.5
      const glowIntensity = 10 + fuseProgress * 20 + pulse * 10
      ctx.strokeStyle = fuseProgress > 0.7 ? '#ff0000' : '#ffab00'
      ctx.lineWidth = 3 + pulse * 2
      ctx.shadowColor = fuseProgress > 0.7 ? '#ff0000' : '#ff6b35'
      ctx.shadowBlur = glowIntensity
    } else if (gem.gemType === 'multiply3x') {
      ctx.strokeStyle = '#ea80fc'
      ctx.lineWidth = 3
      ctx.shadowColor = '#e040fb'
      ctx.shadowBlur = 10
    } else if (gem.gemType === 'multiply2x') {
      ctx.strokeStyle = '#b9f6ca'
      ctx.lineWidth = 3
      ctx.shadowColor = '#69f0ae'
      ctx.shadowBlur = 10
    } else {
      ctx.strokeStyle = '#999'
      ctx.lineWidth = 2
      ctx.shadowBlur = 0
    }
    ctx.stroke()
    ctx.shadowBlur = 0

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

    ctx.rotate(-angle) // Unrotate for text
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    // Draw icon or letter based on gem type
    if (gem.gemType === 'bomb') {
      ctx.font = 'bold 28px Arial'
      ctx.fillText('💣', 0, 0)

      // Draw fuse timer ring (shrinks as time runs out)
      if (fuseProgress > 0) {
        ctx.rotate(angle) // Re-rotate for the ring
        const remainingAngle = (1 - fuseProgress) * Math.PI * 2
        ctx.beginPath()
        ctx.arc(0, 0, HEX_RADIUS - 5, -Math.PI / 2, -Math.PI / 2 + remainingAngle)
        ctx.strokeStyle = fuseProgress > 0.7 ? '#ff0000' : '#ffcc00'
        ctx.lineWidth = 6
        ctx.shadowBlur = 0
        ctx.stroke()
        ctx.rotate(-angle)
      }
    } else if (gem.gemType === 'multiply3x') {
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 22px Arial'
      ctx.fillText('×3', 0, 0)
    } else if (gem.gemType === 'multiply2x') {
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 22px Arial'
      ctx.fillText('×2', 0, 0)
    } else if (gem.gemType === 'stone') {
      // Draw crack pattern on stone
      ctx.strokeStyle = '#2a2a3e'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(-8, -10)
      ctx.lineTo(0, 0)
      ctx.lineTo(6, -8)
      ctx.moveTo(0, 0)
      ctx.lineTo(-4, 12)
      ctx.moveTo(0, 0)
      ctx.lineTo(10, 5)
      ctx.stroke()
    } else {
      // Draw letter
      ctx.fillStyle = gem.selected ? '#fff' : '#333'
      ctx.font = `bold ${gem.letter.length > 1 ? 20 : 26}px Arial`
      ctx.fillText(gem.letter, 0, 0)

      // Draw points
      ctx.fillStyle = gem.selected ? '#e0e0e0' : '#666'
      ctx.font = 'bold 12px Arial'
      ctx.fillText(gem.points.toString(), 0, HEX_RADIUS - 14)
    }

    ctx.restore()
  }

  // Render all gems and selection lines
  function renderGems(
    ctx: CanvasRenderingContext2D,
    gems: HexGem[],
    selectedGems: HexGem[],
    animatingGemIds: Set<string>,
    getBombFuseProgress?: (gem: HexGem) => number
  ) {
    for (const gem of gems) {
      // Skip gems that are currently animating (they're rendered separately)
      if (animatingGemIds.has(gem.id)) continue
      const fuseProgress = getBombFuseProgress ? getBombFuseProgress(gem) : 0
      renderGem(ctx, gem, fuseProgress)
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

  // Render a popping gem with animation
  function renderPoppingGem(ctx: CanvasRenderingContext2D, anim: PopAnimation, progress: number) {
    const gem = anim.gem
    const pos = gem.body.position

    // Easing function for pop effect (overshoot then shrink)
    const easeOutBack = (t: number) => {
      const c1 = 1.70158
      const c3 = c1 + 1
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
    }

    // Scale up then down
    let scale: number
    if (progress < 0.3) {
      // Scale up phase
      scale = 1 + easeOutBack(progress / 0.3) * 0.3
    } else {
      // Shrink phase
      const shrinkProgress = (progress - 0.3) / 0.7
      scale = 1.3 * (1 - shrinkProgress)
    }

    const alpha = 1 - progress

    ctx.save()
    ctx.globalAlpha = alpha
    ctx.translate(pos.x, pos.y)
    ctx.scale(scale, scale)

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

    // White flash effect
    const flashIntensity = Math.max(0, 1 - progress * 3)
    ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + flashIntensity * 0.7})`
    ctx.fill()

    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 3
    ctx.stroke()

    // Draw content
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#fff'

    if (gem.gemType === 'bomb') {
      ctx.font = 'bold 28px Arial'
      ctx.fillText('💣', 0, 0)
    } else if (gem.gemType === 'multiply3x') {
      ctx.font = 'bold 22px Arial'
      ctx.fillText('×3', 0, 0)
    } else if (gem.gemType === 'multiply2x') {
      ctx.font = 'bold 22px Arial'
      ctx.fillText('×2', 0, 0)
    } else {
      ctx.font = `bold ${gem.letter.length > 1 ? 20 : 26}px Arial`
      ctx.fillText(gem.letter, 0, 0)
    }

    ctx.restore()
  }

  // Process pop animations and return completed ones
  function processPopAnimations(
    ctx: CanvasRenderingContext2D,
    popAnimations: PopAnimation[],
    now: number
  ): PopAnimation[] {
    const completedAnims: PopAnimation[] = []

    for (const anim of popAnimations) {
      const elapsed = now - anim.startTime - anim.delay
      if (elapsed < 0) {
        // Not started yet
        continue
      }
      const progress = Math.min(1, elapsed / POP_DURATION)
      renderPoppingGem(ctx, anim, progress)

      if (progress >= 1) {
        completedAnims.push(anim)
      }
    }

    return completedAnims
  }

  // Clear canvas with background color (shows oxygen danger from bottom)
  function clearCanvas(ctx: CanvasRenderingContext2D, width: number, height: number, oxygenPercent: number = 100) {
    // Calculate how much of the screen should be "danger" colored
    // As oxygen drops, red creeps up from the bottom
    const dangerHeight = ((100 - oxygenPercent) / 100) * height

    if (dangerHeight <= 0) {
      // Full oxygen - normal background
      ctx.fillStyle = '#1a1a2e'
      ctx.fillRect(0, 0, width, height)
    } else {
      // Draw normal background at top
      ctx.fillStyle = '#1a1a2e'
      ctx.fillRect(0, 0, width, height - dangerHeight)

      // Draw gradient from normal to danger at the transition
      const gradientHeight = Math.min(80, dangerHeight)
      const gradient = ctx.createLinearGradient(0, height - dangerHeight - gradientHeight, 0, height - dangerHeight + gradientHeight)

      // Color intensity based on how critical oxygen is
      const intensity = Math.min(1, (100 - oxygenPercent) / 50) // Full intensity at 50% oxygen
      const r = Math.floor(26 + (80 * intensity))  // 1a -> ~66
      const g = Math.floor(26 - (20 * intensity))  // 1a -> ~0a
      const b = Math.floor(46 - (30 * intensity))  // 2e -> ~10

      gradient.addColorStop(0, '#1a1a2e')
      gradient.addColorStop(1, `rgb(${r}, ${g}, ${b})`)

      ctx.fillStyle = gradient
      ctx.fillRect(0, height - dangerHeight - gradientHeight, width, gradientHeight * 2)

      // Fill danger zone at bottom
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`
      ctx.fillRect(0, height - dangerHeight + gradientHeight, width, dangerHeight - gradientHeight)
    }
  }

  // Render current word in center of canvas as subtle background
  function renderWordBackground(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    word: string,
    isValid: boolean,
    potentialScore: number
  ) {
    if (!word || word.length < 1) return

    ctx.save()

    const centerX = width / 2
    const centerY = height * 0.35 // Higher up on canvas

    // Draw large subtle letters
    const fontSize = Math.min(80, width / (word.length * 0.8))
    ctx.font = `bold ${fontSize}px Arial`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    // Subtle color based on validity (slightly brighter)
    if (isValid) {
      ctx.fillStyle = 'rgba(76, 175, 80, 0.22)'
    } else if (word.length >= 2) {
      ctx.fillStyle = 'rgba(244, 67, 54, 0.15)'
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)'
    }

    ctx.fillText(word, centerX, centerY)

    // Add subtle outline
    ctx.strokeStyle = isValid ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255, 255, 255, 0.08)'
    ctx.lineWidth = 2
    ctx.strokeText(word, centerX, centerY)

    // Draw potential score underneath
    if (potentialScore > 0) {
      const scoreY = centerY + fontSize * 0.6 + 10
      ctx.font = 'bold 24px Arial'

      if (isValid) {
        ctx.fillStyle = 'rgba(76, 175, 80, 0.35)'
        ctx.fillText(`+${potentialScore}`, centerX, scoreY)
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'
        ctx.fillText(`(${potentialScore})`, centerX, scoreY)
      }
    }

    ctx.restore()
  }

  return {
    renderGems,
    renderPoppingGem,
    processPopAnimations,
    clearCanvas,
    renderWordBackground,
    createHexagonVertices,
    getGemColor,
    getGemBorderColor
  }
}
