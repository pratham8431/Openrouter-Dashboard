#!/usr/bin/env node
/**
 * Public-repo model-hygiene scanner.
 *
 * Searches public GitHub code for OpenRouter-style model ID references,
 * classifies each one against the live catalog (dead / suboptimal / ok),
 * and reports aggregate stats — e.g. "N% of scanned repos reference at
 * least one dead or overpriced model ID."
 *
 * Reuses the same detection regex and "cheaper alternative" heuristic
 * that ship in the VS Code extension — this scans the wild with the
 * exact same logic that flags issues in your own editor.
 *
 * Setup:
 *   1. Create a GitHub personal access token (no special scopes needed
 *      for public code search): https://github.com/settings/tokens
 *   2. GITHUB_TOKEN=ghp_xxx node scanner/scan.js
 *
 * Tuning (all optional):
 *   MAX_RESULTS_PER_QUERY  results to pull per search query (default 100)
 *   MAX_FILES              cap on total distinct files processed (default 300)
 *   SCAN_QUERIES           "||"-separated override of the search queries
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

import { searchCode, fetchFileContent } from './lib/github.js'
import { detectModelIds } from './lib/detector.js'
import { fetchModels } from './lib/openrouter.js'
import { classifyIds } from './lib/classify.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CACHE_DIR = join(__dirname, '.cache')
const REPORT_PATH = join(__dirname, 'report.json')

const DEFAULT_QUERIES = [
  '"openrouter.ai/api/v1/models"',
  '"OPENROUTER_API_KEY"',
  '"openrouter.ai/api/v1/chat/completions"',
]

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function loadCached(sha) {
  const path = join(CACHE_DIR, `${sha}.txt`)
  return existsSync(path) ? readFileSync(path, 'utf8') : null
}

function saveCache(sha, content) {
  mkdirSync(CACHE_DIR, { recursive: true })
  writeFileSync(join(CACHE_DIR, `${sha}.txt`), content)
}

async function main() {
  const token = process.env.GITHUB_TOKEN
  if (!token) {
    console.error('GITHUB_TOKEN is required — GitHub\'s code search API rejects unauthenticated requests.')
    console.error('Create one at https://github.com/settings/tokens (no special scopes needed) and re-run:')
    console.error('  GITHUB_TOKEN=ghp_xxx node scanner/scan.js')
    process.exit(1)
  }

  const queries = process.env.SCAN_QUERIES
    ? process.env.SCAN_QUERIES.split('||').map(q => q.trim()).filter(Boolean)
    : DEFAULT_QUERIES
  const maxResultsPerQuery = Number(process.env.MAX_RESULTS_PER_QUERY) || 100
  const maxFiles = Number(process.env.MAX_FILES) || 300

  console.log(`🔍  Searching GitHub across ${queries.length} quer${queries.length === 1 ? 'y' : 'ies'}...`)

  // ── Discovery ─────────────────────────────────────────────────────────────

  const fileMap = new Map() // key: repo/path → search item
  for (const query of queries) {
    console.log(`   "${query}"`)
    const items = await searchCode(query, token, maxResultsPerQuery)
    for (const item of items) {
      const key = `${item.repository.full_name}/${item.path}`
      if (!fileMap.has(key)) fileMap.set(key, item)
    }
    await sleep(2500) // stay well under code search's ~10 req/min limit
  }

  const files = [...fileMap.values()].slice(0, maxFiles)
  console.log(`📄  ${files.length} distinct files across ${new Set(files.map(f => f.repository.full_name)).size} repos to scan.`)

  // ── Extraction ────────────────────────────────────────────────────────────

  const repoIdMap = new Map() // repo full_name → Set of model IDs found

  for (const [i, item] of files.entries()) {
    const repo = item.repository.full_name
    process.stdout.write(`\r   fetching ${i + 1}/${files.length}...`)

    let content = loadCached(item.sha)
    if (content === null) {
      try {
        content = await fetchFileContent(item, token)
      } catch {
        content = null
      }
      if (content !== null) saveCache(item.sha, content)
      await sleep(300) // core content API — much higher limit, light pacing only
    }
    if (!content) continue

    const ids = detectModelIds(content)
    if (ids.length === 0) continue

    if (!repoIdMap.has(repo)) repoIdMap.set(repo, new Set())
    ids.forEach(id => repoIdMap.get(repo).add(id))
  }
  process.stdout.write('\n')

  // ── Classification ────────────────────────────────────────────────────────

  console.log('📡  Fetching live OpenRouter catalog...')
  const catalog = await fetchModels()

  const allIds = new Set()
  repoIdMap.forEach(ids => ids.forEach(id => allIds.add(id)))
  const classifications = new Map(classifyIds([...allIds], catalog).map(c => [c.id, c]))

  // ── Aggregation ───────────────────────────────────────────────────────────

  const repos = [...repoIdMap.entries()].map(([repo, ids]) => {
    const entries = [...ids].map(id => classifications.get(id))
    return {
      repo,
      totalModelRefs: entries.length,
      dead: entries.filter(e => e.status === 'dead'),
      suboptimal: entries.filter(e => e.status === 'suboptimal'),
      ok: entries.filter(e => e.status === 'ok'),
    }
  })

  const reposScanned = repos.length
  const reposWithDead = repos.filter(r => r.dead.length > 0).length
  const reposWithSuboptimal = repos.filter(r => r.suboptimal.length > 0).length
  const totalDead = repos.reduce((s, r) => s + r.dead.length, 0)
  const totalSuboptimal = repos.reduce((s, r) => s + r.suboptimal.length, 0)

  const deadIdFrequency = new Map()
  repos.forEach(r => r.dead.forEach(d => deadIdFrequency.set(d.id, (deadIdFrequency.get(d.id) ?? 0) + 1)))
  const topDeadIds = [...deadIdFrequency.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, count]) => ({ id, repoCount: count }))

  const summary = {
    scannedAt: new Date().toISOString(),
    queries,
    reposScanned,
    filesScanned: files.length,
    reposWithDeadModelIds: reposWithDead,
    reposWithSuboptimalModelIds: reposWithSuboptimal,
    pctReposWithDeadIds: reposScanned ? Math.round((reposWithDead / reposScanned) * 1000) / 10 : 0,
    avgDeadIdsPerRepo: reposScanned ? Math.round((totalDead / reposScanned) * 100) / 100 : 0,
    avgSuboptimalIdsPerRepo: reposScanned ? Math.round((totalSuboptimal / reposScanned) * 100) / 100 : 0,
    avgDeadOrSuboptimalPerRepo: reposScanned ? Math.round(((totalDead + totalSuboptimal) / reposScanned) * 100) / 100 : 0,
    topDeadIds,
  }

  writeFileSync(REPORT_PATH, JSON.stringify({ summary, repos }, null, 2))

  // ── Console summary ──────────────────────────────────────────────────────

  console.log('\n✅  Scan complete\n')
  console.log(`   Repos scanned:              ${summary.reposScanned}`)
  console.log(`   Files scanned:               ${summary.filesScanned}`)
  console.log(`   Repos with a dead model ID:  ${summary.reposWithDeadModelIds} (${summary.pctReposWithDeadIds}%)`)
  console.log(`   Repos with a pricier-than-needed model: ${summary.reposWithSuboptimalModelIds}`)
  console.log(`   Avg dead IDs / repo:         ${summary.avgDeadIdsPerRepo}`)
  console.log(`   Avg suboptimal IDs / repo:   ${summary.avgSuboptimalIdsPerRepo}`)
  console.log(`   Avg dead-or-suboptimal / repo: ${summary.avgDeadOrSuboptimalPerRepo}`)
  if (topDeadIds.length) {
    console.log('\n   Most common dead IDs:')
    topDeadIds.forEach(({ id, repoCount }) => console.log(`     ${id}  (${repoCount} repos)`))
  }
  console.log(`\n📝  Full report written to ${REPORT_PATH}`)
}

main().catch(err => {
  console.error('Fatal:', err.message)
  process.exit(1)
})
