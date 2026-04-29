import type { WatchRule } from '../types/openrouter'

const RULES_KEY = 'or_watchrules'

export function getWatchRules(): WatchRule[] {
  try {
    const raw = localStorage.getItem(RULES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function getWatchRule(modelId: string): WatchRule | undefined {
  return getWatchRules().find(r => r.modelId === modelId)
}

export function setWatchRule(rule: WatchRule): void {
  try {
    const rules = getWatchRules().filter(r => r.modelId !== rule.modelId)
    localStorage.setItem(RULES_KEY, JSON.stringify([...rules, rule]))
  } catch { /* noop */ }
}

export function removeWatchRule(modelId: string): void {
  try {
    const rules = getWatchRules().filter(r => r.modelId !== modelId)
    localStorage.setItem(RULES_KEY, JSON.stringify(rules))
  } catch { /* noop */ }
}

export function isWatched(modelId: string): boolean {
  return getWatchRules().some(r => r.modelId === modelId)
}

export function getWatchlist(): string[] {
  return getWatchRules().map(r => r.modelId)
}

export function exportWatchlistConfig(userEmail: string): string {
  return JSON.stringify({
    email: userEmail,
    rules: getWatchRules(),
    gmailUser: 'testspeeedy.ai@gmail.com',
    gmailAppPassword: '',
    anthropicApiKey: '',
  }, null, 2)
}
