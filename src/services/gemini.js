import { GoogleGenAI } from '@google/genai'

// Initialize Gemini client
let ai = null

function getClient() {
  if (!ai) {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    if (!apiKey) {
      throw new Error('VITE_GEMINI_API_KEY environment variable is not set')
    }
    ai = new GoogleGenAI({ apiKey })
  }
  return ai
}

/**
 * Generate an aggregated description from multiple team inputs
 * @param {Array} messages - Array of message objects with author, content, timestamp
 * @param {String} serviceLineName - Name of the service line
 * @returns {Promise<String>} - HTML formatted aggregated description
 */
export async function aggregateDescriptions(messages, serviceLineName) {
  if (!messages || messages.length === 0) {
    return '<p class="text-grey-7"><em>No descriptions available to summarize.</em></p>'
  }

  const client = getClient()
  const model = 'gemini-flash-latest'

  // Build context from messages
  const messagesText = messages
    .map((msg, idx) => `[Input ${idx + 1}] Author: ${msg.author}\nContent: ${msg.content}`)
    .join('\n\n')

  const prompt = `You are analyzing team descriptions for a service line called "${serviceLineName}".

Below are ${messages.length} team member contribution(s) describing this service line:

${messagesText}

Please analyze these inputs and generate a comprehensive, professional summary in HTML format. Your output should include:

1. **Overview Section**: A 2-3 sentence executive summary of what this service line does
2. **Key Focus Areas**: Extract and list the main themes, technologies, or capabilities mentioned (as styled tags)
3. **Key Insights**: Extract 4-6 of the most important insights, capabilities, or value propositions from the team inputs (as a bulleted list)
4. **Contributors**: List who contributed (just names)

Format your response as clean HTML using these classes for styling:
- Wrap everything in: <div class="summary-content">
- Sections: <div class="summary-section">
- Section titles: <div class="summary-section-title">Title</div>
- Theme tags: <div class="theme-tags"><span class="theme-tag">tag1</span><span class="theme-tag">tag2</span></div>
- Insights list: <ul class="insights-list"><li>insight with <span class="insight-author">— Author</span></li></ul>
- Contributors: <p class="contributors-list">Name1, Name2, Name3</p>

Important guidelines:
- Keep it concise and professional
- Extract real value and insights, don't just repeat
- Attribute key insights to their authors when possible
- Focus on capabilities, technologies, and business value
- Use simple, clean HTML (no inline styles)
- Do NOT include markdown formatting (no ** or __ or #)

Generate the HTML summary now:`

  const contents = [
    {
      role: 'user',
      parts: [{ text: prompt }]
    }
  ]

  const config = {
    thinkingConfig: {
      thinkingBudget: -1
    }
  }

  try {
    const response = await client.models.generateContentStream({
      model,
      config,
      contents
    })

    let fullText = ''
    for await (const chunk of response) {
      fullText += chunk.text || ''
    }

    return fullText.trim()
  } catch (error) {
    console.error('[Gemini] Error aggregating descriptions:', error)
    throw new Error(`Failed to generate summary: ${error.message}`)
  }
}

/**
 * Search and match service lines based on business requirements
 * @param {String} requirements - User's business requirements text
 * @param {Array} serviceData - Full service line data
 * @param {Array} descriptions - All descriptions from all service lines
 * @returns {Promise<Array>} - Array of recommendations with scores and reasoning
 */
