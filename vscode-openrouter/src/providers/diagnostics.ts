import * as vscode from 'vscode'
import { detectModelIds } from '../lib/detector'
import { getCachedModels, getSnapshot } from '../lib/modelCache'
import { getFallbacksForRemovedModel } from '../lib/fallback'

// Price change threshold that triggers a warning (20%)
const PRICE_CHANGE_THRESHOLD = 0.2

export const diagnosticCollection = vscode.languages.createDiagnosticCollection('openrouter')

// Cache fallback results per model ID so we don't hammer the API on every keystroke
const fallbackCache = new Map<string, string[]>()

export async function updateDiagnostics(
  document: vscode.TextDocument,
  context: vscode.ExtensionContext,
): Promise<void> {
  const text = document.getText()
  const detected = detectModelIds(text)
  if (detected.length === 0) {
    diagnosticCollection.set(document.uri, [])
    return
  }

  const models = getCachedModels()
  const modelMap = new Map(models.map(m => [m.id, m]))
  const snapshot = getSnapshot(context)
  const diagnostics: vscode.Diagnostic[] = []

  for (const { id, startIndex, endIndex } of detected) {
    const startPos = document.positionAt(startIndex)
    const endPos = document.positionAt(endIndex)
    const range = new vscode.Range(startPos, endPos)

    if (!modelMap.has(id)) {
      // Model not in live catalog → red error squiggly
      let message = `"${id}" is not found in the OpenRouter catalog — it may have been removed or renamed.`

      if (!fallbackCache.has(id) && models.length > 0) {
        // Kick off async fetch; diagnostics will be refreshed when it resolves
        getFallbacksForRemovedModel(id, models, context).then(fallbacks => {
          const names = fallbacks.map(f => f.modelName).join(', ')
          fallbackCache.set(id, fallbacks.map(f => f.modelId))
          const cached = buildRemovedDiagnostic(range, id, names)
          // Re-emit diagnostics with enriched message
          const existing = diagnosticCollection.get(document.uri) ?? []
          const updated = [...existing].map(d =>
            d.range.isEqual(range) ? cached : d
          )
          diagnosticCollection.set(document.uri, updated)
        }).catch(() => { /* ignore */ })
      }

      const names = fallbackCache.has(id)
        ? fallbackCache.get(id)!.join(', ')
        : undefined

      diagnostics.push(buildRemovedDiagnostic(range, id, names))
      continue
    }

    // Model exists — check for significant price change vs snapshot
    const snapshotEntry = snapshot[id]
    if (snapshotEntry) {
      const oldPrice = Number(snapshotEntry.price)
      const newPrice = Number(modelMap.get(id)!.pricing.prompt)
      if (oldPrice > 0 && newPrice > 0) {
        const change = (newPrice - oldPrice) / oldPrice
        if (change > PRICE_CHANGE_THRESHOLD) {
          const pct = Math.round(change * 100)
          const diag = new vscode.Diagnostic(
            range,
            `"${id}" input price increased ${pct}% (was $${(oldPrice * 1e6).toFixed(4)}/M, now $${(newPrice * 1e6).toFixed(4)}/M).`,
            vscode.DiagnosticSeverity.Warning,
          )
          diag.source = 'OpenRouter Intelligence'
          diagnostics.push(diag)
        }
      }
    }
  }

  diagnosticCollection.set(document.uri, diagnostics)
}

function buildRemovedDiagnostic(
  range: vscode.Range,
  modelId: string,
  suggestedNames?: string,
): vscode.Diagnostic {
  const suffix = suggestedNames
    ? ` Suggested replacements: ${suggestedNames}.`
    : ''
  const diag = new vscode.Diagnostic(
    range,
    `"${modelId}" is not found in the OpenRouter catalog — it may have been removed or renamed.${suffix}`,
    vscode.DiagnosticSeverity.Error,
  )
  diag.source = 'OpenRouter Intelligence'
  return diag
}
