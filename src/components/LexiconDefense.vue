<script setup lang="ts">
/**
 * LEXICON DEFENSE
 * Missile Command × Space Invaders × Scrabble.
 *
 * - Letters drift down from the top. They are "bombs."
 * - Your bases (turrets) at the bottom defend you.
 * - You don't aim. You SPELL. Tap falling letters in order to build a word.
 * - Submit a valid word -> turrets blast those letters and you score
 *   (Scrabble values, length & rarity bonuses) and heal your weakest base.
 * - Letters that reach the bottom strike a base. Lose all bases -> game over.
 *
 * Vue 3 conversion of the original single-file React artifact. The play field
 * is an SVG so it renders without any CSS framework. Word validation uses the
 * shared Collins dictionary (loaded by App.vue before any game mounts).
 */
import { ref, shallowRef, computed, watch, onBeforeUnmount } from 'vue'
import { isValidWord, getRandomWord } from '../constants/dictionary'

// ----- Scrabble letter values -----
const LETTER_VALUES: Record<string, number> = {
  A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1, J: 8,
  K: 5, L: 1, M: 3, N: 1, O: 1, P: 3, Q: 10, R: 1, S: 1, T: 1,
  U: 1, V: 4, W: 4, X: 8, Y: 4, Z: 10,
}

// The falling letters are sourced from real words: we pick a random dictionary
// word, scramble its letters, and drop them. This guarantees the letters on the
// board are always spellable into something — no piles of unusable Q/X/Z. A
// queue holds the scrambled letters of the current source word; when it drains
// we grab and scramble another word.
let letterQueue: string[] = []

function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = arr[i]!
    arr[i] = arr[j]!
    arr[j] = tmp
  }
  return arr
}

function refillQueue() {
  const word = getRandomWord(4, 7) || 'WORDS'
  letterQueue.push(...shuffleInPlace(word.toUpperCase().split('')))
}

function nextLetter(): string {
  if (letterQueue.length === 0) refillQueue()
  return letterQueue.shift() || 'E'
}

// Minimum word length (2-letter words disabled to keep things readable).
const WORD_MIN = 3
const isWord = (w: string) => w.length >= WORD_MIN && isValidWord(w)

// ----- Theme: phosphor terminal -----
const C = {
  bg: '#02110a',
  grid: '#0a3320',
  phosphor: '#3dff8f',
  phosphorDim: '#1f7a4a',
  amber: '#ffb13d',
  red: '#ff4d4d',
  cyan: '#5cf2ff',
  ink: '#021a0f',
}

type FallingLetter = {
  id: number
  char: string
  x: number // 0..1 fraction of width
  y: number // pixels from top
  vy: number // px/sec
  selectedIdx: number | null // position in the current spelled word, or null
  dying: boolean // hit by laser / cleared
  dieAt?: number
}

type Base = {
  id: number
  x: number // 0..1
  hp: number
  maxHp: number
  cooldown: number // seconds until can fire
}

type Beam = {
  id: number
  fromX: number
  fromY: number
  toX: number
  toY: number
  life: number
}

type Floater = { id: number; x: number; y: number; text: string; color: string; life: number }

type GameState = 'menu' | 'playing' | 'over'

const FIELD_W = 380
const FIELD_H = 640
const BASE_Y = FIELD_H - 28

// A preview band above the field (negative y). Letters spawn at the top of it
// as faint ghosts and fade to fully solid as they descend across the entry
// line at y=0 — so you can see what's coming before it "officially" arrives.
const PREVIEW = 80

let _id = 1
const nextId = () => _id++

// Rarity multiplier: rewards longer + higher-value words.
function scoreWord(word: string): { points: number; rarity: string } {
  const base = word.split('').reduce((s, c) => s + (LETTER_VALUES[c] || 0), 0)
  const lengthBonus = Math.pow(word.length, 2) // 3->9, 5->25, 7->49
  const points = (base + lengthBonus) * (1 + Math.floor(base / 8))
  let rarity = 'WORD'
  if (word.length >= 7) rarity = 'EPIC'
  else if (word.length >= 5) rarity = 'RARE'
  else if (base >= 12) rarity = 'JUICY'
  return { points, rarity }
}

// ----- reactive UI state -----
const gameState = ref<GameState>('menu')
const score = ref(0)
const best = ref(0)
const wordCount = ref(0)
const lastWord = ref<{ word: string; pts: number; rarity: string } | null>(null)
const shake = ref(0)
const shakeX = ref(0)
const shakeY = ref(0)

