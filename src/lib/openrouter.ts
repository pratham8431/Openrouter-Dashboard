import type { Model } from '../types/openrouter'

const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models'

const SAMPLE_MODELS: Model[] = [
  { id: 'anthropic/claude-sonnet-4-5', name: 'Claude Sonnet 4.5', context_length: 200000, pricing: { prompt: '0.000003', completion: '0.000015' } },
  { id: 'anthropic/claude-haiku-4-5', name: 'Claude Haiku 4.5', context_length: 200000, pricing: { prompt: '0.00000025', completion: '0.00000125' } },
  { id: 'openai/gpt-4o', name: 'GPT-4o', context_length: 128000, pricing: { prompt: '0.000005', completion: '0.000015' } },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', context_length: 128000, pricing: { prompt: '0.00000015', completion: '0.0000006' } },
  { id: 'google/gemini-pro-1.5', name: 'Gemini Pro 1.5', context_length: 1000000, pricing: { prompt: '0.0000035', completion: '0.0000105' } },
  { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B Instruct', context_length: 131072, pricing: { prompt: '0.00000059', completion: '0.00000079' } },
  { id: 'mistralai/mistral-large', name: 'Mistral Large', context_length: 32768, pricing: { prompt: '0.000003', completion: '0.000009' } },
  { id: 'cohere/command-r-plus', name: 'Command R+', context_length: 128000, pricing: { prompt: '0.000003', completion: '0.000015' } },
]

export async function fetchModels(): Promise<Model[]> {
  try {
    const res = await fetch(OPENROUTER_MODELS_URL)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()
    return (json.data as Model[]).filter(m => m.id && m.name)
  } catch {
    return SAMPLE_MODELS
  }
}
