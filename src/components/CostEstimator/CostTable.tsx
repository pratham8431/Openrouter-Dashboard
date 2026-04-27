import { Download } from 'lucide-react'
import type { Model } from '../../types/openrouter'
import { estimateTokens } from '../../lib/tokenizer'
import { downloadCSV } from '../../lib/export'
import type { CostInputs } from './InputForm'

interface CostRow {
  model: string
  id: string
  perRequest: number
  monthly: number
  yearly: number
}

function computeRows(models: Model[], inputs: CostInputs): CostRow[] {
  const promptTokens = estimateTokens(inputs.prompt)
  const rows: CostRow[] = []

  for (const m of models) {
    const inPrice = Number(m.pricing.prompt)
    const outPrice = Number(m.pricing.completion)
    if (!inPrice && !outPrice) continue

    const perRequest = promptTokens * inPrice + inputs.avgOutputTokens * outPrice
    const monthly = perRequest * inputs.volume
    if (inputs.maxBudget > 0 && monthly > inputs.maxBudget) continue

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

interface Props {
  models: Model[]
  inputs: CostInputs
}

export default function CostTable({ models, inputs }: Props) {
  const rows = computeRows(models, inputs)

  const handleExport = () => {
    downloadCSV(
      rows.map(r => ({ Model: r.model, ID: r.id, 'Per request': fmt(r.perRequest), 'Monthly': fmt(r.monthly), 'Yearly': fmt(r.yearly) })),
      'openrouter-cost-estimate.csv'
    )
  }

  if (!rows.length) {
    return (
      <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: 32, textAlign: 'center' }}>
        <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#4A4A60' }}>
          No models within your budget. Try increasing the max budget or adding a prompt.
        </p>
      </div>
    )
  }

  return (
    <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 600, color: '#fff' }}>
          Cost comparison — top {rows.length} models
        </span>
        <button
          onClick={handleExport}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 5, padding: '5px 12px', cursor: 'pointer',
            fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#8888A0',
          }}
        >
          <Download size={12} />
          Export CSV
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              {['', 'Model', 'Per request', 'Monthly', 'Yearly'].map(h => (
                <th key={h} style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#4A4A60', textAlign: 'left', padding: '8px 16px', fontWeight: 400 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.id} style={{ background: i === 0 ? 'rgba(16,185,129,0.04)' : '', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '10px 16px', width: 90 }}>
                  {i === 0 && (
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, background: 'rgba(16,185,129,0.15)', color: '#10B981', borderRadius: 4, padding: '2px 6px' }}>
                      best value
                    </span>
                  )}
                </td>
                <td style={{ padding: '10px 16px' }}>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#E8E8F0' }}>{row.model}</div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#4A4A60' }}>{row.id}</div>
                </td>
                <td style={{ padding: '10px 16px', fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#A5B4FC' }}>{fmt(row.perRequest)}</td>
                <td style={{ padding: '10px 16px', fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#E8E8F0' }}>{fmt(row.monthly)}</td>
                <td style={{ padding: '10px 16px', fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#8888A0' }}>{fmt(row.yearly)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
