"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCachedModels = getCachedModels;
exports.initCache = initCache;
exports.forceRefresh = forceRefresh;
exports.getSnapshot = getSnapshot;
exports.saveSnapshot = saveSnapshot;
exports.disposeCache = disposeCache;
exports.getCacheAge = getCacheAge;
const openrouter_1 = require("./openrouter");
const REFRESH_INTERVAL_MS = 60 * 60 * 1000; // 60 minutes
const SNAPSHOT_KEY = 'or_model_snapshot';
let cachedModels = [];
let cacheTimestamp = 0;
let refreshTimer;
function getCachedModels() {
    return cachedModels;
}
async function initCache(context) {
    cachedModels = await (0, openrouter_1.fetchModels)();
    cacheTimestamp = Date.now();
    if (!context.globalState.get(SNAPSHOT_KEY)) {
        saveSnapshot(context, cachedModels);
    }
    refreshTimer = setInterval(async () => {
        cachedModels = await (0, openrouter_1.fetchModels)();
        cacheTimestamp = Date.now();
        saveSnapshot(context, cachedModels);
    }, REFRESH_INTERVAL_MS);
    return cachedModels;
}
async function forceRefresh(context) {
    cachedModels = await (0, openrouter_1.fetchModels)();
    cacheTimestamp = Date.now();
    saveSnapshot(context, cachedModels);
    return cachedModels;
}
function getSnapshot(context) {
    return context.globalState.get(SNAPSHOT_KEY) ?? {};
}
function saveSnapshot(context, models) {
    const snapshot = {};
    for (const m of models) {
        snapshot[m.id] = { price: m.pricing.prompt, ctx: m.context_length };
    }
    context.globalState.update(SNAPSHOT_KEY, snapshot);
}
function disposeCache() {
    if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = undefined;
    }
}
function getCacheAge() {
    return cacheTimestamp ? Math.floor((Date.now() - cacheTimestamp) / 1000) : -1;
}
//# sourceMappingURL=modelCache.js.map