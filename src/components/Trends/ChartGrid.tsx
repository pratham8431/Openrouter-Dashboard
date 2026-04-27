import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { Model } from '../../types/openrouter'

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

// Curated reference data for model launch cadence and price trend (PRD §4.4.1)
const LAUNCH_DATA = [
  { month: 'Oct', count: 18 }, { month: 'Nov', count: 22 }, { month: 'Dec', count: 15 },
  { month: 'Jan', count: 31 }, { month: 'Feb', count: 28 }, { month: 'Mar', count: 35 }, { month: 'Apr', count: 12 },
]

const PRICE_TREND = [
  { month: 'Oct', price: 4.2 }, { month: 'Nov', price: 3.8 }, { month: 'Dec', price: 3.5 },
  { month: 'Jan', price: 2.9 }, { month: 'Feb', price: 2.4 }, { month: 'Mar', price: 1.8 }, { month: 'Apr', price: 1.5 },
]

const tooltipStyle = { background: '#18181F', border: '1px solid rgba(255,255,255,0.07)', fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#E8E8F0' }
const axisStyle = { fontFamily: 'DM Mono, monospace', fontSize: 10, fill: '#4A4A60' }

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: 20 }}>
      <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 600, color: '#fff', margin: '0 0 16px' }}>{title}</h3>
      {children}
    </div>
  )
}

interface Props { models: Model[] }

export default function ChartGrid({ models }: Props) {
  const providerData = buildProviderData(models)
  const contextData = buildContextData(models)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, padding: '0 28px 28px' }}>
      {/* New models per month */}
      <ChartCard title="New models per month">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={LAUNCH_DATA} barSize={20}>
            <XAxis dataKey="month" tick={axisStyle} axisLine={false} tickLine={false} />
            <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar dataKey="count" fill="#6366F1" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Models by provider */}
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

      {/* Avg price trend */}
      <ChartCard title="Avg input price trend ($/M tokens)">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={PRICE_TREND} barSize={20}>
            <XAxis dataKey="month" tick={axisStyle} axisLine={false} tickLine={false} />
            <YAxis tick={axisStyle} axisLine={false} tickLine={false} unit="$" />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.03)' }} formatter={(v) => [`$${v}`, 'Avg price/M']} />
            <Bar dataKey="price" fill="#14B8A6" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Context window distribution */}
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
