// Same detection primitive as vscode-openrouter/src/lib/detector.ts —
// matches quoted OpenRouter-style model IDs: "provider/model-name"
const MODEL_ID_REGEX = /["'`]([a-z0-9_-]+\/[a-z0-9._:+-]+)["'`]/g

export function detectModelIds(text) {
  const ids = new Set()
  let match
  MODEL_ID_REGEX.lastIndex = 0
  while ((match = MODEL_ID_REGEX.exec(text)) !== null) {
    ids.add(match[1])
  }
  return [...ids]
}
