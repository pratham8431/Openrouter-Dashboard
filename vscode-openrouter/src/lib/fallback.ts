import * as vscode from 'vscode'
import type { Model, FallbackResult } from './types'

const DEFAULT_FALLBACK: FallbackResult = {
  modelId: 'google/gemini-flash-1.5',
  modelName: 'Gemini Flash 1.5',
  reason: 'Highly cost-efficient with strong general capabilities. Excellent speed-to-quality ratio for most production workloads.',
  quality: 8, speed: 9, cost: 9,
}

export async function getFallbacksForRemovedModel(
  removedModelId: string,
  allModels: Model[],
  context: vscode.ExtensionContext,
  count = 3,
): Promise<FallbackResult[]> {
  const apiKey = vscode.workspace.getConfiguration('openrouter').get<string>('anthropicApiKey')
  if (!apiKey) return [DEFAULT_FALLBACK]

  const candidates = allModels
    .filter(m => m.id !== removedModelId && Number(m.pricing.prompt) > 0)
    .slice(0, 40)
    .map(m => ({
      id: m.id,
      name: m.name,
      context: m.context_length,
      inputPrice: `$${(Number(m.pricing.prompt) * 1e6).toFixed(4)}/M`,
    }))

  const prompt = `A model ID "${removedModelId}" was found in a developer's code but is no longer available on OpenRouter.

Available replacement models:
${JSON.stringify(candidates, null, 2)}

Return ONLY a JSON array of exactly ${count} replacement objects, best first:
[{"modelId":"...","modelName":"...","reason":"1-sentence why","quality":0-10,"speed":0-10,"cost":0-10}]

Do not include ${removedModelId}.`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 600,
        system: 'You are an AI model advisor. Return only valid JSON, no markdown.',
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) return [DEFAULT_FALLBACK]
    const data = await res.json() as { content?: { text?: string }[] }
    const text = data.content?.[0]?.text ?? ''
    const match = text.match(/\[[\s\S]*\]/)
    if (!match) return [DEFAULT_FALLBACK]

    return JSON.parse(match[0]) as FallbackResult[]
  } catch {
    return [DEFAULT_FALLBACK]
  }
}
