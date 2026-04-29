import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { Model } from '../../types/openrouter'

const PRICE_HISTORY_KEY = 'or_price_history'

interface PricePoint { date: string; price: number }

function getProvider(id: string) { return id.split('/')[0] ?? id }

function buildProviderData(models: Model[]) {
  const counts: Record<string, number> = {}
  for (const m of models) { const p = getProvider(m.id); counts[p] = (counts[p] ?? 0) + 1 }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name, count }))
}

function buildContextData(models: Model[]) {
  const buckets = { '<32k': 0, '32–128k': 0, '128k–1M': 0, '>1M': 0 }
  for (const m of models) {
    const c = m.context_length
    if (c < 32_000) buckets['<32k']++
    else if (c < 128_000) buckets['32–128k']++
    else if (c < 1_000_000) buckets['128k–1M']++
    else buckets['>1M']++
  }
  return Object.entries(buckets).map(([name, count]) => ({ name, count }))
}

// Group models by creation month using model.created (Unix timestamp)
function buildLaunchData(models: Model[]) {
  const counts: Record<string, number> = {}
  for (const m of models) {
    if (!m.created) continue
    const d = new Date(m.created * 1000)
    const key = d.toLocaleString('default', { month: 'short', year: '2-digit' })
    counts[key] = (counts[key] ?? 0) + 1
  }
  // Sort chronologically and take last 12 months
  const sorted = Object.entries(counts)
    .map(([month, count]) => {
      // find a model in that month to get a sortable date
      const sample = models.find(m => {
        if (!m.created) return false
        const d = new Date(m.created * 1000)
        return d.toLocaleString('default', { month: 'short', year: '2-digit' }) === month
      })
      return { month, count, ts: sample?.created ?? 0 }
    })
    .sort((a, b) => a.ts - b.ts)
    .slice(-12)
    .map(({ month, count }) => ({ month, count }))
  return sorted
}

// Persist avg price snapshot per day to localStorage, return rolling history
function buildPriceTrend(models: Model[]): PricePoint[] {
  const priced = models.filter(m => Number(m.pricing.prompt) > 0)
  const avgPrice = priced.length
    ? priced.reduce((sum, m) => sum + Number(m.pricing.prompt) * 1e6, 0) / priced.length
    : 0

  const today = new Date().toISOString().slice(0, 10)

  let history: PricePoint[] = []
  try {
    const raw = localStorage.getItem(PRICE_HISTORY_KEY)
    history = raw ? JSON.parse(raw) : []
  } catch { history = [] }

  // Upsert today's entry
  const existing = history.findIndex(p => p.date === today)
  const point: PricePoint = { date: today, price: parseFloat(avgPrice.toFixed(2)) }
  if (existing >= 0) history[existing] = point
  else history.push(point)

  // Keep last 30 days
  history = history.slice(-30)
  try { localStorage.setItem(PRICE_HISTORY_KEY, JSON.stringify(history)) } catch { /* quota */ }

  // Format for chart: show short date label
  return history.map(p => ({
    date: new Date(p.date).toLocaleString('default', { month: 'short', day: 'numeric' }),
    price: p.price,
  }))
}

const tooltipStyle = {
  background: '#18181F', border: '1px solid rgba(255,255,255,0.07)',
  fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#E8E8F0',
}
const axisStyle = { fontFamily: 'DM Mono, monospace', fontSize: 10, fill: '#4A4A60' }

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: 20 }}>
      <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 600, color: '#fff', margin: '0 0 2px' }}>{title}</h3>
      {subtitle && <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#4A4A60', margin: '0 0 14px' }}>{subtitle}</p>}
      {!subtitle && <div style={{ marginBottom: 14 }} />}
      {children}
    </div>
  )
}

interface Props { models: Model[] }

export default function ChartGrid({ models }: Props) {
  const providerData = buildProviderData(models)
  const contextData = buildContextData(models)
  const launchData = buildLaunchData(models)
  const priceTrend = buildPriceTrend(models)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, padding: '0 28px 28px' }}>
      {/* New models per month — dynamic from model.created timestamps */}
      <ChartCard title="New models per month" subtitle="Grouped by model creation date from OpenRouter API">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={launchData} barSize={20}>
            <XAxis dataKey="month" tick={axisStyle} axisLine={false} tickLine={false} />
            <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar dataKey="count" fill="#6366F1" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Models by provider — dynamic */}
      <ChartCard title="Models by provider">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={providerData} layout="vertical" barSize={12}>
            <XAxis type="number" tick={axisStyle} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} width={80} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar dataKey="count" radius={[0, 3, 3, 0]}>
              {providerData.map((_, i) => (
                <Cell key={i} fill={i === 0 ? '#6366F1' : i < 3 ? '#818CF8' : '#2a2a4a'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Avg price trend — accumulates from localStorage across sessions */}
      <ChartCard title="Avg input price trend ($/M tokens)" subtitle={`${priceTrend.length} day${priceTrend.length !== 1 ? 's' : ''} of data recorded`}>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={priceTrend} barSize={priceTrend.length > 14 ? 10 : 20}>
            <XAxis dataKey="date" tick={axisStyle} axisLine={false} tickLine={false} />
            <YAxis tick={axisStyle} axisLine={false} tickLine={false} unit="$" />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.03)' }} formatter={(v) => [`$${v}`, 'Avg price/M']} />
            <Bar dataKey="price" fill="#14B8A6" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Context window distribution — dynamic */}
      <ChartCard title="Context window distribution">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={contextData} layout="vertical" barSize={18}>
            <XAxis type="number" tick={axisStyle} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} width={70} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar dataKey="count" radius={[0, 3, 3, 0]}>
              {contextData.map((_, i) => (
                <Cell key={i} fill={['#4A4A60', '#6366F1', '#818CF8', '#10B981'][i] ?? '#6366F1'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  )
}
