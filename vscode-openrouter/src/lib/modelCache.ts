import * as vscode from 'vscode'
import { fetchModels } from './openrouter'
import type { Model, ModelSnapshot } from './types'

const REFRESH_INTERVAL_MS = 60 * 60 * 1000 // 60 minutes
const SNAPSHOT_KEY = 'or_model_snapshot'

let cachedModels: Model[] = []
let cacheTimestamp = 0
let refreshTimer: ReturnType<typeof setInterval> | undefined

export function getCachedModels(): Model[] {
  return cachedModels
}

export async function initCache(context: vscode.ExtensionContext): Promise<Model[]> {
  cachedModels = await fetchModels()
  cacheTimestamp = Date.now()

  if (!context.globalState.get<ModelSnapshot>(SNAPSHOT_KEY)) {
    saveSnapshot(context, cachedModels)
  }

  refreshTimer = setInterval(async () => {
    cachedModels = await fetchModels()
    cacheTimestamp = Date.now()
    saveSnapshot(context, cachedModels)
  }, REFRESH_INTERVAL_MS)

  return cachedModels
}

export async function forceRefresh(context: vscode.ExtensionContext): Promise<Model[]> {
  cachedModels = await fetchModels()
  cacheTimestamp = Date.now()
  saveSnapshot(context, cachedModels)
  return cachedModels
}

export function getSnapshot(context: vscode.ExtensionContext): ModelSnapshot {
  return context.globalState.get<ModelSnapshot>(SNAPSHOT_KEY) ?? {}
}

export function saveSnapshot(context: vscode.ExtensionContext, models: Model[]): void {
  const snapshot: ModelSnapshot = {}
  for (const m of models) {
    snapshot[m.id] = { price: m.pricing.prompt, ctx: m.context_length }
  }
  context.globalState.update(SNAPSHOT_KEY, snapshot)
}

export function disposeCache(): void {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = undefined
  }
}

export function getCacheAge(): number {
  return cacheTimestamp ? Math.floor((Date.now() - cacheTimestamp) / 1000) : -1
}
