import type { Model, Recommendation, Priorities } from '../types/openrouter'

const FALLBACK: Recommendation[] = [
  { rank: 1, name: 'Claude Sonnet 4.5', id: 'anthropic/claude-sonnet-4-5', reason: 'Best balance of capability and speed for most production use cases. Excels at reasoning, code generation, and long-context tasks.', quality: 9, speed: 8, cost: 6 },
  { rank: 2, name: 'GPT-4o', id: 'openai/gpt-4o', reason: 'Strong multimodal capabilities and broad knowledge. Reliable for complex reasoning and diverse task types.', quality: 9, speed: 7, cost: 5 },
  { rank: 3, name: 'Claude Haiku 4.5', id: 'anthropic/claude-haiku-4-5', reason: 'Extremely fast and cost-efficient. Ideal for high-volume workloads where speed and cost matter most.', quality: 7, speed: 10, cost: 10 },
  { rank: 4, name: 'GPT-4o Mini', id: 'openai/gpt-4o-mini', reason: 'Low-cost option with solid performance on straightforward tasks. Good for prototyping and budget-sensitive deployments.', quality: 6, speed: 9, cost: 9 },
]

export async function getRecommendations(
  useCase: string,
  priorities: Priorities,
  models: Model[]
): Promise<Recommendation[]> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
  if (!apiKey) return FALLBACK

  const modelList = models.slice(0, 30).map(m => ({
    id: m.id,
    name: m.name,
    context: m.context_length,
    inputPrice: `$${(Number(m.pricing.prompt) * 1e6).toFixed(4)}/M tokens`,
  }))

  const prompt = `Use case: ${useCase}

Priorities (0-10 scale): Quality=${priorities.quality}, Speed=${priorities.speed}, Cost efficiency=${priorities.cost}

Available models:
${JSON.stringify(modelList, null, 2)}

Return ONLY a JSON array of exactly 4 objects with this shape:
[{"rank":1,"name":"...","id":"...","reason":"2-sentence reasoning","quality":0-10,"speed":0-10,"cost":0-10}]

Pick models that best match the use case and priority weights. reason must be 2 sentences max.`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: 'You are an expert AI model advisor for OpenRouter. You help developers pick the best LLM for their specific use case. Always return valid JSON only — no markdown, no explanation outside the array.',
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) return FALLBACK
    const data = await res.json()
    const text: string = data.content?.[0]?.text ?? ''
    const match = text.match(/\[[\s\S]*\]/)
    if (!match) return FALLBACK
    const parsed = JSON.parse(match[0]) as Recommendation[]
    return Array.isArray(parsed) && parsed.length >= 4 ? parsed.slice(0, 4) : FALLBACK
  } catch {
    return FALLBACK
  }
}
