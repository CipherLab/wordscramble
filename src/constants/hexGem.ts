// Geometry
export const HEX_RADIUS = 42
export const HEX_SPACING = 4
export const ASPECT_RATIO = 9 / 16 // Phone portrait aspect ratio

// Spawning
export const SPAWN_INTERVAL = 150
export const MAX_GEMS_ON_SCREEN = 50

// Special gem spawn chances (checked in order)
export const BOMB_CHANCE = 0.03        // 3% chance for bomb
export const MULTIPLY_3X_CHANCE = 0.02 // 2% chance for 3x multiplier
export const MULTIPLY_2X_CHANCE = 0.05 // 5% chance for 2x multiplier
export const STONE_CHANCE = 0.08       // 8% chance for stone blocker

// Animation
export const POP_DURATION = 200  // ms per gem pop
export const POP_STAGGER = 80    // ms delay between each gem pop
export const EXPLOSION_FORCE = 0.4
export const EXPLOSION_RADIUS_MULTIPLIER = 3.5  // multiplied by HEX_RADIUS
export const BOMB_FUSE_DELAY = 5000   // 5 seconds before fuse starts
export const BOMB_FUSE_TIME = 30000   // 30 seconds fuse duration

// Combo system
export const COMBO_WINDOW = 5000 // 5 seconds to continue combo

// Oxygen/timer system
export const OXYGEN_MAX = 100
export const OXYGEN_DRAIN_PER_SECOND = 2.5  // Drains fully in 40 seconds with no words
export const OXYGEN_REFILL_BASE = 15        // Base refill for a 2-letter word
export const OXYGEN_REFILL_PER_LETTER = 5   // Additional refill per letter beyond 2
export const OXYGEN_REFILL_PER_POINT = 0.3  // Bonus refill based on word score

// Level progression thresholds
export const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5500]

// Endless mode letters (weighted towards vowels and common consonants)
export const ENDLESS_LETTERS = 'EEEEAAAAIIIIOOOOUUUURRRRTTTTNNNNSSSSLLLLDDDDCCCCMMMMPPPPBBBBGGGG'.split('')
