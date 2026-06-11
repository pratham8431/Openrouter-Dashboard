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
exports.getFallbacksForRemovedModel = getFallbacksForRemovedModel;
const vscode = __importStar(require("vscode"));
const DEFAULT_FALLBACK = {
    modelId: 'google/gemini-flash-1.5',
    modelName: 'Gemini Flash 1.5',
    reason: 'Highly cost-efficient with strong general capabilities. Excellent speed-to-quality ratio for most production workloads.',
    quality: 8, speed: 9, cost: 9,
};
async function getFallbacksForRemovedModel(removedModelId, allModels, context, count = 3) {
    const apiKey = vscode.workspace.getConfiguration('openrouter').get('anthropicApiKey');
    if (!apiKey)
        return [DEFAULT_FALLBACK];
    const candidates = allModels
        .filter(m => m.id !== removedModelId && Number(m.pricing.prompt) > 0)
        .slice(0, 40)
        .map(m => ({
        id: m.id,
        name: m.name,
        context: m.context_length,
        inputPrice: `$${(Number(m.pricing.prompt) * 1e6).toFixed(4)}/M`,
    }));
    const prompt = `A model ID "${removedModelId}" was found in a developer's code but is no longer available on OpenRouter.

Available replacement models:
${JSON.stringify(candidates, null, 2)}

Return ONLY a JSON array of exactly ${count} replacement objects, best first:
[{"modelId":"...","modelName":"...","reason":"1-sentence why","quality":0-10,"speed":0-10,"cost":0-10}]

Do not include ${removedModelId}.`;
    try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-6',
                max_tokens: 600,
                system: 'You are an AI model advisor. Return only valid JSON, no markdown.',
                messages: [{ role: 'user', content: prompt }],
            }),
        });
        if (!res.ok)
            return [DEFAULT_FALLBACK];
        const data = await res.json();
        const text = data.content?.[0]?.text ?? '';
        const match = text.match(/\[[\s\S]*\]/);
        if (!match)
            return [DEFAULT_FALLBACK];
        return JSON.parse(match[0]);
    }
    catch {
        return [DEFAULT_FALLBACK];
    }
}
//# sourceMappingURL=fallback.js.map