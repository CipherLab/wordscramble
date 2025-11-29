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

// Animation
export const POP_DURATION = 200  // ms per gem pop
export const POP_STAGGER = 80    // ms delay between each gem pop
export const EXPLOSION_FORCE = 0.15

// Combo system
export const COMBO_WINDOW = 5000 // 5 seconds to continue combo

// Level progression thresholds
export const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5500]

// Endless mode letters (weighted towards vowels and common consonants)
export const ENDLESS_LETTERS = 'EEEEAAAAIIIIOOOOUUUURRRRTTTTNNNNSSSSLLLLDDDDCCCCMMMMPPPPBBBBGGGG'.split('')
