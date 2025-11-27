/**
 * Get a subtle background color for a letter based on its point value
 * Higher value letters get warmer tones
 */
export function getLetterColor(points: number): { base: string; highlight: string } {
  if (points >= 8) {
    // High value (8-10): subtle orange/pink
    return {
      base: '#ffe0e6',
      highlight: '#ffc4d0'
    }
  } else if (points >= 5) {
    // Medium-high value (5-7): subtle amber/gold
    return {
      base: '#fff3e0',
      highlight: '#ffe0b2'
    }
  } else if (points >= 3) {
    // Medium value (3-4): subtle green/teal
    return {
      base: '#e0f2f1',
      highlight: '#b2dfdb'
    }
  } else {
    // Low value (1-2): neutral gray
    return {
      base: '#e6e6e6',
      highlight: '#ffffff'
    }
  }
}
