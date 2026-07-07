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
exports.completionProvider = void 0;
const vscode = __importStar(require("vscode"));
const modelCache_1 = require("../lib/modelCache");
// Triggers when the user types a quote after common model-key patterns
const TRIGGER_PATTERN = /(?:model|MODEL|modelId|model_id|engine)\s*[:=]\s*["'`]([^"'`]*)$/;
exports.completionProvider = {
    provideCompletionItems(document, position) {
        const linePrefix = document.getText(new vscode.Range(new vscode.Position(position.line, 0), position));
        // Also fire when user types a bare quote that looks like it could be a model ID
        const isModelContext = TRIGGER_PATTERN.test(linePrefix);
        const isOpenQuote = /["'`][a-z0-9_-]*$/.test(linePrefix);
        if (!isModelContext && !isOpenQuote)
            return [];
        const models = (0, modelCache_1.getCachedModels)();
        // Top 20 by input price ascending (cheapest first as default sort)
        const top20 = [...models]
            .filter(m => Number(m.pricing.prompt) > 0)
            .sort((a, b) => Number(a.pricing.prompt) - Number(b.pricing.prompt))
            .slice(0, 20);
        return top20.map((m, idx) => {
            const inputPerM = (Number(m.pricing.prompt) * 1e6).toFixed(4);
            const outputPerM = (Number(m.pricing.completion) * 1e6).toFixed(4);
            const ctx = m.context_length >= 1000000
                ? `${(m.context_length / 1000000).toFixed(1)}M`
                : `${Math.round(m.context_length / 1000)}k`;
            const item = new vscode.CompletionItem(m.id, vscode.CompletionItemKind.Value);
            item.detail = `$${inputPerM}/M in · $${outputPerM}/M out · ${ctx} ctx`;
            item.documentation = new vscode.MarkdownString(`**${m.name}**\n\n` +
                `| | |\n|---|---|\n` +
                `| Input | $${inputPerM}/M tokens |\n` +
                `| Output | $${outputPerM}/M tokens |\n` +
                `| Context | ${ctx} tokens |\n` +
                (m.description ? `\n${m.description.slice(0, 120)}` : ''));
            // Insert just the model ID (not the surrounding quotes — they're already there)
            item.insertText = m.id;
            // Sort cheapest first
            item.sortText = String(idx).padStart(4, '0');
            return item;
        });
    },
};
//# sourceMappingURL=completion.js.map