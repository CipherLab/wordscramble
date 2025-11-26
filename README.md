# Word Scramble Game

A Scrabble-inspired word game built with Vue 3, Quasar, and TypeScript. Test your vocabulary skills by creating words from randomly drawn letters before time runs out!

## Game Rules

1. **Letter Distribution**: 9 letters are drawn from a Scrabble-style letter bag with the same letter distribution and point values as the classic board game
2. **Timer System**: Each letter has a 30-second timer that counts down. Letters disappear when their timer expires
3. **Word Formation**: Click letters to select them and form words (minimum 3 letters)
4. **Scoring**:
   - Base points from letter values (A=1, Z=10, etc.)
   - Length bonus: word length is added to the score
5. **Game End**: The game ends when all letters have expired and the bag is empty

## Features

- **Live Timers**: Visual countdown bars on each letter tile
- **Color-Coded Tiles**:
  - Normal: Gray gradient
  - Selected: Blue gradient
  - Expiring (≤10 seconds): Pulsing animation with red timer bar
- **Word History**: Track all words played with scores
- **Top Word**: Highlights your highest-scoring word
- **Controls**:
  - **Shuffle**: Rearrange letter tiles
  - **Clear**: Deselect all letters
  - **Submit**: Play your current word
  - **New Game**: Reset and start fresh

## Tech Stack

- **Vue 3** - Composition API with TypeScript
- **Quasar Framework** - UI components and layout
- **Pinia** - State management
- **Vite** - Build tool and dev server
- **Sass** - Styling

## Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Development

The project structure:

```
src/
├── components/
│   ├── GameBoard.vue      # Main game layout
│   └── LetterTile.vue     # Individual letter tile with timer
├── stores/
│   └── gameStore.ts       # Pinia store for game state
├── types/
│   └── game.ts            # TypeScript interfaces
├── constants/
│   └── scrabble.ts        # Letter distribution and utilities
└── App.vue                # Root component
```

## Game Mechanics

### Letter Timers
- Each letter starts with 30 seconds
- Timers count down independently
- Visual indicator shows time remaining
- Warning animation when ≤10 seconds remain

### Scoring System
- Letter points match Scrabble values
- Word length bonus encourages longer words
- Example: "QUICK" = Q(10) + U(1) + I(1) + C(3) + K(5) + length(5) = 25 points

### Letter Bag
Uses standard Scrabble distribution:
- 100 total letters
- Letter frequencies: E(12), A(9), I(9), O(8), etc.
- Proper point distribution: Z(10), Q(10), J(8), etc.

## Future Enhancements

Potential features for future development:
- Dictionary validation for real words
- Difficulty levels (different timer lengths)
- Multiplier tiles or bonus rounds
- Leaderboard and statistics
- Sound effects and animations
- Mobile-responsive touch controls

## License

MIT

## Credits

Inspired by Scrabble and word puzzle games.
