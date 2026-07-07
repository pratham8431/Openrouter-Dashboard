import * as vscode from 'vscode'
import { getCachedModels } from '../lib/modelCache'

// Triggers when the user types a quote after common model-key patterns
const TRIGGER_PATTERN = /(?:model|MODEL|modelId|model_id|engine)\s*[:=]\s*["'`]([^"'`]*)$/

export const completionProvider: vscode.CompletionItemProvider = {
  provideCompletionItems(document, position) {
    const linePrefix = document.getText(
      new vscode.Range(new vscode.Position(position.line, 0), position),
    )

    // Also fire when user types a bare quote that looks like it could be a model ID
    const isModelContext = TRIGGER_PATTERN.test(linePrefix)
    const isOpenQuote = /["'`][a-z0-9_-]*$/.test(linePrefix)
    if (!isModelContext && !isOpenQuote) return []

    const models = getCachedModels()
    // Top 20 by input price ascending (cheapest first as default sort)
    const top20 = [...models]
      .filter(m => Number(m.pricing.prompt) > 0)
      .sort((a, b) => Number(a.pricing.prompt) - Number(b.pricing.prompt))
      .slice(0, 20)

    return top20.map((m, idx) => {
      const inputPerM = (Number(m.pricing.prompt) * 1e6).toFixed(4)
      const outputPerM = (Number(m.pricing.completion) * 1e6).toFixed(4)
      const ctx = m.context_length >= 1_000_000
        ? `${(m.context_length / 1_000_000).toFixed(1)}M`
        : `${Math.round(m.context_length / 1000)}k`

      const item = new vscode.CompletionItem(m.id, vscode.CompletionItemKind.Value)
      item.detail = `$${inputPerM}/M in · $${outputPerM}/M out · ${ctx} ctx`
      item.documentation = new vscode.MarkdownString(
        `**${m.name}**\n\n` +
        `| | |\n|---|---|\n` +
        `| Input | $${inputPerM}/M tokens |\n` +
        `| Output | $${outputPerM}/M tokens |\n` +
        `| Context | ${ctx} tokens |\n` +
        (m.description ? `\n${m.description.slice(0, 120)}` : ''),
      )
      // Insert just the model ID (not the surrounding quotes — they're already there)
      item.insertText = m.id
      // Sort cheapest first
      item.sortText = String(idx).padStart(4, '0')
      return item
    })
  },
}
