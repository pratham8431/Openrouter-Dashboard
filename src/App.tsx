import { useEffect, useState } from 'react'
import { AlertTriangle, X, Download, RefreshCw, Bell, Copy, Check, Loader2, ArrowRight } from 'lucide-react'

import Sidebar, { type Page } from './components/Layout/Sidebar'
import PageHeader from './components/Layout/PageHeader'
import StatsRow from './components/Tracker/StatsRow'
import ModelTable from './components/Tracker/ModelTable'
import UseCaseForm from './components/Recommender/UseCaseForm'
import ResultsPanel from './components/Recommender/ResultsPanel'
import InputForm, { type CostInputs } from './components/CostEstimator/InputForm'
import CostTable from './components/CostEstimator/CostTable'
import ChartGrid from './components/Trends/ChartGrid'
import ArrivalsFeed from './components/Trends/ArrivalsFeed'

import { fetchModels } from './lib/openrouter'
import { detectChanges, clearSnapshot } from './lib/changeDetector'
import { getRecommendations } from './lib/claude'
import { getFallbackRecommendation } from './lib/fallback'
import { downloadCSV } from './lib/export'
import { getWatchlist, getWatchRule, exportWatchlistConfig } from './lib/watchlist'

import type { ModelWithStatus, ModelChange, Recommendation, Priorities, FallbackResult } from './types/openrouter'

const USER_EMAIL = 'prathamjadhav915@gmail.com'

function getProvider(id: string) { return id.split('/')[0] ?? id }

function fireWatchedNotifications(watchedChanges: ModelChange[]) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  watchedChanges.forEach(c => {
    const body = c.type === 'removed'
      ? `${c.model} has been removed from OpenRouter`
      : c.type === 'price' ? `Price changed: ${c.detail}`
      : `${c.model} is now available`
    new Notification(`⚠ Watched model: ${c.model}`, { body, icon: '/favicon.svg' })
  })
}

function CopyInline({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px',
        background: 'none', border: `1px solid ${copied ? '#10B981' : 'rgba(255,255,255,0.12)'}`,
        borderRadius: 4, cursor: 'pointer', fontFamily: 'DM Mono, monospace',
        fontSize: 10, color: copied ? '#10B981' : '#8888A0',
      }}
    >
      {copied ? <Check size={9} /> : <Copy size={9} />}
      {copied ? 'copied!' : 'copy id'}
    </button>
  )
}

interface FallbackState {
  loading: boolean
  result?: FallbackResult
}

