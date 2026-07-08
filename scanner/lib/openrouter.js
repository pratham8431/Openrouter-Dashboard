const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models'

export async function fetchModels() {
  const res = await fetch(OPENROUTER_MODELS_URL)
  if (!res.ok) throw new Error(`OpenRouter API ${res.status}`)
  const json = await res.json()
  return (json.data ?? []).filter(m => m.id && m.name)
}
