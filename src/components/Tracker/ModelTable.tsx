import { useState } from 'react'
import { Copy, Check, Bell, BellOff } from 'lucide-react'
import type { ModelWithStatus } from '../../types/openrouter'
import { isWatched } from '../../lib/watchlist'
import WatchRulePanel from './WatchRulePanel'

const STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  new:     { bg: 'rgba(16,185,129,0.12)', color: '#10B981', label: 'New' },
  changed: { bg: 'rgba(245,158,11,0.12)', color: '#F59E0B', label: 'Changed' },
  stable:  { bg: 'rgba(136,136,160,0.1)', color: '#8888A0', label: 'Stable' },
  removed: { bg: 'rgba(239,68,68,0.12)',  color: '#EF4444', label: 'Removed' },
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      style={{
        display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px',
        background: 'none', border: `1px solid ${copied ? '#10B981' : 'rgba(255,255,255,0.1)'}`,
        borderRadius: 4, cursor: 'pointer', fontFamily: 'DM Mono, monospace',
        fontSize: 10, color: copied ? '#10B981' : '#8888A0', transition: 'all 0.15s', whiteSpace: 'nowrap',
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
  return `$${(n * 1_000_000).toFixed(n * 1e6 < 1 ? 3 : 2)}/M`
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

  const inputStyle: React.CSSProperties = {
    background: '#18181F', border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 6, padding: '7px 12px', fontFamily: 'DM Mono, monospace',
    fontSize: 12, color: '#E8E8F0', outline: 'none',
  }

  return (
    <div style={{ padding: '0 28px 28px' }}>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          style={{ ...inputStyle, flex: 1, minWidth: 200 }}
          placeholder="Search models, IDs, providers..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select style={inputStyle} value={providerFilter} onChange={e => setProviderFilter(e.target.value)}>
          {providers.map(p => <option key={p} value={p}>{p === 'all' ? 'All providers' : p}</option>)}
        </select>
        <select style={inputStyle} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          {['all', 'new', 'changed', 'stable'].map(s => (
            <option key={s} value={s}>{s === 'all' ? 'All statuses' : s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
        <button
          onClick={() => setWatchedOnly(w => !w)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px',
            background: watchedOnly ? 'rgba(245,158,11,0.1)' : '#18181F',
            border: `1px solid ${watchedOnly ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.07)'}`,
            borderRadius: 6, cursor: 'pointer', fontFamily: 'DM Mono, monospace',
            fontSize: 12, color: watchedOnly ? '#F59E0B' : '#8888A0', whiteSpace: 'nowrap',
          }}
        >
          <Bell size={12} fill={watchedOnly ? '#F59E0B' : 'none'} />
          Watched only
        </button>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              {['Model', 'ID', 'Provider', 'Context', 'Input/1M', 'Output/1M', 'Status', ''].map(h => (
                <th key={h} style={{
                  fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#4A4A60',
                  textAlign: 'left', padding: '8px 12px', fontWeight: 400, whiteSpace: 'nowrap',
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
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: watched ? 'rgba(245,158,11,0.03)' : '' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = watched ? 'rgba(245,158,11,0.06)' : 'rgba(255,255,255,0.02)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = watched ? 'rgba(245,158,11,0.03)' : ''}
                >
                  <td style={{ padding: '10px 12px', fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#E8E8F0', whiteSpace: 'nowrap' }}>
                    {m.name}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#4A4A60', cursor: 'pointer' }}
                      onClick={() => navigator.clipboard.writeText(m.id)} title={m.id}>
                      {m.id}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#8888A0' }}>
                    {getProvider(m.id)}
                  </td>
                  <td style={{ padding: '10px 12px', fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#8888A0' }}>
                    {fmtCtx(m.context_length)}
                  </td>
                  <td style={{ padding: '10px 12px', fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#A5B4FC' }}>
                    {fmtPrice(m.pricing.prompt)}
                  </td>
                  <td style={{ padding: '10px 12px', fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#A5B4FC' }}>
                    {fmtPrice(m.pricing.completion)}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{
                      fontFamily: 'DM Mono, monospace', fontSize: 10, padding: '2px 7px', borderRadius: 4,
                      background: statusCfg.bg, color: statusCfg.color,
                    }}>
                      {statusCfg.label}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => setPanelModel({ id: m.id, name: m.name })}
                        title={watched ? 'Edit watch rule' : 'Set up auto-switch rule'}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          width: 28, height: 28, background: 'none',
                          border: `1px solid ${watched ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.08)'}`,
                          borderRadius: 4, cursor: 'pointer',
                          color: watched ? '#F59E0B' : '#4A4A60', transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { if (!watched) (e.currentTarget as HTMLElement).style.color = '#8888A0' }}
                        onMouseLeave={e => { if (!watched) (e.currentTarget as HTMLElement).style.color = '#4A4A60' }}
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
                <td colSpan={8} style={{ padding: '32px', textAlign: 'center', fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#4A4A60' }}>
                  {watchedOnly ? 'No watched models yet — click the bell icon on any model row to set up an auto-switch rule' : 'No models match your filters'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Watch rule panel */}
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
