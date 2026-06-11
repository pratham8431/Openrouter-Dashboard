import { useState } from 'react'
import { Copy, Check, RefreshCw, Inbox } from 'lucide-react'
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
        background: copied ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${copied ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.06)'}`,
        borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
        fontFamily: 'DM Mono, monospace', fontSize: 10,
        color: copied ? '#10B981' : '#666', whiteSpace: 'nowrap', transition: 'all 0.15s',
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
      <div style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700, color: '#fff' }}>New arrivals</span>
            {newModels.length > 0 && (
              <span style={{
                fontFamily: 'DM Mono, monospace', fontSize: 10,
                background: 'rgba(16,185,129,0.12)', color: '#10B981',
                borderRadius: 20, padding: '2px 10px',
              }}>
                {newModels.length} new
              </span>
            )}
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)',
              borderRadius: 8, padding: '6px 14px', cursor: 'pointer',
              fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#A78BFA',
            }}
          >
            <RefreshCw size={11} />
            Refresh Feed
          </button>
        </div>

        {/* Empty state */}
        {newModels.length === 0 ? (
          <div style={{ padding: '48px 28px', textAlign: 'center' }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <Inbox size={22} color="#444" />
            </div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 600, color: '#888', marginBottom: 6 }}>
              No new models today
            </div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#444', lineHeight: 1.6 }}>
              Check back tomorrow for the latest releases from OpenAI, Meta, Anthropic, and others.
            </div>
          </div>
        ) : (
          newModels.map(m => (
            <div
              key={m.id}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)',
                flexWrap: 'wrap', gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                  background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#A78BFA',
                }}>
                  NEW
                </div>
                <div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#F0F0F0', fontWeight: 500 }}>{m.name}</div>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#444', marginTop: 2 }}>{m.id}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#666' }}>ctx {fmtCtx(m.context_length)}</span>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#A78BFA' }}>{fmtPrice(m.pricing.prompt)}</span>
                <CopyBtn id={m.id} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
