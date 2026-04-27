import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { Priorities } from '../../types/openrouter'

const PRESETS = ['Code gen', 'Support bot', 'Long doc summary', 'Creative writing', 'Data extraction', 'RAG / Q&A']

interface Props {
  onSubmit: (useCase: string, priorities: Priorities) => void
  loading: boolean
}

export default function UseCaseForm({ onSubmit, loading }: Props) {
  const [useCase, setUseCase] = useState('')
  const [priorities, setPriorities] = useState<Priorities>({ quality: 7, speed: 5, cost: 5 })

  const labelStyle: React.CSSProperties = {
    fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#8888A0', marginBottom: 6, display: 'block',
  }

  return (
    <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: 24 }}>
      {/* Use case textarea */}
      <label style={labelStyle}>Describe your use case</label>
      <textarea
        value={useCase}
        onChange={e => setUseCase(e.target.value)}
        rows={4}
        placeholder="e.g. I'm building a customer support bot that handles billing questions. Responses need to be accurate and fast. Volume is ~50k requests/day."
        style={{
          width: '100%',
          background: '#18181F',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 6,
          padding: '10px 14px',
          fontFamily: 'DM Mono, monospace',
          fontSize: 12,
          color: '#E8E8F0',
          outline: 'none',
          resize: 'vertical',
          boxSizing: 'border-box',
        }}
      />

      {/* Presets */}
      <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {PRESETS.map(p => (
          <button
            key={p}
            onClick={() => setUseCase(p)}
            style={{
              background: useCase === p ? 'rgba(99,102,241,0.15)' : '#18181F',
              border: `1px solid ${useCase === p ? '#6366F1' : 'rgba(255,255,255,0.07)'}`,
              borderRadius: 4,
              padding: '4px 10px',
              fontFamily: 'DM Mono, monospace',
              fontSize: 11,
              color: useCase === p ? '#818CF8' : '#8888A0',
              cursor: 'pointer',
            }}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Priority sliders */}
      <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        {(Object.entries(priorities) as [keyof Priorities, number][]).map(([key, val]) => (
          <div key={key}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#8888A0' }}>
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </span>
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#6366F1' }}>{val}</span>
            </div>
            <input
              type="range"
              min={0}
              max={10}
              value={val}
              onChange={e => setPriorities(p => ({ ...p, [key]: Number(e.target.value) }))}
              style={{ width: '100%', accentColor: '#6366F1' }}
            />
          </div>
        ))}
      </div>

      {/* Submit */}
      <button
        onClick={() => useCase.trim() && onSubmit(useCase, priorities)}
        disabled={!useCase.trim() || loading}
        style={{
          marginTop: 20,
          width: '100%',
          padding: '10px',
          background: useCase.trim() && !loading ? '#6366F1' : '#18181F',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 6,
          fontFamily: 'DM Mono, monospace',
          fontSize: 12,
          color: useCase.trim() && !loading ? '#fff' : '#4A4A60',
          cursor: useCase.trim() && !loading ? 'pointer' : 'not-allowed',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          transition: 'background 0.15s',
        }}
      >
        {loading && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
        {loading ? 'Getting recommendations...' : 'Get AI recommendations →'}
      </button>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
