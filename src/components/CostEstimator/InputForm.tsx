import { Info } from 'lucide-react'
import { estimateTokens } from '../../lib/tokenizer'

interface CostInputs {
  prompt: string
  volume: number
  avgOutputTokens: number
  maxBudget: number
}

interface Props {
  inputs: CostInputs
  onChange: (inputs: CostInputs) => void
}

const sectionLabel: React.CSSProperties = {
  fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#555',
  letterSpacing: '0.1em', textTransform: 'uppercase',
}

export default function InputForm({ inputs, onChange }: Props) {
  const tokens = estimateTokens(inputs.prompt)
  const set = (k: keyof CostInputs, v: string | number) => onChange({ ...inputs, [k]: v })

  const statCard: React.CSSProperties = {
    background: '#111111', border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 10, padding: '14px 18px', flex: 1,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Prompt card */}
      <div style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={sectionLabel}>Sample Prompt Analysis</span>
          <Info size={13} color="#444" />
        </div>
        <textarea
          rows={4}
          value={inputs.prompt}
          onChange={e => set('prompt', e.target.value)}
          placeholder="Paste your system or user prompt here to estimate token count..."
          style={{
            width: '100%', background: '#0D0D0D',
            border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8,
            padding: '12px 14px', fontFamily: 'DM Mono, monospace',
            fontSize: 12, color: '#F0F0F0', outline: 'none',
            resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.6,
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, marginTop: 10 }}>
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#555' }}>
            Characters: {inputs.prompt.length}
          </span>
          <span style={{
            fontFamily: 'DM Mono, monospace', fontSize: 10,
            background: 'rgba(124,58,237,0.15)', color: '#A78BFA',
            borderRadius: 4, padding: '2px 8px',
          }}>
            Est. Tokens: {tokens.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 10 }}>
        {[
          { label: 'Monthly Requests', key: 'volume' as keyof CostInputs, icon: '⟳' },
          { label: 'Avg Output Tokens', key: 'avgOutputTokens' as keyof CostInputs, icon: '◻' },
          { label: 'Max Budget ($)', key: 'maxBudget' as keyof CostInputs, icon: '◈' },
        ].map(({ label, key, icon }) => (
          <div key={key} style={statCard}>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#555', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
              {icon} {label}
            </div>
            <input
              type="number"
              value={inputs[key] as number}
              min={0}
              onChange={e => set(key, Number(e.target.value))}
              style={{
                background: 'none', border: 'none', outline: 'none',
                fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 700,
                color: '#F0F0F0', width: '100%', padding: 0,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export type { CostInputs }
