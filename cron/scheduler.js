#!/usr/bin/env node
/**
 * OpenRouter Model Watcher — Persistent Scheduler
 *
 * Runs the model check on a cron schedule without any OS-level setup.
 * Keeps a single Node.js process alive and fires runCheck() on schedule.
 *
 * Usage:
 *   node cron/scheduler.js              ← default: every hour
 *   INTERVAL="0 */6 * * *" node cron/scheduler.js  ← every 6 hours
 *   INTERVAL="*/30 * * * *" node cron/scheduler.js  ← every 30 min
 *
 * Cron fields: minute hour day-of-month month day-of-week (all UTC)
 */

import cron from 'node-cron'
import { runCheck } from './watch-alert.js'

const INTERVAL = process.env.INTERVAL || '0 * * * *'   // default: top of every hour

if (!cron.validate(INTERVAL)) {
  console.error(`❌  Invalid cron expression: "${INTERVAL}"`)
  console.error('    Example: "0 * * * *" = every hour, "0 */6 * * *" = every 6 hours')
  process.exit(1)
}

// Human-readable description of common intervals
function describeInterval(expr) {
  const presets = {
    '0 * * * *':     'every hour',
    '0 */2 * * *':   'every 2 hours',
    '0 */6 * * *':   'every 6 hours',
    '0 */12 * * *':  'every 12 hours',
    '0 0 * * *':     'daily at midnight UTC',
    '*/30 * * * *':  'every 30 minutes',
    '*/15 * * * *':  'every 15 minutes',
  }
  return presets[expr] ?? expr
}

console.log('🚀  OpenRouter Model Watcher started')
console.log(`📅  Schedule: ${describeInterval(INTERVAL)} (${INTERVAL})`)
console.log('    Press Ctrl+C to stop.\n')

// Run once immediately on startup so you don't wait for the first tick
runCheck().catch(err => console.error('Check failed:', err.message))

// Then run on schedule
cron.schedule(INTERVAL, () => {
  runCheck().catch(err => console.error('Check failed:', err.message))
})

// Graceful shutdown
process.on('SIGINT',  () => { console.log('\n👋  Scheduler stopped.'); process.exit(0) })
process.on('SIGTERM', () => { console.log('\n👋  Scheduler stopped.'); process.exit(0) })
