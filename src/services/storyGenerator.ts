// AI Story Generation Service for Mad Libs: Consequences
// Uses Gemini for narrative generation

import { GoogleGenAI } from '@google/genai'
import type { WordSubmission, RoundStory, Player } from '../types/consequences'

export interface StoryGenerationContext {
  round: number
  totalRounds: number
  chaosLevel: string
  currentSubmissions: WordSubmission[]
  previousStories: RoundStory[]
  previousSubmissions: WordSubmission[]
  players: Player[]
}

// Gemini client singleton
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

// System prompt that defines the narrator's personality
const NARRATOR_SYSTEM_PROMPT = `You are a deadpan narrator for a chaotic storytelling game called "Mad Libs: Consequences."

Your style:
- Treat every absurd premise with complete seriousness
- Write like a corporate HR memo describing a coup, or a nature documentary narrating a divorce
- Never acknowledge that anything is strange or funny
- Maintain perfect internal logic even when the content is ridiculous
- Reference previous events as if they were inevitable consequences

Your task:
- Weave the submitted words into an ongoing narrative
- Each round escalates the chaos while maintaining continuity
- Reference earlier submissions as "load-bearing" plot elements
- Attribute callbacks to specific players when dramatically appropriate (e.g., "As [Player]'s prophetic words foretold...")
`

function buildPrompt(context: StoryGenerationContext): string {
  const { round, totalRounds, chaosLevel, currentSubmissions, previousStories, previousSubmissions } = context

  let prompt = `ROUND ${round} of ${totalRounds} (Chaos Level: ${chaosLevel})\n\n`

  // Include previous story context
  if (previousStories.length > 0) {
    prompt += `=== STORY SO FAR ===\n`
    previousStories.forEach((story) => {
      prompt += `Round ${story.round}:\n${story.storyText}\n\n`
    })
  }

  // Include all previous submissions for callbacks
  if (previousSubmissions.length > 0) {
    prompt += `=== LOAD-BEARING WORDS FROM PREVIOUS ROUNDS (reference these!) ===\n`
    previousSubmissions.forEach((sub) => {
      prompt += `- "${sub.word}" (${sub.wordType}) - submitted by ${sub.playerName}\n`
    })
    prompt += `\n`
  }

  // Current round's words
  prompt += `=== WORDS TO INCORPORATE THIS ROUND ===\n`
  currentSubmissions.forEach((sub) => {
    prompt += `- "${sub.word}" (${sub.wordType}) - from ${sub.playerName}\n`
  })

  prompt += `\n=== INSTRUCTIONS ===\n`
  prompt += `Write the next 2-3 paragraphs of the story. `

  if (round === 1) {
    prompt += `This is the opening. Establish a setting and introduce the absurd premise with complete seriousness.`
  } else if (round === totalRounds) {
    prompt += `This is the FINALE. Reference as many previous words as possible. Bring all threads together in a spectacular, inevitable conclusion.`
  } else {
    prompt += `Escalate the situation. Reference at least 2-3 words from previous rounds as callbacks. Treat everything as inevitable consequences of earlier events.`
  }

  prompt += `\n\nRemember: Deadpan serious tone. No winking at the absurdity. Output ONLY the story paragraphs, no additional commentary.`

  return prompt
}

async function callGemini(systemPrompt: string, userPrompt: string): Promise<string> {
  const client = getClient()
  const model = 'gemini-2.0-flash'

  const contents = [
    {
      role: 'user' as const,
      parts: [{ text: `${systemPrompt}\n\n---\n\n${userPrompt}` }]
    }
  ]

  try {
    const response = await client.models.generateContentStream({
      model,
      contents
    })

    let fullText = ''
    for await (const chunk of response) {
      fullText += chunk.text || ''
    }

    return fullText.trim()
  } catch (error) {
    console.error('[Gemini] Error generating story:', error)
    throw new Error(`Failed to generate story: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// ============================================================================
// PUBLIC API
// ============================================================================
export async function generateStory(context: StoryGenerationContext): Promise<string> {
  const userPrompt = buildPrompt(context)
  return await callGemini(NARRATOR_SYSTEM_PROMPT, userPrompt)
}

// Export for testing/debugging
export { buildPrompt, NARRATOR_SYSTEM_PROMPT }
