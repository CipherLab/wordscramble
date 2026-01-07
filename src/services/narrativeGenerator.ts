// ============================================================================
// NARRATIVE GENERATOR SERVICE
// AI-powered story generation with state management
// ============================================================================

import { GoogleGenAI } from '@google/genai'
import type { NarrativeState, GoalTemplate, GeneratedTurn } from '../types/arclight'

// ============================================================================
// TYPES
// ============================================================================

export interface NarrativeGenerationContext {
  currentState: NarrativeState
  goalTemplate: GoalTemplate
  playerContribution: string
  previousProse: string[] // Last 2-3 turns for continuity
  turnNumber: number
  maxTurns: number
}

interface NarrativeGenerationResponse {
  prose: string
  updatedState: {
    characters: Array<{
      id: string
      name: string
      location: string
      emotion: string
      avatar?: string
    }>
    tension: number
    plotProgress: number
    currentSceneLocation: string
    goalReached: boolean
  }
  stateReasoning?: string
}

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
// SYSTEM PROMPT
// ============================================================================

const NARRATIVE_SYSTEM_PROMPT = `You are a narrative engine for "Arc Light," a collaborative storytelling game.

Your role:
- Weave player contributions into coherent, immersive prose (2-3 paragraphs)
- Maintain strict continuity with the current narrative state
- Update character locations, emotions, and tension organically
- Progress the plot toward the goal state
- Treat player input as canonical intent, but interpret creatively if needed

Style guidelines:
- Write in third-person limited or omniscient perspective
- Match the genre tone (heist = tense, romance = emotional, horror = atmospheric, comedy = absurd)
- Show don't tell: reveal character emotions through actions and dialogue
- NO meta-commentary or breaking the fourth wall
- NO refusing player contributions (make anything work within state)

State constraints:
- Characters cannot teleport (gradual location transitions only)
- Emotions shift gradually (no instant mood swings without cause)
- Tension increases toward climax (rarely decreases except in comedy)
- Plot progress should increase each turn (5-30 points per turn depending on pacing)
- Maintain consistency with previous prose

Output format:
Return a JSON object with this EXACT structure:
{
  "prose": "The narrative prose here (2-3 paragraphs)...",
  "updatedState": {
    "characters": [
      {
        "id": "char-0",
        "name": "Alex",
        "location": "Museum Vault",
        "emotion": "Panicked",
        "avatar": "🎭"
      }
    ],
    "tension": 65,
    "plotProgress": 55,
    "currentSceneLocation": "Museum Vault",
    "goalReached": false
  },
  "stateReasoning": "Brief explanation of state changes made (for debugging)"
}`

// ============================================================================
// PROMPT BUILDING
// ============================================================================

function buildNarrativePrompt(context: NarrativeGenerationContext): string {
  const { currentState, goalTemplate, playerContribution, previousProse, turnNumber, maxTurns } = context

  let prompt = `=== NARRATIVE CONTEXT ===\n`
  prompt += `Genre: ${goalTemplate.genre}\n`
  prompt += `Goal: ${goalTemplate.description}\n`
  prompt += `Success Condition: ${goalTemplate.successCondition}\n`
  prompt += `Turn: ${turnNumber} of ${maxTurns}\n\n`

  // Previous prose for continuity
  if (previousProse.length > 0) {
    prompt += `=== STORY SO FAR (last ${previousProse.length} turns) ===\n`
    previousProse.forEach((prose, i) => {
      const pastTurnNumber = turnNumber - previousProse.length + i
      prompt += `Turn ${pastTurnNumber}:\n${prose}\n\n`
    })
  }

  // Current state
  prompt += `=== CURRENT STATE ===\n`
  prompt += `Scene Location: ${currentState.currentSceneLocation}\n`
  prompt += `Tension: ${currentState.tension}/100\n`
  prompt += `Plot Progress: ${currentState.plotProgress}/100\n`
  prompt += `Goal Reached: ${currentState.goalReached}\n\n`

  prompt += `Characters:\n`
  currentState.characters.forEach(char => {
    prompt += `- ${char.name} (${char.id}): at "${char.location}", feeling ${char.emotion}`
    if (char.avatar) prompt += ` ${char.avatar}`
    prompt += `\n`
  })

  // Player contribution
  prompt += `\n=== PLAYER CONTRIBUTION (THIS TURN) ===\n`
  prompt += `"${playerContribution}"\n\n`

  // Instructions based on turn position
  prompt += `=== INSTRUCTIONS ===\n`

  if (turnNumber === 1) {
    prompt += `This is the OPENING. Set the scene vividly. Establish atmosphere and initial tension. `
    prompt += `Incorporate the player's contribution as the inciting incident. `
    prompt += `Increase tension by 10-20 points. Increase plot progress by 5-15 points.\n`
  } else if (turnNumber >= maxTurns) {
    prompt += `This is the FINAL TURN. The story MUST reach its conclusion. `
    prompt += `Progress should jump significantly (to 100). Either achieve or definitively fail the goal. `
    prompt += `Set goalReached to true if the success condition is met, false otherwise.\n`
  } else if (turnNumber >= maxTurns - 1) {
    prompt += `This is the CLIMAX. Build to the final confrontation or decision point. `
    prompt += `Increase tension significantly (15-25 points). Increase plot progress by 15-25 points.\n`
  } else if (turnNumber >= maxTurns / 2) {
    prompt += `This is RISING ACTION. Complications intensify. Increase tension meaningfully. `
    prompt += `Increase tension by 10-20 points. Progress should increase by 10-20 points.\n`
  } else {
    prompt += `This is EARLY DEVELOPMENT. Build characters and stakes. Tension should rise gradually. `
    prompt += `Increase tension by 5-15 points. Progress should increase by 5-15 points.\n`
  }

  prompt += `\nInterpret the player contribution creatively if needed to maintain: `
  prompt += `(1) State consistency, (2) Genre tone, (3) Character coherence. `
  prompt += `Make the contribution feel inevitable given current state.\n\n`

  prompt += `Remember:\n`
  prompt += `- Update character locations if they move (gradual transitions only)\n`
  prompt += `- Shift emotions organically based on events\n`
  prompt += `- Increase tension unless genre demands release (comedy can decrease)\n`
  prompt += `- Progress the plot toward the goal\n`
  prompt += `- Write 2-3 immersive paragraphs\n`
  prompt += `- Preserve character IDs exactly (${currentState.characters.map(c => c.id).join(', ')})\n`
  prompt += `- Preserve avatar emojis from characters\n\n`

  prompt += `Output ONLY valid JSON in the specified format. Do not include markdown code blocks or any other text.`

  return prompt
}

