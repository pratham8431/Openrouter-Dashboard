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
exports.diagnosticCollection = void 0;
exports.updateDiagnostics = updateDiagnostics;
const vscode = __importStar(require("vscode"));
const detector_1 = require("../lib/detector");
const modelCache_1 = require("../lib/modelCache");
const fallback_1 = require("../lib/fallback");
// Price change threshold that triggers a warning (20%)
const PRICE_CHANGE_THRESHOLD = 0.2;
exports.diagnosticCollection = vscode.languages.createDiagnosticCollection('openrouter');
// Cache fallback results per model ID so we don't hammer the API on every keystroke
const fallbackCache = new Map();
async function updateDiagnostics(document, context) {
    const text = document.getText();
    const detected = (0, detector_1.detectModelIds)(text);
    if (detected.length === 0) {
        exports.diagnosticCollection.set(document.uri, []);
        return;
    }
    const models = (0, modelCache_1.getCachedModels)();
    const modelMap = new Map(models.map(m => [m.id, m]));
    const snapshot = (0, modelCache_1.getSnapshot)(context);
    const diagnostics = [];
    for (const { id, startIndex, endIndex } of detected) {
        const startPos = document.positionAt(startIndex);
        const endPos = document.positionAt(endIndex);
        const range = new vscode.Range(startPos, endPos);
        if (!modelMap.has(id)) {
            // Model not in live catalog → red error squiggly
            let message = `"${id}" is not found in the OpenRouter catalog — it may have been removed or renamed.`;
            if (!fallbackCache.has(id) && models.length > 0) {
                // Kick off async fetch; diagnostics will be refreshed when it resolves
                (0, fallback_1.getFallbacksForRemovedModel)(id, models, context).then(fallbacks => {
                    const names = fallbacks.map(f => f.modelName).join(', ');
                    fallbackCache.set(id, fallbacks.map(f => f.modelId));
                    const cached = buildRemovedDiagnostic(range, id, names);
                    // Re-emit diagnostics with enriched message
                    const existing = exports.diagnosticCollection.get(document.uri) ?? [];
                    const updated = [...existing].map(d => d.range.isEqual(range) ? cached : d);
                    exports.diagnosticCollection.set(document.uri, updated);
                }).catch(() => { });
            }
            const names = fallbackCache.has(id)
                ? fallbackCache.get(id).join(', ')
                : undefined;
            diagnostics.push(buildRemovedDiagnostic(range, id, names));
            continue;
        }
        // Model exists — check for significant price change vs snapshot
        const snapshotEntry = snapshot[id];
        if (snapshotEntry) {
            const oldPrice = Number(snapshotEntry.price);
            const newPrice = Number(modelMap.get(id).pricing.prompt);
            if (oldPrice > 0 && newPrice > 0) {
                const change = (newPrice - oldPrice) / oldPrice;
                if (change > PRICE_CHANGE_THRESHOLD) {
                    const pct = Math.round(change * 100);
                    const diag = new vscode.Diagnostic(range, `"${id}" input price increased ${pct}% (was $${(oldPrice * 1e6).toFixed(4)}/M, now $${(newPrice * 1e6).toFixed(4)}/M).`, vscode.DiagnosticSeverity.Warning);
                    diag.source = 'OpenRouter Intelligence';
                    diagnostics.push(diag);
                }
            }
        }
    }
    exports.diagnosticCollection.set(document.uri, diagnostics);
}
function buildRemovedDiagnostic(range, modelId, suggestedNames) {
    const suffix = suggestedNames
        ? ` Suggested replacements: ${suggestedNames}.`
        : '';
    const diag = new vscode.Diagnostic(range, `"${modelId}" is not found in the OpenRouter catalog — it may have been removed or renamed.${suffix}`, vscode.DiagnosticSeverity.Error);
    diag.source = 'OpenRouter Intelligence';
    return diag;
}
//# sourceMappingURL=diagnostics.js.map