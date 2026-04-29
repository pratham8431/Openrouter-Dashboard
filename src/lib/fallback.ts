import type { Model, WatchRule, FallbackResult } from '../types/openrouter'

const HARDCODED_FALLBACKS: Record<string, FallbackResult> = {
  default: {
    modelId: 'google/gemini-flash-1.5',
    modelName: 'Gemini Flash 1.5',
    reason: 'Highly cost-efficient with strong general capabilities. Excellent speed-to-quality ratio for most production workloads.',
    quality: 8, speed: 9, cost: 9,
  },
}

export async function getFallbackRecommendation(
  changedModel: { id: string; name: string; changeDetail?: string },
  rule: WatchRule,
  allModels: Model[],
  monthlyVolume?: number,
  avgOutputTokens?: number,
): Promise<FallbackResult> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
  if (!apiKey) return buildFallback(HARDCODED_FALLBACKS.default, allModels, monthlyVolume, avgOutputTokens)

  const candidates = allModels
    .filter(m => m.id !== changedModel.id && Number(m.pricing.prompt) > 0)
    .slice(0, 40)
    .map(m => ({
      id: m.id,
      name: m.name,
      context: m.context_length,
      inputPrice: `$${(Number(m.pricing.prompt) * 1e6).toFixed(4)}/M`,
    }))

  const prompt = `A developer's watched model has changed and they need a fallback recommendation.

Changed model: ${changedModel.name} (${changedModel.id})
Change: ${changedModel.changeDetail ?? 'price increase or removal'}

Their use case: ${rule.useCase}
Priorities (0-10): Quality=${rule.priorities.quality}, Speed=${rule.priorities.speed}, Cost efficiency=${rule.priorities.cost}
${rule.priceThreshold ? `Price threshold: they want to stay under $${rule.priceThreshold}/M tokens` : ''}

Available replacement models:
${JSON.stringify(candidates, null, 2)}

Return ONLY a single JSON object (not an array):
{"modelId":"...","modelName":"...","reason":"2-sentence max explanation of why this is the best switch","quality":0-10,"speed":0-10,"cost":0-10}

Pick the single best replacement. Do not include ${changedModel.id}.`

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
        max_tokens: 400,
        system: 'You are an AI model advisor. Return only valid JSON, no markdown.',
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) return buildFallback(HARDCODED_FALLBACKS.default, allModels, monthlyVolume, avgOutputTokens)
    const data = await res.json()
    const text: string = data.content?.[0]?.text ?? ''
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return buildFallback(HARDCODED_FALLBACKS.default, allModels, monthlyVolume, avgOutputTokens)

    const parsed = JSON.parse(match[0]) as FallbackResult
    return buildFallback(parsed, allModels, monthlyVolume, avgOutputTokens)
  } catch {
    return buildFallback(HARDCODED_FALLBACKS.default, allModels, monthlyVolume, avgOutputTokens)
  }
}

function buildFallback(
  result: FallbackResult,
  allModels: Model[],
  monthlyVolume?: number,
  avgOutputTokens?: number,
): FallbackResult {
  if (!monthlyVolume || !avgOutputTokens) return result
  const model = allModels.find(m => m.id === result.modelId)
  if (!model) return result
  // Estimate using 200 input tokens as a baseline — real prompt tokens unknown here
  const perReq = 200 * Number(model.pricing.prompt) + avgOutputTokens * Number(model.pricing.completion)
  return { ...result, monthlyEstimate: Math.round(perReq * monthlyVolume * 100) / 100 }
}
