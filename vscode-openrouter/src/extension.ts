import * as vscode from 'vscode'
import { initCache, forceRefresh, disposeCache } from './lib/modelCache'
import { diagnosticCollection, updateDiagnostics } from './providers/diagnostics'
import { createHoverProvider } from './providers/hover'
import { completionProvider } from './providers/completion'
import { codeActionProvider, registerReplaceModelCommand } from './providers/codeAction'
import { runWorkspaceCostScan } from './panels/costScanner'

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  await initCache(context)

  // Feature 2 — hover tooltips (all file types)
  context.subscriptions.push(
    vscode.languages.registerHoverProvider({ scheme: 'file' }, createHoverProvider(context)),
  )

  // Feature 4 — model ID autocomplete (all file types, trigger on quotes)
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      { scheme: 'file' },
      completionProvider,
      '"', "'", '`',
    ),
  )

  // Feature 5 — right-click "Replace model" code action + backing command
  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider(
      { scheme: 'file' },
      codeActionProvider,
      { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix.append('openrouter')] },
    ),
    registerReplaceModelCommand(context),
  )

  // Feature 1 — diagnostics: run on already-open editors
  for (const editor of vscode.window.visibleTextEditors) {
    updateDiagnostics(editor.document, context)
  }

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(doc => updateDiagnostics(doc, context)),
    vscode.workspace.onDidSaveTextDocument(doc => updateDiagnostics(doc, context)),
    vscode.window.onDidChangeActiveTextEditor(editor => {
      if (editor) updateDiagnostics(editor.document, context)
    }),
  )

  // Command — manual catalog refresh
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

  // Feature 3 — workspace cost scanner
  context.subscriptions.push(
    vscode.commands.registerCommand('openrouter.scanWorkspace', () =>
      runWorkspaceCostScan(context),
    ),
  )

  context.subscriptions.push(diagnosticCollection)
}

export function deactivate(): void {
  disposeCache()
}
