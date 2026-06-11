#!/usr/bin/env node
/**
 * OpenRouter Model Watchlist Alert + Auto-Switch Recommendations
 * Can be run as a one-shot script or imported by scheduler.js
 *
 * Setup:
 *   1. Fill cron/config.json (export via "Export watchlist config" in the dashboard)
 *   2. node cron/watch-alert.js          ← one-shot
 *   3. node cron/scheduler.js            ← runs on a schedule automatically
 */

import nodemailer from 'nodemailer'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CONFIG_PATH   = join(__dirname, 'config.json')
const SNAPSHOT_PATH = join(__dirname, 'snapshot.json')

async function getFallback(rule, change, freshModels, anthropicKey) {
  if (!anthropicKey) return null

  const candidates = freshModels
    .filter(m => m.id !== rule.modelId && Number(m.pricing.prompt) > 0)
    .slice(0, 40)
    .map(m => ({
      id: m.id, name: m.name, context: m.context_length,
      inputPrice: `$${(Number(m.pricing.prompt) * 1e6).toFixed(4)}/M`,
    }))

  const prompt = `A developer's watched model changed and needs a fallback.

Changed: ${change.name} (${change.id}) — ${change.type}${change.detail ? ` (${change.detail})` : ''}
Use case: ${rule.useCase}
Priorities (0-10): Quality=${rule.priorities.quality}, Speed=${rule.priorities.speed}, Cost=${rule.priorities.cost}
${rule.priceThreshold ? `Stay under $${rule.priceThreshold}/M tokens` : ''}

Candidates:
${JSON.stringify(candidates, null, 2)}

Return ONE JSON object only:
{"modelId":"...","modelName":"...","reason":"2 sentences max","quality":0-10,"speed":0-10,"cost":0-10}`

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        system: 'You are an AI model advisor. Return only valid JSON, no markdown.',
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!r.ok) return null
    const d = await r.json()
    const text = d.content?.[0]?.text ?? ''
    const match = text.match(/\{[\s\S]*\}/)
    return match ? JSON.parse(match[0]) : null
  } catch { return null }
}