// reactive word-in-progress (kept in sync with the selection working array)
const currentWord = ref('')
const currentValid = computed(() => isWord(currentWord.value))
const currentPoints = computed(() =>
  currentValid.value ? scoreWord(currentWord.value).points : 0
)

// ----- mutable game world (non-reactive working arrays) -----
let letters: FallingLetter[] = []
let bases: Base[] = []
let beams: Beam[] = []
let floaters: Floater[] = []
let selected: FallingLetter[] = []
let spawnTimer = 0
let difficulty = 0
let running = false

// ----- render snapshot (reassigned each frame to trigger repaint) -----
const snapLetters = shallowRef<FallingLetter[]>([])
const snapBases = shallowRef<Base[]>([])
const snapBeams = shallowRef<Beam[]>([])
const snapFloaters = shallowRef<Floater[]>([])

const svgRef = ref<SVGSVGElement | null>(null)
let raf = 0
let lastT = 0

function syncWord() {
  currentWord.value = selected.map((l) => l.char).join('')
}

function publishSnap() {
  snapLetters.value = letters.slice()
  snapBases.value = bases.slice()
  snapBeams.value = beams.slice()
  snapFloaters.value = floaters.slice()
}

function reset() {
  _id = 1
  letters = []
  beams = []
  floaters = []
  selected = []
  letterQueue = []
  spawnTimer = 0
  difficulty = 0
  bases = [0.18, 0.5, 0.82].map((x, i) => ({
    id: nextId(),
    x,
    hp: 100,
    maxHp: 100,
    cooldown: 0.3 + i * 0.28,
  }))
  score.value = 0
  wordCount.value = 0
  lastWord.value = null
  syncWord()
  publishSnap()
}

function start() {
  reset()
  gameState.value = 'playing'
  running = true
}

function reindexSelection() {
  selected.forEach((l, i) => (l.selectedIdx = i))
}

function killLetter(L: FallingLetter, byWord: boolean) {
  if (L.dying) return
  L.dying = true
  L.dieAt = performance.now() + (byWord ? 220 : 120)
  floaters.push({
    id: nextId(),
    x: L.x * FIELD_W,
    y: L.y,
    text: byWord ? '✦' : '×',
    color: byWord ? C.cyan : C.phosphorDim,
    life: 0.5,
  })
}

// ---- main loop ----
function loop(now: number) {
  const dt = Math.min(0.05, (now - lastT) / 1000)
  lastT = now
  if (!running) return

  difficulty += dt
  const diff = difficulty

  // spawn cadence speeds up over time (gently).
  const spawnEvery = Math.max(0.85, 1.9 - diff * 0.006)
  if (!Number.isFinite(spawnTimer)) spawnTimer = 0
  spawnTimer -= dt
  if (spawnTimer <= 0) {
    spawnTimer = spawnEvery
    const ch = nextLetter()
    letters.push({
      id: nextId(),
      char: ch,
      x: 0.08 + Math.random() * 0.84,
      y: -PREVIEW,
      vy: 10 + Math.random() * 7 + diff * 0.15,
      selectedIdx: null,
      dying: false,
    })
  }

  // move letters
  const survivors: FallingLetter[] = []
  let selectionChanged = false
  for (const L of letters) {
    if (L.dying) {
      if (now >= (L.dieAt || 0)) continue // removed
      survivors.push(L)
      continue
    }
    L.y += L.vy * dt
    if (L.y >= BASE_Y) {
      // strike nearest base
      const bx = L.x
      let nearest: Base | null = null
      let nd = Infinity
      for (const b of bases) {
        const d = Math.abs(b.x - bx)
        if (d < nd) {
          nd = d
          nearest = b
        }
      }
      if (nearest) {
        // A letter's Scrabble value (the number on its tile) IS the damage it
        // deals — so rare high-value letters are the real threat.
        const dmg = LETTER_VALUES[L.char] || 1
        nearest.hp = Math.max(0, nearest.hp - dmg)
        floaters.push({
          id: nextId(),
          x: nearest.x * FIELD_W,
          y: BASE_Y - 10,
          text: `−${dmg}`,
          color: C.red,
          life: 0.9,
        })
        shake.value = 8
      }
      // deselect if it was part of a word-in-progress
      if (L.selectedIdx !== null) {
        selected = selected.filter((s) => s.id !== L.id)
        reindexSelection()
        selectionChanged = true
      }
      continue // letter consumed
    }
    survivors.push(L)
  }
  letters = survivors
  if (selectionChanged) syncWord()

  // tick base cooldowns down so the muzzle can flash cleanly on submit
  for (const b of bases) {
    if (b.cooldown > 0) b.cooldown -= dt
  }

  // beams decay
  beams = beams.filter((bm) => {
    bm.life -= dt
    return bm.life > 0
  })

  // floaters decay
  floaters = floaters.filter((f) => {
    f.life -= dt
    f.y -= 18 * dt
    return f.life > 0
  })

  // shake decay
  if (shake.value > 0) {
    shake.value = Math.max(0, shake.value - dt * 50)
    shakeX.value = (Math.random() - 0.5) * shake.value
    shakeY.value = (Math.random() - 0.5) * shake.value
  } else {
    shakeX.value = 0
    shakeY.value = 0
  }

  // game over? (guard against an empty array — .every([]) is true)
  if (bases.length > 0 && bases.every((b) => b.hp <= 0)) {
    running = false
    best.value = Math.max(best.value, score.value)
    gameState.value = 'over'
  }

  publishSnap()
  raf = requestAnimationFrame(loop)
}

