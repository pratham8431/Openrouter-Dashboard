import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, CartesianGrid,
  PieChart, Pie,
} from 'recharts'
import type { Model } from '../../types/openrouter'

const PRICE_HISTORY_KEY = 'or_price_history'
interface PricePoint { date: string; price: number }

function getProvider(id: string) { return id.split('/')[0] ?? id }

function buildProviderData(models: Model[]) {
  const counts: Record<string, number> = {}
  for (const m of models) { const p = getProvider(m.id); counts[p] = (counts[p] ?? 0) + 1 }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, count]) => ({ name, count }))
}

function buildContextData(models: Model[]) {
  const buckets: Record<string, number> = { '>128k': 0, '32–128k': 0, '<32k': 0 }
  for (const m of models) {
    const c = m.context_length
    if (c >= 128_000) buckets['>128k']++
    else if (c >= 32_000) buckets['32–128k']++
    else buckets['<32k']++
  }
  const total = Object.values(buckets).reduce((s, v) => s + v, 0)
  const colors = ['#7C3AED', '#A78BFA', '#444']
  return Object.entries(buckets).map(([name, value], i) => ({
    name, value,
    pct: total ? Math.round((value / total) * 100) : 0,
    fill: colors[i],
  }))
}

function buildLaunchData(models: Model[]) {
  const counts: Record<string, number> = {}
  for (const m of models) {
    if (!m.created) continue
    const d = new Date(m.created * 1000)
    const key = d.toLocaleString('default', { month: 'short', year: '2-digit' })
    counts[key] = (counts[key] ?? 0) + 1
  }
  return Object.entries(counts)
    .map(([month, count]) => {
      const sample = models.find(m => {
        if (!m.created) return false
        const d = new Date(m.created * 1000)
        return d.toLocaleString('default', { month: 'short', year: '2-digit' }) === month
      })
      return { month, count, ts: sample?.created ?? 0 }
    })
    .sort((a, b) => a.ts - b.ts)
    .slice(-8)
    .map(({ month, count }) => ({ month, count }))
}

function buildPriceTrend(models: Model[]): PricePoint[] {
  const priced = models.filter(m => Number(m.pricing.prompt) > 0)
  const avgPrice = priced.length
    ? priced.reduce((sum, m) => sum + Number(m.pricing.prompt) * 1e6, 0) / priced.length
    : 0
  const today = new Date().toISOString().slice(0, 10)

  let history: PricePoint[] = []
  try { const raw = localStorage.getItem(PRICE_HISTORY_KEY); history = raw ? JSON.parse(raw) : [] } catch { history = [] }

  const existing = history.findIndex(p => p.date === today)
  const point: PricePoint = { date: today, price: parseFloat(avgPrice.toFixed(2)) }
  if (existing >= 0) history[existing] = point
  else history.push(point)
  history = history.slice(-30)
  try { localStorage.setItem(PRICE_HISTORY_KEY, JSON.stringify(history)) } catch { /* quota */ }

  return history.map(p => ({
    date: new Date(p.date).toLocaleString('default', { month: 'short', day: 'numeric' }),
    price: p.price,
  }))
}

const tooltipStyle = {
  background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.08)',
  fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#F0F0F0',
  borderRadius: 6,
}
const axisStyle = { fontFamily: 'DM Mono, monospace', fontSize: 10, fill: '#444' }

function SectionLabel({ children }: { children: string }) {
  return (
    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#555', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 14 }}>
      {children}
    </div>
  )
}

function ChartCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 20 }}>
      <SectionLabel>{label}</SectionLabel>
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

  // Dominant context bucket for center label
  const dominant = contextData.reduce((a, b) => a.value > b.value ? a : b, contextData[0] ?? { name: '—', pct: 0 })

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, padding: '0 28px 28px' }}>

      {/* New models per month — bar */}
      <ChartCard label="New models per month">
        <ResponsiveContainer width="100%" height={190}>
          <BarChart data={launchData} barSize={22}>
            <XAxis dataKey="month" tick={axisStyle} axisLine={false} tickLine={false} />
            <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {launchData.map((_, i) => (
                <Cell key={i} fill={i === launchData.length - 1 ? '#7C3AED' : `rgba(124,58,237,${0.3 + i * 0.07})`} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Models by provider — horizontal bar with counts */}
      <ChartCard label="Models by provider">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {providerData.map((d, i) => {
            const max = providerData[0]?.count ?? 1
            return (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#888', width: 70, flexShrink: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {d.name}
                </div>
                <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', borderRadius: 3, height: 8, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 3,
                    width: `${(d.count / max) * 100}%`,
                    background: i === 0 ? '#7C3AED' : i < 3 ? '#A78BFA' : '#333',
                    transition: 'width 0.4s ease',
                  }} />
                </div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#888', width: 24, textAlign: 'right', flexShrink: 0 }}>
                  {d.count}
                </div>
              </div>
            )
          })}
        </div>
      </ChartCard>

      {/* Avg price trend — line chart */}
      <ChartCard label="Avg input price trend">
        <ResponsiveContainer width="100%" height={190}>
          <LineChart data={priceTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="date" tick={axisStyle} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={axisStyle} axisLine={false} tickLine={false} unit="$" width={40} />
            <Tooltip
              contentStyle={tooltipStyle}
              cursor={{ stroke: 'rgba(124,58,237,0.3)', strokeWidth: 1 }}
              formatter={(v) => [`$${v}`, 'Avg/M tokens']}
            />
            <Line
              type="monotone" dataKey="price" stroke="#7C3AED" strokeWidth={2}
              dot={{ fill: '#7C3AED', r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#A78BFA' }}
            />
          </LineChart>
        </ResponsiveContainer>
        <div style={{ textAlign: 'right', marginTop: 4 }}>
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#555' }}>
            ${priceTrend[priceTrend.length - 1]?.price ?? '—'} / 1M tokens
          </span>
        </div>
      </ChartCard>

      {/* Context window — donut */}
      <ChartCard label="Context window sizes">
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ position: 'relative', width: 100, height: 100, flexShrink: 0 }}>
            <ResponsiveContainer width={100} height={100}>
              <PieChart>
                <Pie
                  data={contextData} cx="50%" cy="50%"
                  innerRadius={32} outerRadius={48}
                  dataKey="value" strokeWidth={0}
                >
                  {contextData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, color: '#F0F0F0' }}>
                {dominant.pct}%
              </span>
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 8, color: '#555' }}>
                {dominant.name}
              </span>
            </div>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {contextData.map(d => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: d.fill, flexShrink: 0 }} />
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#888', flex: 1 }}>
                  {d.name} Window
                </span>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#F0F0F0' }}>
                  {d.pct}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </ChartCard>
    </div>
  )
}