export async function runCheck() {
  const label = new Date().toISOString()
  console.log(`\n[${label}] 🔍  Starting OpenRouter model check...`)

  // ── Load config ──────────────────────────────────────────────────────────────

  if (!existsSync(CONFIG_PATH)) {
    console.error(`[${label}] ❌  cron/config.json not found. Export it from the dashboard.`)
    return
  }

  const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'))
  const { email, rules = [] } = config
  const gmailUser        = process.env.EMAIL_USER        || config.gmailUser
  const gmailAppPassword = process.env.EMAIL_PASS        || config.gmailAppPassword
  const anthropicKey     = process.env.ANTHROPIC_API_KEY || config.anthropicApiKey || ''

  if (!email || !rules.length) {
    console.log(`[${label}] ℹ  No email or watch rules in config — skipping.`)
    return
  }

  // ── Fetch live models ────────────────────────────────────────────────────────

  let freshModels
  try {
    const res = await fetch('https://openrouter.ai/api/v1/models')
    if (!res.ok) { console.error(`[${label}] ❌  OpenRouter API ${res.status}`); return }
    const { data } = await res.json()
    freshModels = data
  } catch (err) {
    console.error(`[${label}] ❌  Failed to fetch OpenRouter models:`, err.message)
    return
  }

  const freshMap = Object.fromEntries(freshModels.map(m => [m.id, m]))

  // ── Load previous snapshot ───────────────────────────────────────────────────

  let snapshot = {}
  if (existsSync(SNAPSHOT_PATH)) {
    try { snapshot = JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8')) } catch { /* empty */ }
  }

  // ── Diff ─────────────────────────────────────────────────────────────────────

  const triggered = []

  for (const rule of rules) {
    const { modelId, priceThreshold } = rule
    const fresh = freshMap[modelId]
    const prev  = snapshot[modelId]

    if (!fresh && prev) {
      triggered.push({ rule, change: { type: 'removed', id: modelId, name: prev.name ?? modelId } })
      continue
    }
    if (!fresh) continue

    if (!prev) {
      triggered.push({ rule, change: { type: 'new', id: modelId, name: fresh.name } })
      continue
    }

    if (prev.price !== fresh.pricing.prompt) {
      const fromPM = (Number(prev.price) * 1e6).toFixed(4)
      const toPM   = (Number(fresh.pricing.prompt) * 1e6).toFixed(4)
      const currentPricePerM = Number(fresh.pricing.prompt) * 1e6

      if (!priceThreshold || currentPricePerM > priceThreshold) {
        triggered.push({
          rule,
          change: { type: 'price', id: modelId, name: fresh.name, detail: `$${fromPM}/M → $${toPM}/M` },
        })
      } else {
        console.log(`[${label}] ℹ  ${fresh.name} price changed but $${currentPricePerM.toFixed(2)}/M is still under your $${priceThreshold}/M threshold.`)
      }
    }
  }

  // ── Save snapshot ─────────────────────────────────────────────────────────────

  const newSnapshot = {}
  for (const m of freshModels) {
    newSnapshot[m.id] = { price: m.pricing.prompt, ctx: m.context_length, name: m.name }
  }
  writeFileSync(SNAPSHOT_PATH, JSON.stringify(newSnapshot, null, 2))

  if (!triggered.length) {
    console.log(`[${label}] ✅  No triggered rules. ${freshModels.length} models checked.`)
    return
  }

  console.log(`[${label}] ⚠  ${triggered.length} rule(s) triggered — getting fallback recommendations...`)

  // ── Claude fallbacks ──────────────────────────────────────────────────────────

  const results = await Promise.all(
    triggered.map(async t => ({ ...t, fallback: await getFallback(t.rule, t.change, freshModels, anthropicKey) }))
  )

  // ── Log to console even without email ────────────────────────────────────────

  results.forEach(({ change, fallback }) => {
    console.log(`[${label}]   ${change.type.toUpperCase()}: ${change.name} ${change.detail ?? ''}`)
    if (fallback) console.log(`[${label}]   → Switch to: ${fallback.modelName} (${fallback.modelId})`)
  })

  if (!gmailUser || !gmailAppPassword) {
    console.log(`[${label}] ⚠  No email credentials — changes logged above only.`)
    return
  }

  // ── Build and send email ──────────────────────────────────────────────────────

  const rows = results.map(({ change, rule, fallback }) => {
    const typeLabel = change.type === 'removed' ? '🔴 REMOVED' : change.type === 'price' ? '🟡 PRICE CHANGE' : '🟢 NEW'
    const fallbackHtml = fallback ? `
      <div style="margin-top:12px;padding:12px;background:#0A0A0F;border-radius:6px;border:1px solid rgba(16,185,129,0.2)">
        <div style="font-family:monospace;font-size:12px;color:#10B981;margin-bottom:6px">
          → Suggested switch: <strong>${fallback.modelName}</strong>
          <span style="color:#4A4A60;margin-left:8px">${fallback.modelId}</span>
        </div>
        <div style="font-family:monospace;font-size:11px;color:#8888A0;line-height:1.6;margin-bottom:8px">${fallback.reason}</div>
        <div style="display:flex;gap:16px">
          ${[['Quality', fallback.quality, '#6366F1'], ['Speed', fallback.speed, '#14B8A6'], ['Cost eff.', fallback.cost, '#10B981']].map(([l, v, c]) => `
            <span style="font-family:monospace;font-size:10px;color:#4A4A60">${l}: <span style="color:${c}">${v}/10</span></span>
          `).join('')}
        </div>
      </div>` : ''

    const thresholdNote = rule.priceThreshold
      ? `<div style="font-family:monospace;font-size:10px;color:#4A4A60;margin-top:4px">Your threshold: $${rule.priceThreshold}/M tokens</div>`
      : ''

    return `
      <div style="margin-bottom:16px;padding:16px;background:#111118;border-radius:8px;border:1px solid rgba(239,68,68,0.2)">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">
          <span style="font-family:monospace;font-size:12px;font-weight:600">${typeLabel}</span>
          <span style="font-family:monospace;font-size:13px;color:#E8E8F0">${change.name}</span>
          ${change.detail ? `<span style="font-family:monospace;font-size:11px;color:#8888A0">${change.detail}</span>` : ''}
        </div>
        <div style="font-family:monospace;font-size:10px;color:#4A4A60">${change.id}</div>
        ${thresholdNote}
        ${fallbackHtml}
      </div>`
  }).join('\n')

  const html = `<!DOCTYPE html>
<html>
<body style="background:#0A0A0F;color:#E8E8F0;font-family:system-ui,sans-serif;padding:32px;max-width:640px">
  <h2 style="font-family:'Syne',sans-serif;font-size:18px;margin:0 0 6px">⚠ OpenRouter Auto-Switch Alert</h2>
  <p style="font-family:monospace;font-size:12px;color:#8888A0;margin:0 0 24px">
    ${results.length} watched model${results.length !== 1 ? 's' : ''} changed.
    ${anthropicKey ? 'Claude has picked the best fallback for each.' : 'Add ANTHROPIC_API_KEY for auto-switch recommendations.'}
  </p>
  ${rows}
  <p style="font-family:monospace;font-size:10px;color:#4A4A60;margin-top:24px;border-top:1px solid rgba(255,255,255,0.07);padding-top:16px">
    Sent by OpenRouter Model Intelligence · <a href="https://openrouter.ai/models" style="color:#6366F1">View models</a>
  </p>
</body>
</html>`

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: gmailUser, pass: gmailAppPassword },
  })

  await transporter.sendMail({
    from: `"OR Intelligence" <${gmailUser}>`,
    to: email,
    subject: `⚠ ${results.length} watched model${results.length !== 1 ? 's' : ''} changed — auto-switch ready`,
    html,
    text: results.map(({ change, fallback }) =>
      `${change.type.toUpperCase()}: ${change.name} ${change.detail ?? ''}${fallback ? `\n→ Switch to: ${fallback.modelName} (${fallback.modelId})\n  ${fallback.reason}` : ''}`
    ).join('\n\n'),
  })

  console.log(`[${label}] ✅  Email sent to ${email}`)
}

// Run immediately if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runCheck().catch(err => { console.error('Fatal:', err); process.exit(1) })
}