watch(gameState, (s) => {
  if (s === 'playing') {
    lastT = performance.now()
    running = true
    cancelAnimationFrame(raf)
    raf = requestAnimationFrame(loop)
  } else {
    running = false
    cancelAnimationFrame(raf)
  }
})

onBeforeUnmount(() => {
  running = false
  cancelAnimationFrame(raf)
})

// ---- interaction ----
function svgPoint(e: PointerEvent): { x: number; y: number } {
  const svg = svgRef.value!
  const r = svg.getBoundingClientRect()
  const x = ((e.clientX - r.left) / r.width) * FIELD_W
  // svg keeps a 0..FIELD_H viewport; taps above the field map to negative y,
  // so off-field ghosts resolve correctly too.
  const y = ((e.clientY - r.top) / r.height) * FIELD_H
  return { x, y }
}

function onTapField(e: PointerEvent) {
  if (gameState.value !== 'playing') return
  const { x, y } = svgPoint(e)
  // find closest letter within touch radius
  let hit: FallingLetter | null = null
  let nd = 32 // px radius
  for (const L of letters) {
    if (L.dying) continue
    const d = Math.hypot(L.x * FIELD_W - x, L.y - y)
    if (d < nd) {
      nd = d
      hit = L
    }
  }
  if (!hit) return

  if (hit.selectedIdx !== null) {
    // tapping a selected letter: if it's the last one, deselect it (backspace).
    if (hit.selectedIdx === selected.length - 1) {
      hit.selectedIdx = null
      selected = selected.filter((s) => s.id !== hit!.id)
      reindexSelection()
      syncWord()
    }
    return
  }
  hit.selectedIdx = selected.length
  selected.push(hit)
  syncWord()
}

function clearSelection() {
  selected.forEach((l) => (l.selectedIdx = null))
  selected = []
  syncWord()
}

function submitWord() {
  const word = selected.map((l) => l.char).join('')
  if (!isWord(word)) {
    // bzzt: flash red, drop selection
    shake.value = 5
    floaters.push({
      id: nextId(),
      x: FIELD_W / 2,
      y: FIELD_H / 2,
      text: 'NOT A WORD',
      color: C.red,
      life: 0.9,
    })
    clearSelection()
    return
  }
  const { points, rarity } = scoreWord(word)
  // Fire one beam at each letter from whichever living base is closest to it,
  // then clear the spelled letters off the board.
  const living = bases.filter((b) => b.hp > 0)
  selected.forEach((l) => {
    const lx = l.x * FIELD_W
    let from = living[0]
    let nd = Infinity
    for (const b of living) {
      const d = Math.abs(b.x * FIELD_W - lx)
      if (d < nd) {
        nd = d
        from = b
      }
    }
    if (from) {
      from.cooldown = 0.2 // brief muzzle flash
      beams.push({
        id: nextId(),
        fromX: from.x * FIELD_W,
        fromY: BASE_Y,
        toX: lx,
        toY: l.y,
        life: 0.16,
      })
    }
    killLetter(l, true)
  })
  floaters.push({
    id: nextId(),
    x: FIELD_W / 2,
    y: FIELD_H * 0.42,
    text: `${word} +${points}`,
    color: rarity === 'EPIC' ? C.amber : C.cyan,
    life: 1.3,
  })
  // Every valid word restores health to the weakest living base.
  const alive = bases.filter((b) => b.hp > 0)
  if (alive.length) {
    const heal = Math.round(word.length * word.length * 0.8)
    const weak = alive.reduce((a, b) => (a.hp <= b.hp ? a : b))
    if (weak.hp < weak.maxHp) {
      const before = weak.hp
      weak.hp = Math.min(weak.maxHp, weak.hp + heal)
      floaters.push({
        id: nextId(),
        x: weak.x * FIELD_W,
        y: BASE_Y - 10,
        text: `+${weak.hp - before}`,
        color: C.phosphor,
        life: 1.1,
      })
    }
  }
  score.value += points
  wordCount.value += 1
  lastWord.value = { word, pts: points, rarity }
  clearSelection()
}

