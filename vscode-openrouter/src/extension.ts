import * as vscode from 'vscode'
import { initCache, forceRefresh, disposeCache } from './lib/modelCache'
import { diagnosticCollection, updateDiagnostics } from './providers/diagnostics'
import { createHoverProvider } from './providers/hover'

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  // Fetch live model catalog on activation
  await initCache(context)

  // Register hover provider for all languages
  context.subscriptions.push(
    vscode.languages.registerHoverProvider({ scheme: 'file' }, createHoverProvider(context)),
  )

  // Run diagnostics on the currently open editors
  for (const editor of vscode.window.visibleTextEditors) {
    updateDiagnostics(editor.document, context)
  }

  // Re-run diagnostics when a file is opened or saved
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(doc => updateDiagnostics(doc, context)),
    vscode.workspace.onDidSaveTextDocument(doc => updateDiagnostics(doc, context)),
    vscode.window.onDidChangeActiveTextEditor(editor => {
      if (editor) updateDiagnostics(editor.document, context)
    }),
  )

  // Command: refresh model catalog manually
  context.subscriptions.push(
    vscode.commands.registerCommand('openrouter.refreshModels', async () => {
      await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: 'OR Intelligence: refreshing model catalog…' },
        async () => {
          await forceRefresh(context)
          for (const editor of vscode.window.visibleTextEditors) {
            updateDiagnostics(editor.document, context)
          }
        },
      )
      vscode.window.showInformationMessage('OR Intelligence: model catalog refreshed.')
    }),
  )

  // Placeholder command for Feature 3 (workspace cost scanner) — registered so the
  // command palette doesn't show an error; full implementation comes next.
  context.subscriptions.push(
    vscode.commands.registerCommand('openrouter.scanWorkspace', () => {
      vscode.window.showInformationMessage('OR Intelligence: Workspace Cost Scanner coming soon (Feature 3).')
    }),
  )

  context.subscriptions.push(diagnosticCollection)
}

export function deactivate(): void {
  disposeCache()
}
