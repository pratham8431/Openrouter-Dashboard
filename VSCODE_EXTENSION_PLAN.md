# VS Code Extension — OpenRouter Model Intelligence

## Context for the next chat

This document is a handoff brief for continuing the VS Code extension build.
Read this fully before writing any code.

---

## What already exists

A fully working React dashboard at `/Users/macbookm3/Documents/Openrouter-Dashboard/` that:

- Fetches the full OpenRouter model catalog from `https://openrouter.ai/api/v1/models` (public, no auth)
- Diffs it against a localStorage snapshot to detect new / changed / removed models
- Has a watchlist system with Claude-powered auto-switch fallback recommendations
- Has a cost estimator, AI recommender, and trends dashboard
- Has a Node.js cron agent (`cron/scheduler.js`) that runs hourly and sends email alerts via Nodemailer + Gmail SMTP

### Reusable lib layer (these functions should be ported into the extension)

| File | What it does |
|---|---|
| `src/lib/openrouter.ts` | `fetchModels()` — GET /api/v1/models, returns Model[] |
| `src/lib/changeDetector.ts` | Diffs fresh models against snapshot, returns new/changed/removed |
| `src/lib/watchlist.ts` | WatchRule CRUD in localStorage |
| `src/lib/fallback.ts` | Calls Claude API with use case context, returns best fallback model |
| `src/lib/tokenizer.ts` | `estimateTokens(text)` = Math.ceil(text.length / 4) |

### Core types (port these exactly)

```ts
interface Pricing { prompt: string; completion: string }

interface Model {
  id: string              // e.g. "anthropic/claude-sonnet-4-5"
  name: string
  context_length: number
  pricing: Pricing
  created?: number        // Unix timestamp
  description?: string
}

type ModelStatus = 'new' | 'changed' | 'stable' | 'removed'

interface WatchRule {
  modelId: string
  useCase: string
  priorities: { quality: number; speed: number; cost: number }
  priceThreshold?: number
  triggerOnRemoval: boolean
}

interface FallbackResult {
  modelId: string
  modelName: string
  reason: string
  quality: number
  speed: number
  cost: number
  monthlyEstimate?: number
}
```

---

## The VS Code Extension — What to Build

### Core concept

Detect model ID strings in open files (any language), pull live OpenRouter data,
and surface intelligence inline — no browser tab needed.

