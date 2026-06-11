"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectModelIds = detectModelIds;
// Matches any quoted OpenRouter-style model ID: "provider/model-name"
const MODEL_ID_REGEX = /["'`]([a-z0-9_-]+\/[a-z0-9._:+-]+)["'`]/g;
function detectModelIds(text) {
    const results = [];
    let match;
    MODEL_ID_REGEX.lastIndex = 0;
    while ((match = MODEL_ID_REGEX.exec(text)) !== null) {
        results.push({
            id: match[1],
            startIndex: match.index + 1, // skip opening quote
            endIndex: match.index + match[0].length - 1, // stop before closing quote
            quoteChar: match[0][0],
        });
    }
    return results;
}
//# sourceMappingURL=detector.js.map