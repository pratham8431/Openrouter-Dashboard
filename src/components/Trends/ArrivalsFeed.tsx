import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import type { ModelWithStatus } from '../../types/openrouter'

function fmtPrice(p: string) {
  const n = Number(p)
  if (!n) return '—'
  return `$${(n * 1_000_000).toFixed(n * 1e6 < 1 ? 3 : 2)}/M`
}

function fmtCtx(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`
  return String(n)
}

function CopyBtn({ id }: { id: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(id); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      style={{
        display: 'flex', alignItems: 'center', gap: 4,
        background: 'none', border: `1px solid ${copied ? '#10B981' : 'rgba(255,255,255,0.1)'}`,
        borderRadius: 4, padding: '3px 8px', cursor: 'pointer',
        fontFamily: 'DM Mono, monospace', fontSize: 10,
        color: copied ? '#10B981' : '#8888A0',
        whiteSpace: 'nowrap',
      }}
    >
      {copied ? <Check size={10} /> : <Copy size={10} />}
      {copied ? 'copied!' : 'copy id'}
    </button>
  )
}

interface Props { models: ModelWithStatus[] }

export default function ArrivalsFeed({ models }: Props) {
  const newModels = models.filter(m => m.status === 'new')

  return (
    <div style={{ padding: '0 28px 28px' }}>
      <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 600, color: '#fff' }}>New arrivals</span>
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, background: 'rgba(16,185,129,0.15)', color: '#10B981', borderRadius: 10, padding: '2px 8px' }}>
            {newModels.length} new
          </span>
        </div>
        {newModels.length === 0 ? (
          <div style={{ padding: '28px', textAlign: 'center', fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#4A4A60' }}>
            No new models detected since last visit. Check back after the next snapshot.
          </div>
        ) : (
          newModels.map(m => (
            <div
              key={m.id}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', flexWrap: 'wrap', gap: 8 }}
            >
              <div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#E8E8F0', fontWeight: 500 }}>{m.name}</div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#4A4A60', marginTop: 2 }}>{m.id}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#8888A0' }}>ctx {fmtCtx(m.context_length)}</span>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#A5B4FC' }}>{fmtPrice(m.pricing.prompt)}</span>
                <CopyBtn id={m.id} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
