import { useState } from 'react'
import { X, Bell, Trash2 } from 'lucide-react'
import type { WatchRule, Priorities } from '../../types/openrouter'
import { getWatchRule, setWatchRule, removeWatchRule } from '../../lib/watchlist'

interface Props {
  modelId: string
  modelName: string
  onClose: () => void
  onSave: () => void
  onRemove: () => void
}

const DEFAULT_PRIORITIES: Priorities = { quality: 7, speed: 5, cost: 7 }

export default function WatchRulePanel({ modelId, modelName, onClose, onSave, onRemove }: Props) {
  const existing = getWatchRule(modelId)
  const [useCase, setUseCase] = useState(existing?.useCase ?? '')
  const [priceThreshold, setPriceThreshold] = useState<string>(
    existing?.priceThreshold != null ? String(existing.priceThreshold) : ''
  )
  const [priorities, setPriorities] = useState<Priorities>(existing?.priorities ?? DEFAULT_PRIORITIES)

  const labelStyle: React.CSSProperties = {
    fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#8888A0', display: 'block', marginBottom: 6,
  }
  const inputStyle: React.CSSProperties = {
    width: '100%', background: '#0A0A0F', border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 6, padding: '8px 12px', fontFamily: 'DM Mono, monospace',
    fontSize: 12, color: '#E8E8F0', outline: 'none', boxSizing: 'border-box',
  }

  const handleSave = () => {
    const rule: WatchRule = {
      modelId,
      useCase: useCase.trim() || `Production use of ${modelName}`,
      priorities,
      priceThreshold: priceThreshold ? Number(priceThreshold) : undefined,
      triggerOnRemoval: true,
    }
    setWatchRule(rule)
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
    onSave()
    onClose()
  }

  const handleRemove = () => {
    removeWatchRule(modelId)
    onRemove()
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40 }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 380,
        background: '#111118', borderLeft: '1px solid rgba(255,255,255,0.07)',
        zIndex: 50, display: 'flex', flexDirection: 'column', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Bell size={14} style={{ color: '#F59E0B' }} />
              <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, color: '#fff' }}>
                Watch rule
              </span>
            </div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#4A4A60' }}>{modelId}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4A4A60', padding: 4 }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: 24, flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Use case */}
          <div>
            <label style={labelStyle}>What are you using this model for?</label>
            <textarea
              rows={3}
              value={useCase}
              onChange={e => setUseCase(e.target.value)}
              placeholder="e.g. Customer support bot that handles billing questions. Accuracy matters more than speed."
              style={{ ...inputStyle, resize: 'vertical' }}
            />
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#4A4A60', marginTop: 5 }}>
              Claude uses this to pick the best fallback when this model changes.
            </div>
          </div>

          {/* Price threshold */}
          <div>
            <label style={labelStyle}>Alert if price exceeds ($/M input tokens) — optional</label>
            <input
              type="number"
              min={0}
              step={0.5}
              value={priceThreshold}
              onChange={e => setPriceThreshold(e.target.value)}
              placeholder="e.g. 4.00"
              style={inputStyle}
            />
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#4A4A60', marginTop: 5 }}>
              Leave blank to alert on any change (price or removal).
            </div>
          </div>

          {/* Priority sliders */}
          <div>
            <label style={labelStyle}>Fallback priorities</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {(Object.entries(priorities) as [keyof Priorities, number][]).map(([key, val]) => (
                <div key={key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#8888A0' }}>
                      {key.charAt(0).toUpperCase() + key.slice(1)}
                    </span>
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#6366F1' }}>{val}/10</span>
                  </div>
                  <input
                    type="range" min={0} max={10} value={val}
                    onChange={e => setPriorities(p => ({ ...p, [key]: Number(e.target.value) }))}
                    style={{ width: '100%', accentColor: '#6366F1' }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Info box */}
          <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, padding: '12px 16px' }}>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#818CF8', lineHeight: 1.6 }}>
              When this model triggers, Claude will automatically recommend the best fallback from the live model catalog based on your use case and priorities.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 10 }}>
          <button
            onClick={handleSave}
            style={{
              flex: 1, padding: '10px', background: '#6366F1', border: 'none',
              borderRadius: 6, cursor: 'pointer', fontFamily: 'DM Mono, monospace',
              fontSize: 12, color: '#fff', fontWeight: 500,
            }}
          >
            {existing ? 'Update rule' : 'Save & watch'}
          </button>
          {existing && (
            <button
              onClick={handleRemove}
              style={{
                padding: '10px 14px', background: 'none',
                border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6,
                cursor: 'pointer', color: '#EF4444',
              }}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>
    </>
  )
}
