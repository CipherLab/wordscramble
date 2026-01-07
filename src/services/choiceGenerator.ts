// ============================================================================
// CHOICE GENERATOR SERVICE
// AI-powered action choice generation
// ============================================================================

import { GoogleGenAI } from '@google/genai'
import type { NarrativeState, GoalTemplate, ActionChoice } from '../types/arclight'

// ============================================================================
// GEMINI CLIENT
// ============================================================================

let ai: GoogleGenAI | null = null

function getClient(): GoogleGenAI {
  if (!ai) {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    if (!apiKey) {
      throw new Error('VITE_GEMINI_API_KEY environment variable is not set')
    }
    ai = new GoogleGenAI({ apiKey })
  }
  return ai
}

// ============================================================================
// PROMPT
// ============================================================================

const CHOICE_GENERATION_PROMPT = `You are generating action choices for a narrative game.

Given the current story state, generate 3-5 possible actions the player could take.

Each action should:
- Be specific and actionable
- Advance the plot toward the goal
- Have realistic success probability based on current state
- Fit the genre and tone
- Be distinct from each other (different approaches)

Return ONLY valid JSON in this format:
{
  "choices": [
    {
      "text": "Persuade the scholar to help them",
      "type": "diplomatic",
      "probability": 75,
      "consequence": "The scholar might reveal crucial information"
    },
    {
      "text": "Sneak past the guards while they're distracted",
      "type": "stealthy",
      "probability": 60,
      "consequence": "Risky but could avoid confrontation"
    }
  ]
}

Valid types: diplomatic, aggressive, stealthy, investigative, creative
Probability: 0-100 (higher = more likely to succeed given current state)
Consequence: Optional hint about potential outcome`

// ============================================================================
// CHOICE GENERATION
// ============================================================================

export async function generateActionChoices(
  currentState: NarrativeState,
  goalTemplate: GoalTemplate,
  turnNumber: number
): Promise<ActionChoice[]> {
  const client = getClient()

  const userPrompt = `
=== GAME CONTEXT ===
Genre: ${goalTemplate.genre}
Goal: ${goalTemplate.description}
Success Condition: ${goalTemplate.successCondition}
Turn: ${turnNumber} of ${currentState.totalTurns}

=== CURRENT STATE ===
Scene: ${currentState.currentSceneLocation}
Tension: ${currentState.tension}/100
Plot Progress: ${currentState.plotProgress}/100

Characters:
${currentState.characters.map(c => `- ${c.name}: at "${c.location}", feeling ${c.emotion}`).join('\n')}

=== TASK ===
Generate 3-5 distinct action choices that:
1. Make sense given the current state
2. Move the story toward the goal
3. Offer different approaches (diplomatic, aggressive, stealthy, etc.)
4. Have appropriate success probabilities based on context

${turnNumber === 1 ? 'This is the opening - actions should establish the scene and introduce conflict.' : ''}
${turnNumber >= currentState.totalTurns - 1 ? 'This is near the climax - actions should drive toward resolution.' : ''}

Output ONLY the JSON with the choices array.
`

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `${CHOICE_GENERATION_PROMPT}\n\n${userPrompt}`,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.9, // Higher creativity for variety
      },
    })

    if (!response || !response.text) {
      throw new Error('Empty response from Gemini')
    }

    const parsed = JSON.parse(response.text.trim())
    const choices = parsed.choices || []

    // Map to ActionChoice with generated IDs and icons
    return choices.map((choice: any, index: number) => ({
      id: `choice-${Date.now()}-${index}`,
      text: choice.text,
      type: choice.type || 'creative',
      probability: Math.min(100, Math.max(0, choice.probability || 50)),
      icon: getIconForType(choice.type),
      consequence: choice.consequence,
    }))
  } catch (error: any) {
    console.error('[Choice Generator] Failed:', error)

    // Fallback: generate simple choices
    return getFallbackChoices(currentState, goalTemplate)
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function getIconForType(type: string): string {
  const icons: Record<string, string> = {
    diplomatic: 'forum',
    aggressive: 'whatshot',
    stealthy: 'visibility_off',
    investigative: 'search',
    creative: 'lightbulb',
    custom: 'edit',
  }
  return icons[type] || 'arrow_forward'
}

function getFallbackChoices(
  _currentState: NarrativeState,
  _goalTemplate: GoalTemplate
): ActionChoice[] {
  // Generic fallback choices
  return [
    {
      id: `fallback-1-${Date.now()}`,
      text: 'Take a diplomatic approach',
      type: 'diplomatic',
      probability: 70,
      icon: 'forum',
      consequence: 'Attempt to negotiate or persuade',
    },
    {
      id: `fallback-2-${Date.now()}`,
      text: 'Investigate the situation carefully',
      type: 'investigative',
      probability: 65,
      icon: 'search',
      consequence: 'Gather more information before acting',
    },
    {
      id: `fallback-3-${Date.now()}`,
      text: 'Act boldly and decisively',
      type: 'aggressive',
      probability: 50,
      icon: 'whatshot',
      consequence: 'Take direct action with risks',
    },
  ]
}
