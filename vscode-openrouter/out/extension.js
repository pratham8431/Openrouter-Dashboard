"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const modelCache_1 = require("./lib/modelCache");
const diagnostics_1 = require("./providers/diagnostics");
const hover_1 = require("./providers/hover");
const completion_1 = require("./providers/completion");
const codeAction_1 = require("./providers/codeAction");
const costScanner_1 = require("./panels/costScanner");
async function activate(context) {
    await (0, modelCache_1.initCache)(context);
    // Feature 2 — hover tooltips (all file types)
    context.subscriptions.push(vscode.languages.registerHoverProvider({ scheme: 'file' }, (0, hover_1.createHoverProvider)(context)));
    // Feature 4 — model ID autocomplete (all file types, trigger on quotes)
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ scheme: 'file' }, completion_1.completionProvider, '"', "'", '`'));
    // Feature 5 — right-click "Replace model" code action + backing command
    context.subscriptions.push(vscode.languages.registerCodeActionsProvider({ scheme: 'file' }, codeAction_1.codeActionProvider, { providedCodeActionKinds: [vscode.CodeActionKind.QuickFix.append('openrouter')] }), (0, codeAction_1.registerReplaceModelCommand)(context));
    // Feature 1 — diagnostics: run on already-open editors
    for (const editor of vscode.window.visibleTextEditors) {
        (0, diagnostics_1.updateDiagnostics)(editor.document, context);
    }
    context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(doc => (0, diagnostics_1.updateDiagnostics)(doc, context)), vscode.workspace.onDidSaveTextDocument(doc => (0, diagnostics_1.updateDiagnostics)(doc, context)), vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor)
            (0, diagnostics_1.updateDiagnostics)(editor.document, context);
    }));
    // Command — manual catalog refresh
    context.subscriptions.push(vscode.commands.registerCommand('openrouter.refreshModels', async () => {
        await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'OR Intelligence: refreshing model catalog…' }, async () => {
            await (0, modelCache_1.forceRefresh)(context);
            for (const editor of vscode.window.visibleTextEditors) {
                (0, diagnostics_1.updateDiagnostics)(editor.document, context);
            }
        });
        vscode.window.showInformationMessage('OR Intelligence: model catalog refreshed.');
    }));
    // Feature 3 — workspace cost scanner
    context.subscriptions.push(vscode.commands.registerCommand('openrouter.scanWorkspace', () => (0, costScanner_1.runWorkspaceCostScan)(context)));
    context.subscriptions.push(diagnostics_1.diagnosticCollection);
}
function deactivate() {
    (0, modelCache_1.disposeCache)();
}
//# sourceMappingURL=extension.js.map