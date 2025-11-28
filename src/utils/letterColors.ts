/**
 * Get a subtle background color for a letter based on its point value
 * Higher value letters get warmer tones
 */
export function getLetterColor(points: number, isDark = false): { base: string; highlight: string } {
  if (isDark) {
    // Dark mode colors - darker variants that work on dark backgrounds
    if (points >= 8) {
      // High value (8-10): dark pink/red
      return {
        base: '#5d2633',
        highlight: '#7d3545'
      }
    } else if (points >= 5) {
      // Medium-high value (5-7): dark amber/brown
      return {
        base: '#5d4a2a',
        highlight: '#7d6438'
      }
    } else if (points >= 3) {
      // Medium value (3-4): dark teal/green
      return {
        base: '#2a5d56',
        highlight: '#387d73'
      }
    } else {
      // Low value (1-2): dark gray
      return {
        base: '#3a3a3a',
        highlight: '#4a4a4a'
      }
    }
  } else {
    // Light mode colors
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
}
