import type { Model, ModelChange, ModelSnapshot, ModelWithStatus } from '../types/openrouter'

const SNAPSHOT_KEY = 'or_snapshot'

export function detectChanges(freshModels: Model[]): { changes: ModelChange[]; modelsWithStatus: ModelWithStatus[] } {
  const changes: ModelChange[] = []
  let snapshot: ModelSnapshot | null = null

  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY)
    if (raw) snapshot = JSON.parse(raw)
  } catch {
    // localStorage unavailable — skip diff
  }

  const modelsWithStatus: ModelWithStatus[] = freshModels.map(m => {
    if (!snapshot) return { ...m, status: 'stable' as const }
    if (!snapshot[m.id]) {
      changes.push({ type: 'new', model: m.name, timestamp: new Date().toISOString() })
      return { ...m, status: 'new' as const }
    }
    if (snapshot[m.id].price !== m.pricing.prompt) {
      changes.push({
        type: 'price',
        model: m.name,
        detail: `$${Number(snapshot[m.id].price) * 1e6}/M → $${Number(m.pricing.prompt) * 1e6}/M`,
        timestamp: new Date().toISOString(),
      })
      return { ...m, status: 'changed' as const }
    }
    return { ...m, status: 'stable' as const }
  })

  if (snapshot) {
    const freshIds = new Set(freshModels.map(m => m.id))
    for (const id of Object.keys(snapshot)) {
      if (!freshIds.has(id)) {
        changes.push({ type: 'removed', model: id, timestamp: new Date().toISOString() })
      }
    }
  }

  // Save new snapshot
  const newSnapshot: ModelSnapshot = {}
  freshModels.forEach(m => {
    newSnapshot[m.id] = { price: m.pricing.prompt, ctx: m.context_length }
  })
  try {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(newSnapshot))
  } catch {
    // ignore quota errors
  }

  return { changes, modelsWithStatus }
}

export function clearSnapshot() {
  try { localStorage.removeItem(SNAPSHOT_KEY) } catch { /* noop */ }
}
