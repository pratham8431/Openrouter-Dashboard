// Same "cheaper alternative" heuristic used by the VS Code extension's
// hover/code-action providers: strictly cheaper, at least half the context.
function findCheaperAlternative(current, allModels) {
  const currentPrice = Number(current.pricing.prompt)
  if (!currentPrice) return null

  return allModels
    .filter(m => m.id !== current.id && Number(m.pricing.prompt) > 0)
    .filter(m => m.context_length >= current.context_length * 0.5)
    .filter(m => Number(m.pricing.prompt) < currentPrice)
    .sort((a, b) => Number(a.pricing.prompt) - Number(b.pricing.prompt))[0] ?? null
}

// Classifies each distinct model ID found in the wild against the live catalog:
//   dead       — not in the catalog at all (removed, renamed, or never real)
//   suboptimal — in the catalog, but a strictly cheaper same-capability model exists today
//   ok         — in the catalog, no cheaper alternative found
export function classifyIds(modelIds, allModels) {
  const catalogMap = new Map(allModels.map(m => [m.id, m]))

  return modelIds.map(id => {
    const model = catalogMap.get(id)
    if (!model) return { id, status: 'dead', cheaperAlternative: null }

    const alt = findCheaperAlternative(model, allModels)
    return {
      id,
      status: alt ? 'suboptimal' : 'ok',
      cheaperAlternative: alt ? { id: alt.id, name: alt.name } : null,
    }
  })
}