Pattern to detect (regex across file content):
```
"anthropic/claude-sonnet-4-5"
"openai/gpt-4o"
"google/gemini-pro"
```
Basically any string matching a known OpenRouter model ID pattern:
`/["'`]([a-z0-9-]+\/[a-z0-9._:-]+)["'`]/g`

---

## Features — Priority Order

### Feature 1 — Deprecated/Removed Model Detection (BUILD FIRST)
**Why first:** Clearest demo moment. Red squiggly = immediate trust signal.

- On file open and on save: scan document for model ID strings
- Cross-reference against live OpenRouter catalog
- If model ID not found in catalog → red squiggly underline (DiagnosticSeverity.Error)
- If model price changed significantly → yellow squiggly (DiagnosticSeverity.Warning)
- Hover over squiggly → shows: "This model is no longer available on OpenRouter" + 3 suggested replacements (call Claude fallback)

### Feature 2 — Hover Tooltip on Any Model ID (BUILD SECOND)
**Why second:** Table stakes, easy, high polish value.

- Hover over any detected model string
- Tooltip shows:
  - Model name + provider
  - Input price / Output price ($/M tokens)
  - Context window
  - Status (new / stable / changed / removed)
  - If changed: "Price increased X% since last detected"
  - One recommended alternative with estimated savings

### Feature 3 — Workspace Cost Scanner (BUILD THIRD)
**Why third:** Killer demo feature for engineering leads.

- Command palette: `OR Intelligence: Scan Workspace for AI Costs`
- Scans all files in workspace for model ID strings
- Groups by model ID, counts occurrences
- Opens a Webview panel showing:
  - Models found across codebase
  - Estimated monthly spend (asks user for monthly request volume)
  - Potential savings with recommended switches
  - File locations for each model ID (clickable, jumps to file)

### Feature 4 — Model ID Autocomplete (BUILD FOURTH)
- Trigger: user types `model: "` or `model: '` in any file
- CompletionItemProvider fires
- Shows top 20 models from live catalog with:
  - Model ID
  - Price ($/M)
  - Context window
  - Star rating proxy (derived from price tier)

### Feature 5 — Right-click Replace Model (BUILD FIFTH)
- Right-click on a model ID string
- Context menu: "OR Intelligence → Replace Model"
- Shows quick pick with alternatives (ranked by Claude)
- On select: replaces the string in-place using WorkspaceEdit

---

## Technical Architecture

### Extension structure
```
vscode-openrouter/
  src/
    extension.ts          ← activate(), registers all providers
    lib/
      openrouter.ts       ← fetchModels() — ported from dashboard
      modelCache.ts       ← in-memory cache + refresh on interval
      detector.ts         ← regex to find model IDs in documents
      fallback.ts         ← Claude API call for alternatives
      tokenizer.ts        ← estimateTokens()
    providers/
      diagnostics.ts      ← DiagnosticCollection for red/yellow squiggles
      hover.ts            ← HoverProvider — tooltip on model ID
      completion.ts       ← CompletionItemProvider — autocomplete
      codeAction.ts       ← CodeActionProvider — replace model action
    panels/
      costScanner.ts      ← WebviewPanel for workspace cost report
  package.json
  tsconfig.json
```

### Model cache strategy
- Fetch models on extension activate
- Cache in memory with timestamp
- Refresh every 60 minutes (or on manual command)
- Store last-known snapshot in `context.globalState` (VS Code's equivalent of localStorage)
- On refresh: diff against stored snapshot → trigger diagnostics update

### Key VS Code APIs needed
```ts
vscode.languages.createDiagnosticCollection()   // squiggles
vscode.languages.registerHoverProvider()         // tooltips
vscode.languages.registerCompletionItemProvider() // autocomplete
vscode.languages.registerCodeActionsProvider()   // right-click actions
vscode.window.createWebviewPanel()               // cost scanner UI
vscode.workspace.findFiles()                     // scan workspace
context.globalState.get/update()                 // persistent snapshot
```

---

## Extension package.json highlights

```json
{
  "name": "openrouter-intelligence",
  "displayName": "OpenRouter Intelligence",
  "description": "Inline AI model monitoring, cost analysis, and auto-switch recommendations powered by OpenRouter",
  "version": "0.0.1",
  "engines": { "vscode": "^1.85.0" },
  "categories": ["Other", "Linters"],
  "activationEvents": ["onStartupFinished"],
  "contributes": {
    "commands": [
      {
        "command": "openrouter.scanWorkspace",
        "title": "OR Intelligence: Scan Workspace for AI Costs"
      },
      {
        "command": "openrouter.refreshModels",
        "title": "OR Intelligence: Refresh Model Catalog"
      }
    ],
    "configuration": {
      "title": "OpenRouter Intelligence",
      "properties": {
        "openrouter.anthropicApiKey": {
          "type": "string",
          "description": "Anthropic API key for fallback recommendations"
        },
        "openrouter.monthlyRequestVolume": {
          "type": "number",
          "default": 10000,
          "description": "Monthly request volume for cost estimates"
        },
        "openrouter.avgOutputTokens": {
          "type": "number",
          "default": 500
        }
      }
    }
  }
}
```

---

## Demo Script (for showing this off)

1. Open any JS/TS file with a hardcoded model string like `"anthropic/claude-sonnet-4-5"`
2. Extension loads silently in background, fetches OpenRouter catalog
3. Hover over the model string → tooltip appears with live price + status
4. Change the model string to a deprecated/removed model ID → red squiggly appears immediately
5. Hover squiggly → "Model not found on OpenRouter. Suggested replacements: [list]"
6. Run command palette → "OR Intelligence: Scan Workspace for AI Costs"
7. Panel opens showing all model IDs found, estimated monthly spend, savings opportunities

That sequence takes under 2 minutes and covers the full value prop.

---

## What NOT to build yet
- Don't build the agent-friendly mode (Feature 6 from the original idea) — too vague for a v1
- Don't build team/shared watchlists — adds auth complexity
- Don't build a settings UI webview — VS Code settings JSON is fine for v1
- Don't try to parse ASTs — regex on the raw file content is good enough for model ID detection

---

## Connection to existing dashboard

The dashboard and extension are the same intelligence layer, two surfaces:
- Dashboard = browser UI for monitoring and exploration
- Extension = inline IDE layer for the moment of coding

In interviews/pitches say:
> "I built the intelligence engine first as a dashboard, then brought it into the IDE
> where developers actually make model routing decisions."

That's a product story, not two separate projects.

---

## Environment
- User: pratham8431 (GitHub)
- Machine: macOS (Apple Silicon, M3)
- Node: /opt/homebrew/bin/node
- Existing dashboard: /Users/macbookm3/Documents/Openrouter-Dashboard/
- Anthropic API key: already configured in dashboard .env
- OpenRouter API: public, no auth required

---

## Start here in the next chat

1. Scaffold the extension: `yo code` or manual scaffold
2. Port `openrouter.ts` and `detector.ts` first
3. Build `diagnostics.ts` (Feature 1 — red squiggles) as the first working feature
4. Then `hover.ts` (Feature 2)
5. Then `costScanner.ts` (Feature 3 — the demo killer)