// ---- render helpers ----
const barColor = (frac: number) =>
  frac > 0.5 ? C.phosphor : frac > 0.25 ? C.amber : C.red

// Ghost -> solid as a letter falls through the preview band and crosses the
// entry line (y=0), reaching full opacity just inside the field.
const enterOpacity = (y: number) =>
  Math.max(0, Math.min(1, (y + PREVIEW) / (PREVIEW + 10)))

const fieldTransform = computed(
  () => `translate(${shakeX.value}px, ${shakeY.value}px)`
)
</script>

<template>
  <div class="lexicon-root">
    <div style="width: 100%; max-width: 420px">
      <!-- HUD -->
      <div class="lex-hud">
        <div>
          <div :style="{ fontSize: '11px', color: C.phosphorDim }">SCORE</div>
          <div :style="{ fontSize: '26px', fontWeight: 700, color: C.amber, lineHeight: 1 }">
            {{ score.toLocaleString() }}
          </div>
        </div>
        <div :style="{ textAlign: 'center', fontSize: '13px', fontWeight: 700, color: C.phosphor }">
          LEXICON<span :style="{ color: C.red }"> DEFENSE</span>
        </div>
        <div style="text-align: right">
          <div :style="{ fontSize: '11px', color: C.phosphorDim }">WORDS</div>
          <div :style="{ fontSize: '26px', fontWeight: 700, lineHeight: 1 }">{{ wordCount }}</div>
        </div>
      </div>

      <!-- Field -->
      <div
        class="lex-field crt"
        :style="{
          aspectRatio: `${FIELD_W} / ${FIELD_H}`,
          border: `1px solid ${C.phosphorDim}`,
          boxShadow: `0 0 0 2px ${C.ink}, 0 0 40px rgba(61,255,143,.12) inset`,
          background: C.bg,
        }"
      >
        <svg
          ref="svgRef"
          :viewBox="`0 0 ${FIELD_W} ${FIELD_H}`"
          width="100%"
          height="100%"
          @pointerdown="onTapField"
          :style="{ display: 'block', overflow: 'visible', transform: fieldTransform }"
        >
          <!-- grid -->
          <line
            v-for="i in 9"
            :key="`v${i}`"
            :x1="i * (FIELD_W / 10)"
            :y1="0"
            :x2="i * (FIELD_W / 10)"
            :y2="FIELD_H"
            :stroke="C.grid"
            :stroke-width="1"
          />
          <line
            v-for="i in 14"
            :key="`h${i}`"
            :x1="0"
            :y1="i * (FIELD_H / 15)"
            :x2="FIELD_W"
            :y2="i * (FIELD_H / 15)"
            :stroke="C.grid"
            :stroke-width="1"
          />

          <!-- danger line -->
          <line
            :x1="0"
            :y1="BASE_Y - 6"
            :x2="FIELD_W"
            :y2="BASE_Y - 6"
            :stroke="C.red"
            :stroke-opacity="0.35"
            stroke-dasharray="4 6"
            :stroke-width="1"
          />

          <!-- beams -->
          <line
            v-for="bm in snapBeams"
            :key="bm.id"
            :x1="bm.fromX"
            :y1="bm.fromY"
            :x2="bm.toX"
            :y2="bm.toY"
            :stroke="C.cyan"
            :stroke-width="2"
            :stroke-opacity="Math.max(0, bm.life / 0.12)"
          />

          <!-- letters -->
          <g
            v-for="L in snapLetters"
            :key="L.id"
            :opacity="L.dying ? 0.4 : enterOpacity(L.y)"
          >
            <rect
              :x="L.x * FIELD_W - 18"
              :y="L.y - 18"
              :width="36"
              :height="36"
              :rx="6"
              :fill="L.selectedIdx !== null ? C.phosphor : C.ink"
              :stroke="
                L.selectedIdx !== null
                  ? C.cyan
                  : (LETTER_VALUES[L.char] || 0) >= 8
                  ? C.amber
                  : C.phosphorDim
              "
              :stroke-width="L.selectedIdx !== null ? 2.5 : 1.6"
            />
            <text
              :x="L.x * FIELD_W"
              :y="L.y + 8"
              text-anchor="middle"
              :font-size="23"
              :font-weight="700"
              :fill="
                L.selectedIdx !== null
                  ? C.ink
                  : (LETTER_VALUES[L.char] || 0) >= 8
                  ? C.amber
                  : C.phosphor
              "
            >
              {{ L.char }}
            </text>
            <text
              :x="L.x * FIELD_W + 12"
              :y="L.y - 8"
              text-anchor="middle"
              :font-size="9"
              :fill="L.selectedIdx !== null ? C.ink : C.phosphorDim"
            >
              {{ LETTER_VALUES[L.char] || 0 }}
            </text>
            <text
              v-if="L.selectedIdx !== null"
              :x="L.x * FIELD_W - 12"
              :y="L.y - 8"
              text-anchor="middle"
              :font-size="10"
              :font-weight="700"
              :fill="C.ink"
            >
              {{ (L.selectedIdx ?? 0) + 1 }}
            </text>
          </g>

          <!-- bases -->
          <g v-for="b in snapBases" :key="b.id" :opacity="b.hp <= 0 ? 0.25 : 1">
            <!-- health bar above the turret -->
            <rect
              :x="b.x * FIELD_W - 20"
              :y="BASE_Y + 16"
              :width="40"
              :height="5"
              :rx="2.5"
              fill="#0c2a1a"
              :stroke="C.phosphorDim"
              :stroke-width="0.75"
            />
            <rect
              :x="b.x * FIELD_W - 20"
              :y="BASE_Y + 16"
              :width="40 * Math.max(0, b.hp / b.maxHp)"
              :height="5"
              :rx="2.5"
              :fill="barColor(Math.max(0, b.hp / b.maxHp))"
            />
            <!-- turret -->
            <polygon
              :points="`${b.x * FIELD_W - 16},${BASE_Y + 14} ${b.x * FIELD_W + 16},${BASE_Y + 14} ${b.x * FIELD_W + 8},${BASE_Y - 2} ${b.x * FIELD_W - 8},${BASE_Y - 2}`"
              :fill="b.hp <= 0 ? C.ink : C.phosphorDim"
              :stroke="b.hp <= 0 ? C.red : C.phosphor"
              :stroke-width="1.4"
            />
            <rect
              :x="b.x * FIELD_W - 2"
              :y="BASE_Y - 12"
              :width="4"
              :height="12"
              :fill="b.hp <= 0 ? C.red : C.cyan"
            />
          </g>

          <!-- floaters -->
          <text
            v-for="f in snapFloaters"
            :key="f.id"
            :x="f.x"
            :y="f.y"
            text-anchor="middle"
            :font-size="f.text.length > 6 ? 16 : 13"
            :font-weight="700"
            :fill="f.color"
            :opacity="Math.max(0, f.life)"
          >
            {{ f.text }}
          </text>
        </svg>
        <div class="scan" style="position: absolute; inset: 0; pointer-events: none" />

        <!-- overlays -->
        <div v-if="gameState !== 'playing'" class="lex-overlay">
          <template v-if="gameState === 'menu'">
            <div style="font-size: 30px; font-weight: 700; letter-spacing: 2px">
              LEXICON<span :style="{ color: C.red }"> DEFENSE</span>
            </div>
            <div :style="{ fontSize: '12.5px', color: C.phosphorDim, maxWidth: '280px', lineHeight: 1.6 }">
              Letters are bombs falling on your turrets.
              <br />Tap them in order to <span :style="{ color: C.cyan }">spell</span>, then hit FIRE —
              your turrets blast every letter in the word and you score.
              <br />Words are your only defense. Any letter that reaches the bottom damages a base.
              <br />Longer + rarer = more points, and every word heals your weakest turret.
              <br />Lose all three turrets and it's over.
            </div>
            <button class="lex-btn" @click="start">INSERT COIN ▸</button>
          </template>
          <template v-else>
            <div :style="{ fontSize: '13px', color: C.red, letterSpacing: '3px' }">SYSTEM BREACH</div>
            <div :style="{ fontSize: '34px', fontWeight: 700, color: C.amber }">
              {{ score.toLocaleString() }}
            </div>
            <div :style="{ fontSize: '12px', color: C.phosphorDim }">
              {{ wordCount }} words spelled · best {{ Math.max(best, score).toLocaleString() }}
            </div>
            <div v-if="lastWord" :style="{ fontSize: '12px', color: C.cyan }">
              last: {{ lastWord.word }} ({{ lastWord.rarity }})
            </div>
            <button class="lex-btn" @click="start">RETRY ▸</button>
          </template>
        </div>
      </div>

      <!-- Word bar -->
      <div style="margin-top: 10px; display: flex; align-items: center; gap: 8px; min-height: 52px">
        <div
          class="lex-wordbox"
          :style="{
            border: `1px solid ${currentValid ? C.cyan : C.phosphorDim}`,
            background: C.ink,
            color: currentValid ? C.cyan : C.phosphor,
          }"
        >
          <template v-if="currentWord">{{ currentWord }}</template>
          <span v-else :style="{ color: C.phosphorDim, fontSize: '12px', letterSpacing: '1px' }">
            tap letters to spell…
          </span>
          <span
            v-if="currentWord"
            :style="{ marginLeft: 'auto', fontSize: '12px', color: currentValid ? C.cyan : C.phosphorDim }"
          >
            {{ currentValid ? `+${currentPoints}` : '—' }}
          </span>
        </div>
        <button
          class="lex-mini"
          :disabled="!currentWord"
          :style="{ opacity: currentWord ? 1 : 0.4 }"
          @click="clearSelection"
        >
          CLR
        </button>
        <button
          class="lex-mini"
          :disabled="!currentValid"
          :style="{
            borderColor: currentValid ? C.cyan : C.phosphorDim,
            color: currentValid ? C.cyan : C.phosphorDim,
            opacity: currentValid ? 1 : 0.5,
          }"
          @click="submitWord"
        >
          FIRE
        </button>
      </div>

      <div
        :style="{ marginTop: '6px', fontSize: '10.5px', color: C.phosphorDim, textAlign: 'center', lineHeight: 1.5 }"
      >
        tap a letter to add · tap the last letter again to undo · CLR resets · FIRE scores the word
      </div>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap');

