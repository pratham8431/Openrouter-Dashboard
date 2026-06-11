import { useState } from 'react'
import { Copy, Check, Bell, BellOff, Search } from 'lucide-react'
import type { ModelWithStatus } from '../../types/openrouter'
import { isWatched } from '../../lib/watchlist'
import WatchRulePanel from './WatchRulePanel'

const STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  new:     { bg: 'rgba(124,58,237,0.15)', color: '#A78BFA', label: 'NEW' },
  changed: { bg: 'rgba(245,158,11,0.12)', color: '#F59E0B', label: 'CHANGED' },
  stable:  { bg: 'rgba(255,255,255,0.06)', color: '#555', label: 'STABLE' },
  removed: { bg: 'rgba(239,68,68,0.12)',  color: '#EF4444', label: 'REMOVED' },
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      style={{
        display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px',
        background: copied ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)',
        border: `1px solid ${copied ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.06)'}`,
        borderRadius: 5, cursor: 'pointer', fontFamily: 'DM Mono, monospace',
        fontSize: 10, color: copied ? '#10B981' : '#555', transition: 'all 0.15s', whiteSpace: 'nowrap',
      }}
    >
      {copied ? <Check size={10} /> : <Copy size={10} />}
      {copied ? 'copied!' : 'copy id'}
    </button>
  )
}

function fmtPrice(p: string) {
  const n = Number(p)
  if (!n) return '—'
  return `$${(n * 1_000_000).toFixed(n * 1e6 < 1 ? 3 : 2)}`
}
function fmtCtx(n: number) {
  if (!n) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`
  return String(n)
}
function getProvider(id: string) { return id.split('/')[0] ?? id }

interface Props {
  models: ModelWithStatus[]
  onWatchChange?: () => void
}

export default function ModelTable({ models, onWatchChange }: Props) {
  const [search, setSearch] = useState('')
  const [providerFilter, setProviderFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [watchedOnly, setWatchedOnly] = useState(false)
  const [panelModel, setPanelModel] = useState<{ id: string; name: string } | null>(null)
  const [, setTick] = useState(0)

  const refresh = () => { setTick(t => t + 1); onWatchChange?.() }

  const providers = ['all', ...Array.from(new Set(models.map(m => getProvider(m.id)))).sort()]
  const filtered = models.filter(m => {
    const q = search.toLowerCase()
    const matchSearch = !q || m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || getProvider(m.id).includes(q)
    const matchProvider = providerFilter === 'all' || getProvider(m.id) === providerFilter
    const matchStatus = statusFilter === 'all' || m.status === statusFilter
    const matchWatched = !watchedOnly || isWatched(m.id)
    return matchSearch && matchProvider && matchStatus && matchWatched
  })

  const selectStyle: React.CSSProperties = {
    background: '#111111', border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 8, padding: '8px 12px', fontFamily: 'DM Mono, monospace',
    fontSize: 11, color: '#888', outline: 'none', cursor: 'pointer',
  }

  return (
    <div style={{ padding: '0 28px 28px' }}>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#444', pointerEvents: 'none' }} />
          <input
            style={{ ...selectStyle, width: '100%', paddingLeft: 34, color: '#F0F0F0' }}
            placeholder="Search models, IDs, providers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <select style={selectStyle} value={providerFilter} onChange={e => setProviderFilter(e.target.value)}>
          {providers.map(p => <option key={p} value={p}>{p === 'all' ? 'All providers' : p}</option>)}
        </select>

        <select style={selectStyle} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          {['all', 'new', 'changed', 'stable'].map(s => (
            <option key={s} value={s}>{s === 'all' ? 'All statuses' : s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>

        <button
          onClick={() => setWatchedOnly(w => !w)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
            background: watchedOnly ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${watchedOnly ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.06)'}`,
            borderRadius: 8, cursor: 'pointer', fontFamily: 'DM Mono, monospace',
            fontSize: 11, color: watchedOnly ? '#F59E0B' : '#666', whiteSpace: 'nowrap', transition: 'all 0.15s',
          }}
        >
          <Bell size={12} fill={watchedOnly ? '#F59E0B' : 'none'} />
          Watched only
        </button>
      </div>

      {/* Table */}
      <div style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['MODEL', 'ID', 'PROVIDER', 'CONTEXT', 'INPUT/1M', 'OUTPUT/1M', 'STATUS', ''].map(h => (
                  <th key={h} style={{
                    fontFamily: 'DM Mono, monospace', fontSize: 9, color: '#444',
                    textAlign: 'left', padding: '12px 16px', fontWeight: 400,
                    whiteSpace: 'nowrap', letterSpacing: '0.08em',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => {
                const statusCfg = STATUS_COLORS[m.status] ?? STATUS_COLORS.stable
                const watched = isWatched(m.id)
                return (
                  <tr
                    key={m.id}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: watched ? 'rgba(245,158,11,0.02)' : '' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = watched ? 'rgba(245,158,11,0.05)' : 'rgba(255,255,255,0.02)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = watched ? 'rgba(245,158,11,0.02)' : ''}
                  >
                    <td style={{ padding: '12px 16px', fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#F0F0F0', whiteSpace: 'nowrap' }}>
                      {m.name}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#444', cursor: 'pointer' }}
                        onClick={() => navigator.clipboard.writeText(m.id)} title={m.id}>
                        {m.id.length > 30 ? m.id.slice(0, 28) + '…' : m.id}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#666' }}>
                      {getProvider(m.id)}
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#666' }}>
                      {fmtCtx(m.context_length)}
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#A78BFA' }}>
                      {fmtPrice(m.pricing.prompt)}
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#A78BFA' }}>
                      {fmtPrice(m.pricing.completion)}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        fontFamily: 'DM Mono, monospace', fontSize: 9, padding: '3px 8px', borderRadius: 4,
                        background: statusCfg.bg, color: statusCfg.color, letterSpacing: '0.06em',
                      }}>
                        {statusCfg.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => setPanelModel({ id: m.id, name: m.name })}
                          title={watched ? 'Edit watch rule' : 'Watch this model'}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: 28, height: 28,
                            background: watched ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${watched ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.06)'}`,
                            borderRadius: 6, cursor: 'pointer',
                            color: watched ? '#F59E0B' : '#555', transition: 'all 0.15s',
                          }}
                          onMouseEnter={e => { if (!watched) { (e.currentTarget as HTMLElement).style.color = '#888'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)' } }}
                          onMouseLeave={e => { if (!watched) { (e.currentTarget as HTMLElement).style.color = '#555'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)' } }}
                        >
                          {watched ? <Bell size={12} fill="#F59E0B" /> : <BellOff size={12} />}
                        </button>
                        <CopyButton text={m.id} />
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: '40px', textAlign: 'center', fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#444' }}>
                    {watchedOnly ? 'No watched models yet — click the bell icon on any row to set up an alert' : 'No models match your filters'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {panelModel && (
        <WatchRulePanel
          modelId={panelModel.id}
          modelName={panelModel.name}
          onClose={() => setPanelModel(null)}
          onSave={refresh}
          onRemove={refresh}
        />
      )}
    </div>
  )
}