export async function searchServiceLines(requirements, serviceData, descriptions) {
  if (!requirements || requirements.trim().length < 10) {
    throw new Error('Requirements must be at least 10 characters')
  }

  const client = getClient()
  const model = 'gemini-flash-latest'

  // Build a structured representation of service lines with their descriptions
  const serviceLinesContext = serviceData.slice(0, 100).map((row, idx) => {
    const l1 = row['Service Line (L1)'] || ''
    const l2 = row['Capability (L2)'] || ''
    const l3 = row['Solution Set (L3)'] || ''
    const l4 = row['Sub-function (L4)'] || ''

    if (!l1 || l1 === '—') return null

    // Build path
    const pathParts = [l1, l2, l3, l4].filter(x => x && x !== '—')
    const pathKey = pathParts.join('__')

    // Find related descriptions
    const relatedDescs = descriptions
      .filter(desc => desc.pathKey === pathKey)
      .map(desc => `  - ${desc.author}: ${desc.content.substring(0, 200)}`)
      .join('\n')

    return `[${idx + 1}] ${pathParts.join(' > ')}
Leaders: L1=${row['Service Line (L1) Leader'] || 'TBD'}, L2=${row['Capability (L2) Leader'] || 'TBD'}
Descriptions:
${relatedDescs || '  (No descriptions available)'}
`
  }).filter(Boolean).join('\n---\n')

  const prompt = `You are a service line recommendation engine. A user has described their business requirements, and you need to match them to the most relevant service lines.

USER REQUIREMENTS:
${requirements}

AVAILABLE SERVICE LINES (with team descriptions):
${serviceLinesContext}

Analyze the user's requirements and identify the TOP 6 most relevant service lines. For each recommendation, provide:
1. The service line index number (from the list above)
2. A relevance score (0-99, where 99 is perfect match)
3. A clear, specific reason why this service line matches the requirements

Format your response as a JSON array ONLY (no other text). Each item should have:
{
  "index": <number>,
  "score": <number 0-99>,
  "reasoning": "<specific 1-2 sentence explanation>"
}

Return ONLY the JSON array, no additional text or markdown formatting. Example:
[{"index": 5, "score": 95, "reasoning": "..."}, {"index": 12, "score": 87, "reasoning": "..."}]`

  const contents = [
    {
      role: 'user',
      parts: [{ text: prompt }]
    }
  ]

  const config = {
    thinkingConfig: {
      thinkingBudget: -1
    }
  }

  try {
    const response = await client.models.generateContentStream({
      model,
      config,
      contents
    })

    let fullText = ''
    for await (const chunk of response) {
      fullText += chunk.text || ''
    }

    // Extract JSON from response (in case there's extra text)
    let jsonText = fullText.trim()
    const jsonMatch = jsonText.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      jsonText = jsonMatch[0]
    }

    const matches = JSON.parse(jsonText)

    // Build recommendation objects from the matches
    const recommendations = matches
      .filter(match => match.index && match.score > 0)
      .map(match => {
        const idx = match.index - 1 // Convert to 0-based
        if (idx < 0 || idx >= serviceData.length) return null

        const row = serviceData[idx]
        const l1 = row['Service Line (L1)'] || ''
        const l2 = row['Capability (L2)'] || ''
        const l3 = row['Solution Set (L3)'] || ''
        const l4 = row['Sub-function (L4)'] || ''

        const pathParts = [l1, l2, l3, l4].filter(x => x && x !== '—')
        const pathKey = pathParts.join('__')
        const fullPath = pathParts.join(' > ')

        // Get leaders
        const leaders = []
        if (row['Service Line (L1) Leader']) {
          leaders.push({ level: 'L1', name: row['Service Line (L1) Leader'] })
        }
        if (l2 && l2 !== '—' && row['Capability (L2) Leader']) {
          leaders.push({ level: 'L2', name: row['Capability (L2) Leader'] })
        }
        if (l3 && l3 !== '—' && row['Solution Set (L3) Leader']) {
          leaders.push({ level: 'L3', name: row['Solution Set (L3) Leader'] })
        }
        if (l4 && l4 !== '—' && row['Sub-function Leader']) {
          leaders.push({ level: 'L4', name: row['Sub-function Leader'] })
        }

        // Get related descriptions
        const relatedDescriptions = descriptions.filter(desc => desc.pathKey === pathKey)

        return {
          serviceLine: pathParts[pathParts.length - 1],
          fullPath,
          relevanceScore: Math.min(match.score, 99),
          reasoning: match.reasoning,
          leaders,
          descriptions: relatedDescriptions,
          pathParts,
          rawRow: row
        }
      })
      .filter(Boolean)

    return recommendations
  } catch (error) {
    console.error('[Gemini] Error searching service lines:', error)
    throw new Error(`Failed to search service lines: ${error.message}`)
  }
}
