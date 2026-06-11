import { useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import type { Priorities } from '../../types/openrouter'

const PRESETS = ['Code gen', 'Support bot', 'RAG', 'Summarization', 'Classification', 'Creative writing']

const PRIORITY_LABELS: Record<keyof Priorities, [string, string]> = {
  quality: ['Low', 'High'],
  speed:   ['Slow', 'Fast'],
  cost:    ['Expensive', 'Budget'],
}

interface Props {
  onSubmit: (useCase: string, priorities: Priorities) => void
  loading: boolean
}

export default function UseCaseForm({ onSubmit, loading }: Props) {
  const [useCase, setUseCase] = useState('')
  const [priorities, setPriorities] = useState<Priorities>({ quality: 7, speed: 5, cost: 3 })

  const sectionLabel: React.CSSProperties = {
    fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#555',
    letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12,
  }

  const card: React.CSSProperties = {
    background: '#111111', border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 12, padding: 20, marginBottom: 12,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* INPUT section */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={sectionLabel}>Input</span>
        </div>
        <textarea
          value={useCase}
          onChange={e => setUseCase(e.target.value)}
          rows={4}
          placeholder="Describe your use case (e.g., 'I need a fast model for real-time customer support chat with low latency...')"
          style={{
            width: '100%', background: '#0D0D0D',
            border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8,
            padding: '12px 14px', fontFamily: 'DM Mono, monospace',
            fontSize: 12, color: '#F0F0F0', outline: 'none',
            resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.6,
          }}
        />

        {/* Preset chips */}
        <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {PRESETS.map(p => {
            const active = useCase === p
            return (
              <button
                key={p}
                onClick={() => setUseCase(p)}
                style={{
                  padding: '5px 12px', borderRadius: 20,
                  background: active ? '#7C3AED' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${active ? '#7C3AED' : 'rgba(255,255,255,0.08)'}`,
                  fontFamily: 'DM Mono, monospace', fontSize: 11,
                  color: active ? '#fff' : '#888', cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {p}
              </button>
            )
          })}
        </div>
      </div>

      {/* OPTIMIZATION PRIORITY section */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={sectionLabel}>Optimization Priority</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {(Object.entries(priorities) as [keyof Priorities, number][]).map(([key, val]) => {
            const [left, right] = PRIORITY_LABELS[key]
            return (
              <div key={key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#F0F0F0' }}>
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </span>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#7C3AED' }}>
                    {val >= 8 ? right : val <= 3 ? left : 'Medium'}
                  </span>
                </div>
                <input
                  type="range" min={0} max={10} value={val}
                  onChange={e => setPriorities(p => ({ ...p, [key]: Number(e.target.value) }))}
                  style={{ width: '100%' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#444' }}>{left}</span>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#444' }}>{right}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Submit */}
      <button
        onClick={() => useCase.trim() && onSubmit(useCase, priorities)}
        disabled={!useCase.trim() || loading}
        style={{
          width: '100%', padding: '14px',
          background: useCase.trim() && !loading
            ? 'linear-gradient(135deg, #7C3AED, #5B21B6)'
            : 'rgba(255,255,255,0.05)',
          border: 'none', borderRadius: 10,
          fontFamily: 'DM Mono, monospace', fontSize: 12, fontWeight: 600,
          color: useCase.trim() && !loading ? '#fff' : '#444',
          cursor: useCase.trim() && !loading ? 'pointer' : 'not-allowed',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          transition: 'all 0.15s', letterSpacing: '0.05em',
        }}
      >
        {loading
          ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
          : <Sparkles size={14} />
        }
        {loading ? 'Getting recommendations...' : 'GET AI RECOMMENDATIONS'}
      </button>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