export default function App() {
  const [page, setPage] = useState<Page>('tracker')
  const [models, setModels] = useState<ModelWithStatus[]>([])
  const [changes, setChanges] = useState<ModelChange[]>([])
  const [watchedChanges, setWatchedChanges] = useState<ModelChange[]>([])
  const [loading, setLoading] = useState(true)
  const [showWatchedAlert, setShowWatchedAlert] = useState(true)
  const [showGeneralAlert, setShowGeneralAlert] = useState(true)
  const [watchlistCount, setWatchlistCount] = useState(() => getWatchlist().length)
  // Map of modelId → fallback state
  const [fallbacks, setFallbacks] = useState<Record<string, FallbackState>>({})

  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [recLoading, setRecLoading] = useState(false)

  const [costInputs, setCostInputs] = useState<CostInputs>({
    prompt: '', volume: 10000, avgOutputTokens: 500, maxBudget: 500,
  })

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      const fresh = await fetchModels()
      const { changes: detected, watchedChanges: watched, modelsWithStatus } = detectChanges(fresh)
      setModels(modelsWithStatus)
      setChanges(detected)
      setWatchedChanges(watched)
      if (watched.length > 0) fireWatchedNotifications(watched)

      // Kick off fallback lookups for each watched change
      if (watched.length > 0) {
        const init: Record<string, FallbackState> = {}
        watched.forEach(c => { if (c.modelId) init[c.modelId] = { loading: true } })
        setFallbacks(init)

        for (const change of watched) {
          if (!change.modelId) continue
          const rule = getWatchRule(change.modelId)
          if (!rule) continue

          // Check price threshold — only fire if threshold crossed or no threshold set
          const pricePerM = Number(fresh.find(m => m.id === change.modelId)?.pricing.prompt ?? 0) * 1e6
          if (rule.priceThreshold && change.type === 'price' && pricePerM <= rule.priceThreshold) {
            setFallbacks(prev => ({ ...prev, [change.modelId!]: { loading: false } }))
            continue
          }

          getFallbackRecommendation(
            { id: change.modelId, name: change.model, changeDetail: change.detail },
            rule,
            fresh,
            costInputs.volume,
            costInputs.avgOutputTokens,
          ).then(result => {
            setFallbacks(prev => ({ ...prev, [change.modelId!]: { loading: false, result } }))
          })
        }
      }

      setLoading(false)
    })()
  }, [])

  const handleRecommend = async (useCase: string, priorities: Priorities) => {
    setRecLoading(true)
    const recs = await getRecommendations(useCase, priorities, models)
    setRecommendations(recs)
    setRecLoading(false)
  }

  const exportChangelog = () => {
    downloadCSV(
      changes.map(c => ({ Type: c.type, Model: c.model, Detail: c.detail ?? '', Timestamp: c.timestamp })),
      `openrouter-changes-${new Date().toISOString().slice(0, 10)}.csv`
    )
  }

  const exportWatchlist = () => {
    const json = exportWatchlistConfig(USER_EMAIL)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'config.json'; a.click()
    URL.revokeObjectURL(url)
  }

  const newCount = models.filter(m => m.status === 'new').length
  const changedCount = models.filter(m => m.status === 'changed').length
  const providerCount = new Set(models.map(m => getProvider(m.id))).size

  const PAGE_META: Record<Page, { title: string; subtitle: string }> = {
    tracker: { title: 'Model Tracker', subtitle: loading ? 'Loading...' : `${models.length} models live · ${watchlistCount} watched` },
    recommender: { title: 'AI Recommender', subtitle: 'Claude-powered model ranking for your use case' },
    cost: { title: 'Cost Estimator', subtitle: 'Per-prompt cost across all models' },
    trends: { title: 'Trends Dashboard', subtitle: 'Model launches, providers, pricing over time' },
  }

  const btnStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 6, background: 'none',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 5, padding: '6px 14px',
    cursor: 'pointer', fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#8888A0',
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0A0A0F' }}>
      <Sidebar active={page} onChange={setPage} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <PageHeader
          title={PAGE_META[page].title}
          subtitle={PAGE_META[page].subtitle}
          actions={page === 'tracker' ? (
            <div style={{ display: 'flex', gap: 8 }}>
              {watchlistCount > 0 && (
                <button onClick={exportWatchlist} style={{ ...btnStyle, color: '#F59E0B', borderColor: 'rgba(245,158,11,0.3)' }}>
                  <Bell size={12} /> Export watchlist config
                </button>
              )}
              {changes.length > 0 && (
                <button onClick={exportChangelog} style={btnStyle}><Download size={12} /> Export changelog</button>
              )}
              <button onClick={() => { clearSnapshot(); window.location.reload() }} style={btnStyle}>
                <RefreshCw size={12} /> Reset snapshot
              </button>
            </div>
          ) : null}
        />

        {/* 🔴 Watched model alert with fallback recommendations */}
        {page === 'tracker' && watchedChanges.length > 0 && showWatchedAlert && (
          <div style={{
            padding: '14px 28px', background: 'rgba(239,68,68,0.07)',
            borderBottom: '1px solid rgba(239,68,68,0.2)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flex: 1 }}>
                <AlertTriangle size={14} style={{ color: '#EF4444', flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#EF4444', fontWeight: 500, marginBottom: 12 }}>
                    {watchedChanges.length} watched model{watchedChanges.length !== 1 ? 's' : ''} changed — auto-switch recommendations below
                  </div>

                  {watchedChanges.map((c, i) => {
                    const fb = c.modelId ? fallbacks[c.modelId] : undefined
                    const rule = c.modelId ? getWatchRule(c.modelId) : undefined
                    return (
                      <div key={i} style={{
                        background: '#111118', border: '1px solid rgba(239,68,68,0.2)',
                        borderRadius: 8, padding: '14px 16px', marginBottom: 10,
                      }}>
                        {/* Changed model */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: rule ? 10 : 0 }}>
                          <span style={{
                            fontFamily: 'DM Mono, monospace', fontSize: 9,
                            background: 'rgba(239,68,68,0.15)', color: '#EF4444',
                            borderRadius: 3, padding: '2px 6px',
                          }}>{c.type.toUpperCase()}</span>
                          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#E8E8F0' }}>{c.model}</span>
                          {c.detail && <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#8888A0' }}>{c.detail}</span>}
                        </div>

                        {/* Fallback recommendation */}
                        {rule && (
                          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 10 }}>
                            {fb?.loading && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Loader2 size={12} style={{ color: '#6366F1', animation: 'spin 1s linear infinite' }} />
                                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#4A4A60' }}>
                                  Claude is finding the best fallback for your use case...
                                </span>
                              </div>
                            )}
                            {fb && !fb.loading && fb.result && (
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
                                <ArrowRight size={12} style={{ color: '#10B981', flexShrink: 0, marginTop: 2 }} />
                                <div style={{ flex: 1, minWidth: 240 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#10B981', fontWeight: 500 }}>
                                      Suggested switch:
                                    </span>
                                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#E8E8F0' }}>
                                      {fb.result.modelName}
                                    </span>
                                    <CopyInline text={fb.result.modelId} />
                                    {fb.result.monthlyEstimate != null && (
                                      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#10B981' }}>
                                        Est. ${fb.result.monthlyEstimate.toLocaleString()}/mo
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#8888A0', lineHeight: 1.6 }}>
                                    {fb.result.reason}
                                  </div>
                                  {/* Score bars */}
                                  <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
                                    {[
                                      { label: 'Quality', val: fb.result.quality, color: '#6366F1' },
                                      { label: 'Speed', val: fb.result.speed, color: '#14B8A6' },
                                      { label: 'Cost eff.', val: fb.result.cost, color: '#10B981' },
                                    ].map(({ label, val, color }) => (
                                      <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#4A4A60', width: 50 }}>{label}</span>
                                        <div style={{ width: 60, height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                                          <div style={{ height: '100%', width: `${val * 10}%`, background: color, borderRadius: 2 }} />
                                        </div>
                                        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color }}>{val}/10</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                            {fb && !fb.loading && !fb.result && (
                              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#4A4A60' }}>
                                Could not generate fallback — check API key in .env.local
                              </span>
                            )}
                          </div>
                        )}
                        {!rule && (
                          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 8, marginTop: 4 }}>
                            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#4A4A60' }}>
                              Set a watch rule with use case context to get auto-switch recommendations.
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
              <button onClick={() => setShowWatchedAlert(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', padding: 4, flexShrink: 0 }}>
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {/* 🟡 General change alert */}
        {page === 'tracker' && changes.length > 0 && showGeneralAlert && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 28px', background: 'rgba(245,158,11,0.08)',
            borderBottom: '1px solid rgba(245,158,11,0.2)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <AlertTriangle size={14} style={{ color: '#F59E0B', flexShrink: 0 }} />
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#F59E0B' }}>
                {changes.length} change{changes.length !== 1 ? 's' : ''} detected since last visit —{' '}
                {changes.filter(c => c.type === 'new').length} new,{' '}
                {changes.filter(c => c.type === 'price').length} price updates,{' '}
                {changes.filter(c => c.type === 'removed').length} removed
              </span>
            </div>
            <button onClick={() => setShowGeneralAlert(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#F59E0B', padding: 4 }}>
              <X size={14} />
            </button>
          </div>
        )}

        {loading && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#4A4A60' }}>
              Fetching models from OpenRouter...
            </span>
          </div>
        )}

        {!loading && (
          <>
            {page === 'tracker' && (
              <>
                <StatsRow totalModels={models.length} newCount={newCount} changedCount={changedCount} providerCount={providerCount} />
                {changes.length > 0 && (
                  <div style={{ padding: '0 28px 20px' }}>
                    <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, overflow: 'hidden' }}>
                      <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                        <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 600, color: '#fff' }}>Recent changes</span>
                      </div>
                      {changes.slice(0, 8).map((c, i) => {
                        const dot = c.type === 'new' ? '#10B981' : c.type === 'price' ? '#F59E0B' : '#EF4444'
                        const isWatchedChange = watchedChanges.some(w => w.modelId === c.modelId)
                        return (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', background: isWatchedChange ? 'rgba(239,68,68,0.03)' : '' }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: dot, flexShrink: 0 }} />
                            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: dot, width: 55 }}>{c.type.toUpperCase()}</span>
                            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#E8E8F0', flex: 1 }}>{c.model}</span>
                            {isWatchedChange && (
                              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 9, background: 'rgba(239,68,68,0.15)', color: '#EF4444', borderRadius: 3, padding: '1px 5px' }}>watched</span>
                            )}
                            {c.detail && <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#8888A0' }}>{c.detail}</span>}
                            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#4A4A60' }}>{new Date(c.timestamp).toLocaleTimeString()}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
                <ModelTable models={models} onWatchChange={() => setWatchlistCount(getWatchlist().length)} />
              </>
            )}

            {page === 'recommender' && (
              <div style={{ padding: 28 }}>
                <UseCaseForm onSubmit={handleRecommend} loading={recLoading} />
                <ResultsPanel recommendations={recommendations} />
              </div>
            )}

            {page === 'cost' && (
              <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
                <InputForm inputs={costInputs} onChange={setCostInputs} />
                <CostTable models={models} inputs={costInputs} />
              </div>
            )}

            {page === 'trends' && (
              <>
                <ChartGrid models={models} />
                <ArrivalsFeed models={models} />
              </>
            )}
          </>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
