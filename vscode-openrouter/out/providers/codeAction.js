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
exports.codeActionProvider = void 0;
exports.registerReplaceModelCommand = registerReplaceModelCommand;
const vscode = __importStar(require("vscode"));
const detector_1 = require("../lib/detector");
const modelCache_1 = require("../lib/modelCache");
const ACTION_KIND = vscode.CodeActionKind.QuickFix.append('openrouter');
exports.codeActionProvider = {
    provideCodeActions(document, range) {
        const text = document.getText();
        const offset = document.offsetAt(range.start);
        const detected = (0, detector_1.detectModelIds)(text);
        const hit = detected.find(d => offset >= d.startIndex && offset <= d.endIndex);
        if (!hit)
            return [];
        const action = new vscode.CodeAction(`OR Intelligence: Replace "${hit.id}"`, ACTION_KIND);
        action.command = {
            command: 'openrouter.replaceModel',
            title: 'Replace model',
            arguments: [document.uri, hit.id, hit.startIndex, hit.endIndex],
        };
        return [action];
    },
};
function registerReplaceModelCommand(context) {
    return vscode.commands.registerCommand('openrouter.replaceModel', async (uri, currentId, startIndex, endIndex) => {
        const models = (0, modelCache_1.getCachedModels)();
        const current = models.find(m => m.id === currentId);
        const currentPrice = current ? Number(current.pricing.prompt) : Infinity;
        // Build ranked alternatives: cheaper models with ≥50% context, sorted by price
        const alternatives = models
            .filter(m => m.id !== currentId && Number(m.pricing.prompt) > 0)
            .filter(m => !current || m.context_length >= current.context_length * 0.5)
            .sort((a, b) => {
            // Prefer cheaper; break ties by larger context
            const priceDiff = Number(a.pricing.prompt) - Number(b.pricing.prompt);
            return priceDiff !== 0 ? priceDiff : b.context_length - a.context_length;
        })
            .slice(0, 15);
        if (alternatives.length === 0) {
            vscode.window.showInformationMessage('No alternative models found in catalog.');
            return;
        }
        const picks = alternatives.map(m => {
            const inputPerM = (Number(m.pricing.prompt) * 1e6).toFixed(4);
            const ctx = m.context_length >= 1000000
                ? `${(m.context_length / 1000000).toFixed(1)}M`
                : `${Math.round(m.context_length / 1000)}k`;
            const cheaper = Number(m.pricing.prompt) < currentPrice;
            const savingsPct = currentPrice > 0
                ? Math.round((1 - Number(m.pricing.prompt) / currentPrice) * 100)
                : 0;
            return {
                label: m.id,
                description: `$${inputPerM}/M · ${ctx} ctx`,
                detail: cheaper && savingsPct > 0
                    ? `💚 ${savingsPct}% cheaper than ${currentId}`
                    : m.name,
                model: m,
            };
        });
        const chosen = await vscode.window.showQuickPick(picks, {
            title: `Replace "${currentId}" with…`,
            placeHolder: 'Select a model (sorted by price, cheapest first)',
            matchOnDescription: true,
            matchOnDetail: true,
        });
        if (!chosen)
            return;
        // Apply the in-place edit
        const doc = await vscode.workspace.openTextDocument(uri);
        const startPos = doc.positionAt(startIndex);
        const endPos = doc.positionAt(endIndex);
        const edit = new vscode.WorkspaceEdit();
        edit.replace(uri, new vscode.Range(startPos, endPos), chosen.model.id);
        await vscode.workspace.applyEdit(edit);
    });
}
//# sourceMappingURL=codeAction.js.map