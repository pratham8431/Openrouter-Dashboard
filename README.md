# OpenRouter Model Intelligence Platform

A developer-focused dashboard for tracking, comparing, and monitoring AI models available on [OpenRouter](https://openrouter.ai). Built with React 18 + TypeScript + Vite.

---

## What it does

OpenRouter lists 400+ AI models from every major provider. This platform gives developers the intelligence layer on top of that catalog — change detection, cost comparison, AI-powered recommendations, and automated alerts when your production model changes.

---

## Modules

### 1. Model Tracker
Live view of the entire OpenRouter model catalog with automatic change detection.

- Fetches the full model list from `https://openrouter.ai/api/v1/models` on every load
- Compares against a localStorage snapshot to detect what's **new**, **changed** (price shift), or **removed** since your last visit
- Amber alert banner for general changes; red priority banner for watched models specifically
- Searchable, filterable table — filter by provider, status, or watched models only
- Copy model ID to clipboard in one click

### 2. Model Watchlist + Auto-Switch
Flag specific models you use in production and get notified the moment they change.

- Click the bell icon on any model row to set up a **Watch Rule**
  - Describe your use case (feeds Claude's fallback recommendation)
  - Set an optional price threshold — only alert if price exceeds `$X/M tokens`
  - Set Quality / Speed / Cost priority weights (0–10 sliders)
- Watched model rows are tinted amber so they stand out
- When a watched model triggers:
  - Red in-app alert with the change detail
  - Claude automatically recommends the best fallback from the live catalog, based on your use case and priorities
  - Fallback card shows model name, reason (2 sentences), score bars, and estimated monthly cost
- **Export watchlist config** — downloads `config.json` pre-filled with your watch rules for the cron agent

### 3. AI Recommender
Describe what you're building and get ranked model recommendations from Claude.

- Free-text use case description with 6 preset chips (customer support, code generation, document analysis, etc.)
- Quality / Speed / Cost priority sliders
- Claude evaluates the live model catalog and returns the top 4 matches with reasoning and score breakdowns
- Graceful fallback to curated recommendations if the API key is missing

### 4. Cost Estimator
Compare what every model on OpenRouter would cost for your specific workload.

- Paste a real prompt — live token counter updates as you type
- Set daily request volume and average output token count
- See per-request, monthly, and yearly cost for every model, sorted cheapest first
- "Best value" badge on the top result
- Export to CSV for sharing with your team or finance

### 5. Trends Dashboard
Visual overview of the OpenRouter model ecosystem — all data is dynamic.

| Chart | Data source |
|---|---|
| New models per month | Grouped from `model.created` timestamps in the API response |
| Models by provider | Counted from live model IDs |
| Avg input price trend | Accumulated daily in localStorage — grows over time |
| Context window distribution | Bucketed from live `context_length` values |
| New Arrivals feed | Live models where `status === 'new'` (appeared since last snapshot) |

---

## Cron Alert Agent

A Node.js script (`cron/watch-alert.js`) that runs on a schedule and emails you when a watched model changes — even when you're not on the site.

**What it does:**
1. Fetches the full OpenRouter model catalog
2. Diffs against a local snapshot (`cron/snapshot.json`)
3. Checks each watch rule — only triggers if a price threshold is crossed (if set)
4. Calls Claude to get a fallback recommendation for each triggered rule
5. Sends a styled HTML email via Gmail SMTP with the change details and suggested alternative

**Setup:**

```bash
# 1. Export your watchlist config from the dashboard (Tracker tab → Export watchlist config)
#    This creates cron/config.json with your rules pre-filled

# 2. Set credentials
cp .env.example .env
# Fill in EMAIL_USER, EMAIL_PASS (Gmail app password), ANTHROPIC_API_KEY

# 3. Run manually
node cron/watch-alert.js

# 4. Or schedule it (crontab — runs every hour)
0 * * * * cd /path/to/openrouter-dashboard && node cron/watch-alert.js
```

`cron/config.json` structure:

```json
{
  "email": "you@gmail.com",
  "gmailUser": "you@gmail.com",
  "gmailAppPassword": "xxxx xxxx xxxx xxxx",
  "anthropicApiKey": "sk-ant-...",
  "rules": [
    {
      "modelId": "anthropic/claude-sonnet-4-5",
      "useCase": "Customer support bot. Accuracy and speed both matter.",
      "priorities": { "quality": 8, "speed": 7, "cost": 5 },
      "priceThreshold": 4.0,
      "triggerOnRemoval": true
    }
  ]
}
```

---

## Getting started

### Prerequisites
- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com) (for AI Recommender and auto-switch fallback)
- A Gmail app password (for email alerts — [generate one here](https://myaccount.google.com/apppasswords))

### Install and run

```bash
git clone https://github.com/pratham8431/openrouter-dashboard
cd openrouter-dashboard
npm install
cp .env.example .env   # fill in your keys
npm run dev
```

Open `http://localhost:5173`.

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `VITE_ANTHROPIC_API_KEY` | For AI features | Powers the AI Recommender and in-app fallback suggestions |
| `EMAIL_USER` | For cron alerts | Gmail address to send alerts from |
| `EMAIL_PASS` | For cron alerts | Gmail app password (not your account password) |
| `ANTHROPIC_API_KEY` | For cron alerts | Anthropic key used by the cron agent (server-side) |

The dashboard works without any keys — model data is always live from OpenRouter's public API. AI features degrade gracefully to hardcoded fallbacks.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | React 18 + TypeScript |
| Build tool | Vite + `@tailwindcss/vite` |
| Styling | Tailwind CSS v4 (`@theme` in CSS, no config file) |
| Charts | Recharts |
| Icons | Lucide React |
| Fonts | Syne (headings) + DM Mono (code, IDs, data) |
| AI | Claude (`claude-sonnet-4-20250514`) via Anthropic API |
| Model data | OpenRouter public API (no auth required) |
| Persistence | localStorage (snapshot, watchlist, price history) |
| Email | Nodemailer + Gmail SMTP |

---

## Project structure

```
src/
├── components/
│   ├── Layout/         # Sidebar, PageHeader
│   ├── Tracker/        # ModelTable, StatsRow, WatchRulePanel
│   ├── Recommender/    # UseCaseForm, ResultsPanel
│   ├── CostEstimator/  # InputForm, CostTable
│   └── Trends/         # ChartGrid, ArrivalsFeed
├── lib/
│   ├── openrouter.ts   # fetchModels()
│   ├── changeDetector.ts # localStorage diff engine
│   ├── watchlist.ts    # WatchRule CRUD + exportWatchlistConfig()
│   ├── fallback.ts     # Claude fallback recommendation call
│   ├── claude.ts       # AI Recommender API call
│   ├── tokenizer.ts    # estimateTokens()
│   └── export.ts       # downloadCSV()
├── types/
│   └── openrouter.d.ts # All shared TypeScript types
└── App.tsx             # Page switcher, data fetching, alert logic
cron/
├── watch-alert.js      # Cron alert + auto-switch email agent
├── config.example.json # Template config — copy and fill in
└── snapshot.json       # Auto-generated on first run (gitignored)
```

---

## How change detection works

On every page load:

1. Fetch the full model list from OpenRouter
2. Load the previous snapshot from localStorage
3. Diff: for each model, compare pricing and presence
4. Tag each model as `new`, `changed`, `stable`, or `removed`
5. Cross-reference watched model IDs — surface those as priority alerts
6. Save the new snapshot for next time

The first load after clearing localStorage shows everything as "new" — this is expected. The second load onwards reflects real changes.

---

## Why this exists

OpenRouter's model catalog changes constantly — new models are added weekly, prices shift, models get deprecated. As a developer using these models in production, you're often the last to know. This dashboard gives you:

- A single view of everything available right now
- Automatic detection of what changed since you last checked
- Targeted alerts for models you actually use
- An AI co-pilot to tell you what to switch to when your model changes
- Cost comparison across the full catalog for your specific workload

---

## License

MIT
