import { Copy, Check } from 'lucide-react'
import { useState } from 'react'
import type { Recommendation } from '../../types/openrouter'

const BAR_COLORS = { quality: '#6366F1', speed: '#14B8A6', cost: '#10B981' }

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#8888A0' }}>{label}</span>
        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color }}>{value}/10</span>
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
        <div style={{ height: '100%', width: `${value * 10}%`, background: color, borderRadius: 2, transition: 'width 0.5s' }} />
      </div>
    </div>
  )
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
      }}
    >
      {copied ? <Check size={10} /> : <Copy size={10} />}
      {copied ? 'copied!' : 'copy id'}
    </button>
  )
}

interface Props { recommendations: Recommendation[] }

export default function ResultsPanel({ recommendations }: Props) {
  if (!recommendations.length) return null

  return (
    <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
      {recommendations.map(rec => (
        <div
          key={rec.id}
          style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: 20 }}
        >
          {/* Rank + name */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{
                  fontFamily: 'Syne, sans-serif', fontSize: 11, fontWeight: 700,
                  background: 'rgba(99,102,241,0.15)', color: '#818CF8',
                  borderRadius: 4, padding: '2px 7px',
                }}>
                  #{rec.rank}
                </span>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#E8E8F0', fontWeight: 500 }}>
                  {rec.name}
                </span>
              </div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#4A4A60' }}>
                {rec.id}
              </div>
            </div>
            <CopyBtn id={rec.id} />
          </div>

          {/* Reason */}
          <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#8888A0', lineHeight: 1.6, marginBottom: 14 }}>
            {rec.reason}
          </p>

          {/* Score bars */}
          <ScoreBar label="Quality" value={rec.quality} color={BAR_COLORS.quality} />
          <ScoreBar label="Speed" value={rec.speed} color={BAR_COLORS.speed} />
          <ScoreBar label="Cost efficiency" value={rec.cost} color={BAR_COLORS.cost} />
        </div>
      ))}
    </div>
  )
}