// ============================================================================
// GEMINI API CALL
// ============================================================================

async function callGemini(systemPrompt: string, userPrompt: string): Promise<string> {
  const client = getClient()

  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `${systemPrompt}\n\n${userPrompt}`,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.8, // Creativity dial
      },
    })

    if (!response || !response.text) {
      throw new Error('Empty response from Gemini')
    }

    return response.text.trim()
  } catch (error: any) {
    console.error('[Gemini API] Error:', error)
    throw new Error(`Gemini API call failed: ${error.message}`)
  }
}

// ============================================================================
// STATE VALIDATION (currently unused - Gemini doesn't follow strict schema)
// ============================================================================

// Removed validateStateUpdate - we're now handling flexible AI responses
// that don't match our expected schema. We merge AI output with existing state
// to ensure continuity instead of strict validation.

// ============================================================================
// MAIN GENERATION FUNCTION
// ============================================================================

export async function generateNarrativeTurn(
  context: NarrativeGenerationContext,
  contributionId: string
): Promise<GeneratedTurn> {
  const userPrompt = buildNarrativePrompt(context)

  try {
    // Call Gemini
    const responseText = await callGemini(NARRATIVE_SYSTEM_PROMPT, userPrompt)

    // Parse JSON
    let parsed: NarrativeGenerationResponse
    try {
      parsed = JSON.parse(responseText)
      console.log('[Narrative Generator] Parsed response:', parsed)
    } catch (parseError) {
      console.error('[Narrative Generator] Failed to parse JSON:', responseText)
      throw new Error('AI returned invalid JSON')
    }

    // Extract prose (handle both field names)
    const prose = (parsed as any).prose || (parsed as any).sceneDescription
    if (!prose) {
      console.error('[Narrative Generator] No prose found. Received:', JSON.stringify(parsed, null, 2))
      throw new Error('Invalid AI response: missing prose/sceneDescription')
    }

    // Extract state fields (handle both nested and flat structure)
    const stateData = (parsed as any).updatedState || parsed

    // Parse characters, handling different formats
    const characters = ((stateData as any).characters || []).map((char: any, index: number) => {
      const originalChar = context.currentState.characters[index]
      if (!originalChar) {
        throw new Error(`Missing original character at index ${index}`)
      }
      return {
        id: char.id || char.charId || originalChar.id,
        name: char.name || originalChar.name,
        location: char.location || originalChar.location,
        emotion: char.emotion || originalChar.emotion,
        avatar: char.avatar || originalChar.avatar,
      }
    })

    // Build updated state
    const updatedState: NarrativeState = {
      characters,
      tension: stateData.tension ?? context.currentState.tension,
      plotProgress: stateData.plotProgress ?? context.currentState.plotProgress,
      currentSceneLocation: stateData.currentSceneLocation || context.currentState.currentSceneLocation,
      goalReached: stateData.goalReached ?? false,
      turnNumber: context.turnNumber,
      totalTurns: context.maxTurns,
    }

    console.log('[Narrative Generator] Built updated state:', updatedState)

    // Return generated turn
    return {
      turnNumber: context.turnNumber,
      proseSnippet: prose,
      updatedState,
      generatedAt: Date.now(),
      contributionId,
    }
  } catch (error: any) {
    console.error('[Narrative Generator] Generation failed:', error)

    // Fallback: Generic prose + incremental state update
    console.warn('[Narrative Generator] Using fallback prose and state')

    const fallbackState: NarrativeState = {
      ...context.currentState,
      tension: Math.min(100, context.currentState.tension + 5),
      plotProgress: Math.min(100, context.currentState.plotProgress + 5),
      turnNumber: context.turnNumber,
      totalTurns: context.maxTurns,
    }

    return {
      turnNumber: context.turnNumber,
      proseSnippet: `The story continues... ${context.playerContribution}`,
      updatedState: fallbackState,
      generatedAt: Date.now(),
      contributionId,
    }
  }
}

// ============================================================================
// TEST FUNCTION
// ============================================================================

export async function testGeminiConnection(): Promise<boolean> {
  try {
    const response = await callGemini(
      'You are a helpful assistant.',
      'Respond with valid JSON: {"status": "ok", "message": "Connection successful"}'
    )

    const parsed = JSON.parse(response)
    return parsed.status === 'ok'
  } catch (error) {
    console.error('[Narrative Generator] Connection test failed:', error)
    return false
  }
}