.lexicon-root {
  min-height: calc(100vh - 50px);
  width: 100%;
  background: radial-gradient(120% 80% at 50% 0%, #000000 0%, #02110a 70%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-family: 'IBM Plex Mono', ui-monospace, 'Courier New', monospace;
  color: #3dff8f;
  padding: 12px;
  user-select: none;
  -webkit-user-select: none;
  touch-action: manipulation;
}

.lex-hud {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 8px;
  letter-spacing: 1px;
}

.lex-field {
  position: relative;
  width: 100%;
  border-radius: 10px;
  /* Visible so letters can drift in from above the field's top edge. */
  overflow: visible;
}

.lex-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 24px;
  background: rgba(2, 17, 10, 0.82);
  text-align: center;
}

.lex-wordbox {
  flex: 1;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  letter-spacing: 4px;
  font-size: 22px;
  font-weight: 700;
  overflow: hidden;
}

.lex-btn {
  font-family: inherit;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 2px;
  color: #021a0f;
  background: #3dff8f;
  border: none;
  border-radius: 8px;
  padding: 12px 22px;
  cursor: pointer;
  box-shadow: 0 0 20px rgba(61, 255, 143, 0.4);
}

.lex-mini {
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 1px;
  color: #3dff8f;
  background: #021a0f;
  border: 1px solid #1f7a4a;
  border-radius: 8px;
  height: 48px;
  padding: 0 12px;
  cursor: pointer;
}

@keyframes flick {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.92;
  }
}
.crt {
  animation: flick 6s infinite;
}
.scan {
  background-image: repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.18) 0 1px, transparent 1px 3px);
}
</style>
