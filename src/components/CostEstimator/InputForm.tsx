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

const inputStyle: React.CSSProperties = {
  background: '#18181F',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 6,
  padding: '8px 12px',
  fontFamily: 'DM Mono, monospace',
  fontSize: 12,
  color: '#E8E8F0',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  fontFamily: 'DM Mono, monospace',
  fontSize: 11,
  color: '#8888A0',
  marginBottom: 6,
  display: 'block',
}

export default function InputForm({ inputs, onChange }: Props) {
  const tokens = estimateTokens(inputs.prompt)

  const set = (k: keyof CostInputs, v: string | number) =>
    onChange({ ...inputs, [k]: v })

  return (
    <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: 24 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <label style={labelStyle}>Your prompt / representative sample</label>
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#6366F1' }}>
            ~{tokens.toLocaleString()} tokens
          </span>
        </div>
        <textarea
          rows={5}
          value={inputs.prompt}
          onChange={e => set('prompt', e.target.value)}
          placeholder="Paste your prompt here to estimate token count and cost..."
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
        <div>
          <label style={labelStyle}>Monthly requests</label>
          <input
            type="number"
            style={inputStyle}
            value={inputs.volume}
            min={1}
            onChange={e => set('volume', Number(e.target.value))}
          />
        </div>
        <div>
          <label style={labelStyle}>Avg output tokens</label>
          <input
            type="number"
            style={inputStyle}
            value={inputs.avgOutputTokens}
            min={1}
            onChange={e => set('avgOutputTokens', Number(e.target.value))}
          />
        </div>
        <div>
          <label style={labelStyle}>Max monthly budget ($)</label>
          <input
            type="number"
            style={inputStyle}
            value={inputs.maxBudget}
            min={0}
            onChange={e => set('maxBudget', Number(e.target.value))}
          />
        </div>
      </div>
    </div>
  )
}

export type { CostInputs }
