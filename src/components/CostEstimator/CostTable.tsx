import { Download } from 'lucide-react'
import type { Model } from '../../types/openrouter'
import { estimateTokens } from '../../lib/tokenizer'
import { downloadCSV } from '../../lib/export'
import type { CostInputs } from './InputForm'

interface CostRow { model: string; id: string; perRequest: number; monthly: number; yearly: number }

function computeRows(models: Model[], inputs: CostInputs): CostRow[] {
  const promptTokens = estimateTokens(inputs.prompt)
  const rows: CostRow[] = []
  for (const m of models) {
    const inPrice = Number(m.pricing.prompt)
    const outPrice = Number(m.pricing.completion)
    if (!inPrice && !outPrice) continue
    const perRequest = promptTokens * inPrice + inputs.avgOutputTokens * outPrice
    const monthly = perRequest * inputs.volume
    rows.push({ model: m.name, id: m.id, perRequest, monthly, yearly: monthly * 12 })
  }
  return rows.sort((a, b) => a.monthly - b.monthly).slice(0, 15)
}

function fmt(n: number) {
  if (n < 0.001) return `$${(n * 1000).toFixed(4)}m`
  if (n < 1) return `$${n.toFixed(4)}`
  if (n < 1000) return `$${n.toFixed(2)}`
  return `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

function getBudgetBadge(monthly: number, maxBudget: number, rank: number): { label: string; color: string; bg: string } | null {
  if (rank === 0) return { label: 'Optimal Choice', color: '#A78BFA', bg: 'rgba(124,58,237,0.15)' }
  if (rank === 1) return { label: 'High Efficiency', color: '#10B981', bg: 'rgba(16,185,129,0.12)' }
  if (maxBudget > 0 && monthly > maxBudget) return { label: 'Over Budget', color: '#EF4444', bg: 'rgba(239,68,68,0.12)' }
  if (maxBudget > 0 && monthly <= maxBudget) return { label: 'Within Budget', color: '#10B981', bg: 'rgba(16,185,129,0.12)' }
  return null
}

function providerInitial(id: string) {
  const p = id.split('/')[0] ?? id
  return p.slice(0, 2).toUpperCase()
}

interface Props { models: Model[]; inputs: CostInputs }

export default function CostTable({ models, inputs }: Props) {
  const rows = computeRows(models, inputs)

  if (!rows.length) return (
    <div style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 40, textAlign: 'center' }}>
      <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#444' }}>
        No models to display. Add a prompt above to compute costs.
      </p>
    </div>
  )

  return (
    <div style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, color: '#fff' }}>
            Top Model Projections
          </div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#555', marginTop: 2 }}>
            Real-time pricing synced from OpenRouter
          </div>
        </div>
        <button
          onClick={() => downloadCSV(
            rows.map(r => ({ Model: r.model, ID: r.id, 'Per request': fmt(r.perRequest), Monthly: fmt(r.monthly), Yearly: fmt(r.yearly) })),
            'openrouter-cost-estimate.csv'
          )}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)',
            borderRadius: 8, padding: '7px 14px', cursor: 'pointer',
            fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#A78BFA',
          }}
        >
          <Download size={12} />
          Export CSV
        </button>
      </div>

      {/* Rows */}
      <div>
        {rows.map((row, i) => {
          const badge = getBudgetBadge(row.monthly, inputs.maxBudget, i)
          return (
            <div
              key={row.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)',
                background: i === 0 ? 'rgba(124,58,237,0.04)' : '',
              }}
            >
              {/* Avatar */}
              <div style={{
                width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                background: `hsl(${(i * 47 + 260) % 360}, 50%, 20%)`,
                border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#888',
              }}>
                {providerInitial(row.id)}
              </div>

              {/* Name + ID */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#F0F0F0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {row.model}
                </div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#444', marginTop: 2 }}>
                  {row.id.split('/')[1] ?? row.id}
                </div>
              </div>

              {/* Monthly cost */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, color: '#F0F0F0' }}>
                  {fmt(row.monthly)}<span style={{ fontSize: 11, fontWeight: 400, color: '#555' }}>/mo</span>
                </div>
                {badge && (
                  <div style={{
                    fontFamily: 'DM Mono, monospace', fontSize: 9, marginTop: 4,
                    color: badge.color, background: badge.bg,
                    borderRadius: 4, padding: '2px 8px', display: 'inline-block',
                  }}>
                    {badge.label}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#555' }}>
          Showing top {rows.length} models based on criteria
        </span>
      </div>
    </div>
  )
}
