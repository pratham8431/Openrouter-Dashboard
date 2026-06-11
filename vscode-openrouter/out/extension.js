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
async function activate(context) {
    // Fetch live model catalog on activation
    await (0, modelCache_1.initCache)(context);
    // Register hover provider for all languages
    context.subscriptions.push(vscode.languages.registerHoverProvider({ scheme: 'file' }, (0, hover_1.createHoverProvider)(context)));
    // Run diagnostics on the currently open editors
    for (const editor of vscode.window.visibleTextEditors) {
        (0, diagnostics_1.updateDiagnostics)(editor.document, context);
    }
    // Re-run diagnostics when a file is opened or saved
    context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(doc => (0, diagnostics_1.updateDiagnostics)(doc, context)), vscode.workspace.onDidSaveTextDocument(doc => (0, diagnostics_1.updateDiagnostics)(doc, context)), vscode.window.onDidChangeActiveTextEditor(editor => {
        if (editor)
            (0, diagnostics_1.updateDiagnostics)(editor.document, context);
    }));
    // Command: refresh model catalog manually
    context.subscriptions.push(vscode.commands.registerCommand('openrouter.refreshModels', async () => {
        await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'OR Intelligence: refreshing model catalog…' }, async () => {
            await (0, modelCache_1.forceRefresh)(context);
            for (const editor of vscode.window.visibleTextEditors) {
                (0, diagnostics_1.updateDiagnostics)(editor.document, context);
            }
        });
        vscode.window.showInformationMessage('OR Intelligence: model catalog refreshed.');
    }));
    // Placeholder command for Feature 3 (workspace cost scanner) — registered so the
    // command palette doesn't show an error; full implementation comes next.
    context.subscriptions.push(vscode.commands.registerCommand('openrouter.scanWorkspace', () => {
        vscode.window.showInformationMessage('OR Intelligence: Workspace Cost Scanner coming soon (Feature 3).');
    }));
    context.subscriptions.push(diagnostics_1.diagnosticCollection);
}
function deactivate() {
    (0, modelCache_1.disposeCache)();
}
//# sourceMappingURL=extension.js.map