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
exports.createHoverProvider = createHoverProvider;
const vscode = __importStar(require("vscode"));
const detector_1 = require("../lib/detector");
const modelCache_1 = require("../lib/modelCache");
const PRICE_CHANGE_THRESHOLD = 0.05; // 5% change counts as "changed" for status label
function createHoverProvider(context) {
    return {
        provideHover(document, position) {
            const text = document.getText();
            const offset = document.offsetAt(position);
            const detected = (0, detector_1.detectModelIds)(text);
            const hit = detected.find(d => offset >= d.startIndex && offset <= d.endIndex);
            if (!hit)
                return null;
            const models = (0, modelCache_1.getCachedModels)();
            const modelMap = new Map(models.map(m => [m.id, m]));
            const snapshot = (0, modelCache_1.getSnapshot)(context);
            const range = new vscode.Range(document.positionAt(hit.startIndex), document.positionAt(hit.endIndex));
            if (!modelMap.has(hit.id)) {
                return new vscode.Hover(buildRemovedTooltip(hit.id, models, snapshot), range);
            }
            const model = modelMap.get(hit.id);
            return new vscode.Hover(buildTooltip(model, models, snapshot), range);
        },
    };
}
// ── Tooltip for removed / unknown model IDs ────────────────────────────────
function buildRemovedTooltip(id, allModels, snapshot) {
    const wasKnown = id in snapshot;
    const md = new vscode.MarkdownString();
    md.isTrusted = true;
    md.appendMarkdown(`### ❌ ${wasKnown ? 'Removed' : 'Unknown'} model\n\n`);
    md.appendMarkdown(`\`${id}\` is **not available** on OpenRouter.\n\n`);
    if (wasKnown) {
        const snap = snapshot[id];
        md.appendMarkdown(`**Last known price:** $${(Number(snap.price) * 1e6).toFixed(4)}/M · `);
        md.appendMarkdown(`**Last known context:** ${fmtCtx(snap.ctx)}\n\n`);
    }
    const alt = findCheaperAlternative(id, allModels, null);
    if (alt) {
        md.appendMarkdown(`**💡 Suggested alternative:** \`${alt.id}\`\n`);
        md.appendMarkdown(`${alt.name} · $${(Number(alt.pricing.prompt) * 1e6).toFixed(4)}/M input · ${fmtCtx(alt.context_length)} context`);
    }
    md.appendMarkdown(`\n\n*Check the red squiggly diagnostic for more replacements.*`);
    return md;
}
// ── Tooltip for live models ────────────────────────────────────────────────
function buildTooltip(model, allModels, snapshot) {
    const inputPerM = Number(model.pricing.prompt) * 1e6;
    const outputPerM = Number(model.pricing.completion) * 1e6;
    const { status, priceDeltaPct, oldInputPerM } = resolveStatus(model, snapshot);
    const age = (0, modelCache_1.getCacheAge)();
    const ageStr = age >= 0
        ? `*Catalog refreshed ${age < 60 ? 'just now' : `${Math.floor(age / 60)}m ago`}*`
        : '';
    const md = new vscode.MarkdownString();
    md.isTrusted = true;
    md.appendMarkdown(`### ${model.name}  ${statusBadge(status)}\n\n`);
    // Pricing + context table
    md.appendMarkdown(`| | |\n|---|---|\n`);
    md.appendMarkdown(`| **Provider** | \`${model.id.split('/')[0]}\` |\n`);
    md.appendMarkdown(`| **Input price** | $${inputPerM.toFixed(4)}/M tokens |\n`);
    md.appendMarkdown(`| **Output price** | $${outputPerM.toFixed(4)}/M tokens |\n`);
    md.appendMarkdown(`| **Context window** | ${fmtCtx(model.context_length)} |\n`);
    md.appendMarkdown(`| **Status** | ${statusLabel(status)} |\n`);
    // Price change callout
    if (status === 'changed' && priceDeltaPct !== null && oldInputPerM !== null) {
        const direction = priceDeltaPct > 0 ? '📈 increased' : '📉 decreased';
        const absPct = Math.abs(Math.round(priceDeltaPct * 100));
        md.appendMarkdown(`\n> **Price ${direction} ${absPct}%** — was $${oldInputPerM.toFixed(4)}/M, now $${inputPerM.toFixed(4)}/M\n`);
    }
    // Description
    if (model.description) {
        const desc = model.description.slice(0, 160);
        md.appendMarkdown(`\n${desc}${model.description.length > 160 ? '…' : ''}\n`);
    }
    // Cheaper alternative
    const alt = findCheaperAlternative(model.id, allModels, model);
    if (alt) {
        const config = vscode.workspace.getConfiguration('openrouter');
        const monthlyVol = config.get('monthlyRequestVolume') ?? 10000;
        const avgOut = config.get('avgOutputTokens') ?? 500;
        const savings = estimateMonthlySavings(model, alt, monthlyVol, avgOut);
        md.appendMarkdown(`\n---\n**💡 Cheaper alternative:** \`${alt.id}\`\n\n`);
        md.appendMarkdown(`${alt.name} · $${(Number(alt.pricing.prompt) * 1e6).toFixed(4)}/M input · ${fmtCtx(alt.context_length)} context`);
        if (savings > 0) {
            md.appendMarkdown(` · **~$${savings.toFixed(0)}/mo savings** at ${monthlyVol.toLocaleString()} req/mo`);
        }
        md.appendMarkdown('\n');
    }
    if (ageStr)
        md.appendMarkdown(`\n${ageStr}`);
    return md;
}
function resolveStatus(model, snapshot) {
    const snap = snapshot[model.id];
    if (!snap)
        return { status: 'new', priceDeltaPct: null, oldInputPerM: null };
    const oldPrice = Number(snap.price);
    const newPrice = Number(model.pricing.prompt);
    if (oldPrice > 0 && newPrice > 0) {
        const delta = (newPrice - oldPrice) / oldPrice;
        if (Math.abs(delta) > PRICE_CHANGE_THRESHOLD) {
            return { status: 'changed', priceDeltaPct: delta, oldInputPerM: oldPrice * 1e6 };
        }
    }
    return { status: 'stable', priceDeltaPct: null, oldInputPerM: null };
}
function findCheaperAlternative(excludeId, allModels, currentModel) {
    const currentPrice = currentModel ? Number(currentModel.pricing.prompt) : Infinity;
    const currentCtx = currentModel ? currentModel.context_length : 0;
    const candidates = allModels
        .filter(m => m.id !== excludeId && Number(m.pricing.prompt) > 0)
        .filter(m => m.context_length >= currentCtx * 0.5) // at least half the context
        .filter(m => Number(m.pricing.prompt) < currentPrice)
        .sort((a, b) => Number(a.pricing.prompt) - Number(b.pricing.prompt));
    return candidates[0] ?? null;
}
function estimateMonthlySavings(current, alt, monthlyRequests, avgOutputTokens) {
    const avgInputTokens = 200;
    const currentCost = avgInputTokens * Number(current.pricing.prompt) +
        avgOutputTokens * Number(current.pricing.completion);
    const altCost = avgInputTokens * Number(alt.pricing.prompt) +
        avgOutputTokens * Number(alt.pricing.completion);
    return Math.max(0, (currentCost - altCost) * monthlyRequests);
}
function statusBadge(status) {
    return { new: '🆕', changed: '⚡', stable: '✅' }[status];
}
function statusLabel(status) {
    return { new: 'New model', changed: 'Price changed', stable: 'Stable' }[status];
}
function fmtCtx(tokens) {
    return tokens >= 1000000
        ? `${(tokens / 1000000).toFixed(1)}M tokens`
        : `${Math.round(tokens / 1000)}k tokens`;
}
//# sourceMappingURL=hover.js.map