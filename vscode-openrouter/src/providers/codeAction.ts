import * as vscode from 'vscode'
import { detectModelIds } from '../lib/detector'
import { getCachedModels } from '../lib/modelCache'
import type { Model } from '../lib/types'

const ACTION_KIND = vscode.CodeActionKind.QuickFix.append('openrouter')

export const codeActionProvider: vscode.CodeActionProvider = {
  provideCodeActions(document, range) {
    const text = document.getText()
    const offset = document.offsetAt(range.start)
    const detected = detectModelIds(text)
    const hit = detected.find(d => offset >= d.startIndex && offset <= d.endIndex)
    if (!hit) return []

    const action = new vscode.CodeAction(
      `OR Intelligence: Replace "${hit.id}"`,
      ACTION_KIND,
    )
    action.command = {
      command: 'openrouter.replaceModel',
      title: 'Replace model',
      arguments: [document.uri, hit.id, hit.startIndex, hit.endIndex],
    }
    return [action]
  },
}

export function registerReplaceModelCommand(context: vscode.ExtensionContext): vscode.Disposable {
  return vscode.commands.registerCommand(
    'openrouter.replaceModel',
    async (
      uri: vscode.Uri,
      currentId: string,
      startIndex: number,
      endIndex: number,
    ) => {
      const models = getCachedModels()
      const current = models.find(m => m.id === currentId)
      const currentPrice = current ? Number(current.pricing.prompt) : Infinity

      // Build ranked alternatives: cheaper models with ≥50% context, sorted by price
      const alternatives = models
        .filter(m => m.id !== currentId && Number(m.pricing.prompt) > 0)
        .filter(m => !current || m.context_length >= current.context_length * 0.5)
        .sort((a, b) => {
          // Prefer cheaper; break ties by larger context
          const priceDiff = Number(a.pricing.prompt) - Number(b.pricing.prompt)
          return priceDiff !== 0 ? priceDiff : b.context_length - a.context_length
        })
        .slice(0, 15)

      if (alternatives.length === 0) {
        vscode.window.showInformationMessage('No alternative models found in catalog.')
        return
      }

      const picks = alternatives.map(m => {
        const inputPerM = (Number(m.pricing.prompt) * 1e6).toFixed(4)
        const ctx = m.context_length >= 1_000_000
          ? `${(m.context_length / 1_000_000).toFixed(1)}M`
          : `${Math.round(m.context_length / 1000)}k`
        const cheaper = Number(m.pricing.prompt) < currentPrice
        const savingsPct = currentPrice > 0
          ? Math.round((1 - Number(m.pricing.prompt) / currentPrice) * 100)
          : 0

        return {
          label: m.id,
          description: `$${inputPerM}/M · ${ctx} ctx`,
          detail: cheaper && savingsPct > 0
            ? `💚 ${savingsPct}% cheaper than ${currentId}`
            : m.name,
          model: m,
        }
      })

      const chosen = await vscode.window.showQuickPick(picks, {
        title: `Replace "${currentId}" with…`,
        placeHolder: 'Select a model (sorted by price, cheapest first)',
        matchOnDescription: true,
        matchOnDetail: true,
      })

      if (!chosen) return

      // Apply the in-place edit
      const doc = await vscode.workspace.openTextDocument(uri)
      const startPos = doc.positionAt(startIndex)
      const endPos = doc.positionAt(endIndex)
      const edit = new vscode.WorkspaceEdit()
      edit.replace(uri, new vscode.Range(startPos, endPos), chosen.model.id)
      await vscode.workspace.applyEdit(edit)
    },
  )
}
