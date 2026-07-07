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
exports.runWorkspaceCostScan = runWorkspaceCostScan;
const vscode = __importStar(require("vscode"));
const modelCache_1 = require("../lib/modelCache");
const detector_1 = require("../lib/detector");
async function runWorkspaceCostScan(context) {
    const panel = vscode.window.createWebviewPanel('orCostScanner', 'OR Intelligence: Workspace Cost Scanner', vscode.ViewColumn.One, { enableScripts: true, retainContextWhenHidden: true });
    panel.webview.html = loadingHtml();
    const models = (0, modelCache_1.getCachedModels)();
    const modelMap = new Map(models.map(m => [m.id, m]));
    // Scan all text files in workspace
    const files = await vscode.workspace.findFiles('**/*.{ts,tsx,js,jsx,py,go,rb,java,cs,php,rs,swift,kt,yaml,yml,json,toml,env,txt,md}', '**/node_modules/**');
    const occurrenceMap = new Map();
    for (const uri of files) {
        let text;
        try {
            const bytes = await vscode.workspace.fs.readFile(uri);
            text = Buffer.from(bytes).toString('utf8');
        }
        catch {
            continue;
        }
        const detected = (0, detector_1.detectModelIds)(text);
        for (const hit of detected) {
            if (!occurrenceMap.has(hit.id)) {
                occurrenceMap.set(hit.id, {
                    modelId: hit.id,
                    model: modelMap.get(hit.id),
                    locations: [],
                });
            }
            // Compute line/col from startIndex
            const before = text.slice(0, hit.startIndex);
            const line = before.split('\n').length - 1;
            const col = hit.startIndex - before.lastIndexOf('\n') - 1;
            const lineText = text.split('\n')[line] ?? '';
            occurrenceMap.get(hit.id).locations.push({
                uri,
                line,
                col,
                preview: lineText.trim().slice(0, 80),
            });
        }
    }
    const config = vscode.workspace.getConfiguration('openrouter');
    const monthlyVol = config.get('monthlyRequestVolume') ?? 10000;
    const avgOut = config.get('avgOutputTokens') ?? 500;
    const occurrences = [...occurrenceMap.values()].sort((a, b) => b.locations.length - a.locations.length);
    panel.webview.html = buildHtml(occurrences, models, monthlyVol, avgOut, files.length);
    // Handle messages from webview (open file at location)
    panel.webview.onDidReceiveMessage(async (msg) => {
        if (msg.command === 'openFile') {
            const uri = vscode.Uri.file(msg.path);
            const doc = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(doc, {
                selection: new vscode.Range(msg.line, 0, msg.line, 0),
            });
        }
    }, undefined, context.subscriptions);
}
// ── HTML builders ─────────────────────────────────────────────────────────
function loadingHtml() {
    return `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:2rem;color:#ccc;background:#1e1e1e">
    <h2>🔍 Scanning workspace…</h2><p>Finding all AI model references across your codebase.</p>
  </body></html>`;
}
function buildHtml(occurrences, allModels, monthlyVol, avgOut, totalFiles) {
    const totalRefs = occurrences.reduce((s, o) => s + o.locations.length, 0);
    const totalCost = occurrences.reduce((s, o) => s + estimateMonthly(o.model, monthlyVol, avgOut), 0);
    const cheaperMap = buildCheaperMap(occurrences, allModels);
    const potentialSavings = occurrences.reduce((s, o) => {
        const alt = cheaperMap.get(o.modelId);
        if (!o.model || !alt)
            return s;
        return s + estimateMonthlySavings(o.model, alt, monthlyVol, avgOut);
    }, 0);
    const rows = occurrences.map(o => buildRow(o, cheaperMap, monthlyVol, avgOut)).join('');
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>OR Intelligence: Cost Scanner</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: var(--vscode-font-family, sans-serif); background: var(--vscode-editor-background, #1e1e1e); color: var(--vscode-editor-foreground, #d4d4d4); padding: 1.5rem; font-size: 13px; }
  h1 { font-size: 1.3rem; margin-bottom: 0.25rem; }
  .subtitle { color: var(--vscode-descriptionForeground, #888); margin-bottom: 1.5rem; font-size: 12px; }
  .stats { display: flex; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
  .stat { background: var(--vscode-sideBar-background, #252526); border: 1px solid var(--vscode-panel-border, #444); border-radius: 6px; padding: 0.75rem 1.25rem; min-width: 140px; }
  .stat-value { font-size: 1.4rem; font-weight: 700; color: var(--vscode-textLink-foreground, #4fc3f7); }
  .stat-label { font-size: 11px; color: var(--vscode-descriptionForeground, #888); margin-top: 2px; }
  .savings .stat-value { color: #81c784; }
  table { width: 100%; border-collapse: collapse; }
  thead tr { background: var(--vscode-sideBar-background, #252526); }
  th { text-align: left; padding: 0.6rem 0.75rem; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--vscode-descriptionForeground, #888); border-bottom: 1px solid var(--vscode-panel-border, #444); }
  td { padding: 0.6rem 0.75rem; border-bottom: 1px solid var(--vscode-panel-border, #333); vertical-align: top; }
  tr:hover td { background: var(--vscode-list-hoverBackground, #2a2d2e); }
  .model-id { font-family: var(--vscode-editor-font-family, monospace); font-size: 12px; color: var(--vscode-textLink-foreground, #4fc3f7); }
  .badge { display: inline-block; padding: 1px 6px; border-radius: 3px; font-size: 10px; font-weight: 600; margin-left: 4px; }
  .badge-removed { background: #5f1a1a; color: #f48771; }
  .badge-new { background: #1a3a1a; color: #81c784; }
  .badge-changed { background: #3a2a00; color: #ffcc02; }
  .price { font-size: 12px; color: var(--vscode-descriptionForeground, #888); }
  .alt { font-size: 11px; color: #81c784; }
  .locations { margin-top: 4px; }
  .loc-link { display: block; font-size: 11px; color: var(--vscode-textLink-foreground, #4fc3f7); cursor: pointer; text-decoration: none; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 340px; }
  .loc-link:hover { text-decoration: underline; }
  .loc-preview { font-size: 10px; color: var(--vscode-descriptionForeground, #666); font-family: monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 340px; }
  .cost-val { font-weight: 600; }
  .savings-val { color: #81c784; font-weight: 600; }
  .no-results { padding: 3rem; text-align: center; color: var(--vscode-descriptionForeground, #888); }
</style>
</head>
<body>
<h1>🔍 Workspace Cost Scanner</h1>
<p class="subtitle">Scanned ${totalFiles} files · ${totalRefs} model reference${totalRefs !== 1 ? 's' : ''} found across ${occurrences.length} unique model${occurrences.length !== 1 ? 's' : ''}</p>

<div class="stats">
  <div class="stat">
    <div class="stat-value">${occurrences.length}</div>
    <div class="stat-label">Unique models</div>
  </div>
  <div class="stat">
    <div class="stat-value">${totalRefs}</div>
    <div class="stat-label">Total references</div>
  </div>
  <div class="stat">
    <div class="stat-value">$${totalCost.toFixed(2)}</div>
    <div class="stat-label">Est. monthly spend</div>
  </div>
  <div class="stat savings">
    <div class="stat-value">$${potentialSavings.toFixed(2)}</div>
    <div class="stat-label">Potential savings/mo</div>
  </div>
</div>

${occurrences.length === 0
        ? '<div class="no-results">No AI model references found in this workspace.</div>'
        : `<table>
  <thead>
    <tr>
      <th>Model</th>
      <th>References</th>
      <th>Est. cost/mo</th>
      <th>Cheaper alternative</th>
      <th>File locations</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>`}

<script>
  const vscode = acquireVsCodeApi();
  document.querySelectorAll('.loc-link').forEach(el => {
    el.addEventListener('click', () => {
      vscode.postMessage({ command: 'openFile', path: el.dataset.path, line: parseInt(el.dataset.line, 10) });
    });
  });
</script>
</body>
</html>`;
}
function buildRow(o, cheaperMap, monthlyVol, avgOut) {
    const isRemoved = !o.model;
    const status = isRemoved ? 'removed' : 'stable';
    const badge = isRemoved ? '<span class="badge badge-removed">REMOVED</span>' : '';
    const priceStr = o.model
        ? `$${(Number(o.model.pricing.prompt) * 1e6).toFixed(4)}/M in · $${(Number(o.model.pricing.completion) * 1e6).toFixed(4)}/M out`
        : '<span style="color:#f48771">Not in catalog</span>';
    const monthly = estimateMonthly(o.model, monthlyVol, avgOut);
    const costStr = o.model ? `<span class="cost-val">$${monthly.toFixed(2)}</span>` : '—';
    const alt = cheaperMap.get(o.modelId);
    const altStr = alt && o.model
        ? `<div class="alt">→ <code>${alt.id}</code></div>
       <div class="alt" style="margin-top:2px">Save $${estimateMonthlySavings(o.model, alt, monthlyVol, avgOut).toFixed(2)}/mo</div>`
        : '<span style="color:#666">—</span>';
    const maxLocs = 5;
    const locLinks = o.locations.slice(0, maxLocs).map(l => {
        const rel = vscode.workspace.asRelativePath(l.uri);
        return `<a class="loc-link" data-path="${escHtml(l.uri.fsPath)}" data-line="${l.line}">${escHtml(rel)}:${l.line + 1}</a>
            <div class="loc-preview">${escHtml(l.preview)}</div>`;
    }).join('');
    const more = o.locations.length > maxLocs
        ? `<div style="font-size:11px;color:#888;margin-top:2px">+${o.locations.length - maxLocs} more</div>`
        : '';
    return `<tr>
    <td>
      <div class="model-id">${escHtml(o.modelId)}${badge}</div>
      <div class="price">${priceStr}</div>
    </td>
    <td>${o.locations.length}</td>
    <td>${costStr}</td>
    <td>${altStr}</td>
    <td><div class="locations">${locLinks}${more}</div></td>
  </tr>`;
}
// ── Utilities ─────────────────────────────────────────────────────────────
function estimateMonthly(model, monthlyVol, avgOut) {
    if (!model)
        return 0;
    const avgIn = 200;
    const perReq = avgIn * Number(model.pricing.prompt) + avgOut * Number(model.pricing.completion);
    return perReq * monthlyVol;
}
function estimateMonthlySavings(current, alt, monthlyVol, avgOut) {
    return Math.max(0, estimateMonthly(current, monthlyVol, avgOut) - estimateMonthly(alt, monthlyVol, avgOut));
}
function buildCheaperMap(occurrences, allModels) {
    const map = new Map();
    for (const o of occurrences) {
        if (!o.model)
            continue;
        const currentPrice = Number(o.model.pricing.prompt);
        const alt = allModels
            .filter(m => m.id !== o.modelId && Number(m.pricing.prompt) > 0)
            .filter(m => m.context_length >= o.model.context_length * 0.5)
            .filter(m => Number(m.pricing.prompt) < currentPrice)
            .sort((a, b) => Number(a.pricing.prompt) - Number(b.pricing.prompt))[0];
        if (alt)
            map.set(o.modelId, alt);
    }
    return map;
}
function escHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
//# sourceMappingURL=costScanner.js.map