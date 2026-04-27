import { useEffect, useState } from 'react'
import { AlertTriangle, X, Download, RefreshCw } from 'lucide-react'

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
import { downloadCSV } from './lib/export'

import type { ModelWithStatus, ModelChange, Recommendation, Priorities } from './types/openrouter'

function getProvider(id: string) { return id.split('/')[0] ?? id }

export default function App() {
  const [page, setPage] = useState<Page>('tracker')
  const [models, setModels] = useState<ModelWithStatus[]>([])
  const [changes, setChanges] = useState<ModelChange[]>([])
  const [loading, setLoading] = useState(true)
  const [showAlert, setShowAlert] = useState(true)

  // Recommender
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [recLoading, setRecLoading] = useState(false)

  // Cost estimator
  const [costInputs, setCostInputs] = useState<CostInputs>({
    prompt: '',
    volume: 10000,
    avgOutputTokens: 500,
    maxBudget: 500,
  })

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      const fresh = await fetchModels()
      const { changes: detected, modelsWithStatus } = detectChanges(fresh)
      setModels(modelsWithStatus)
      setChanges(detected)
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

  const newCount = models.filter(m => m.status === 'new').length
  const changedCount = models.filter(m => m.status === 'changed').length
  const providerCount = new Set(models.map(m => getProvider(m.id))).size

  const PAGE_META: Record<Page, { title: string; subtitle: string }> = {
    tracker: { title: 'Model Tracker', subtitle: `${models.length} models live from OpenRouter API` },
    recommender: { title: 'AI Recommender', subtitle: 'Claude-powered model ranking for your use case' },
    cost: { title: 'Cost Estimator', subtitle: 'Per-prompt cost across all models' },
    trends: { title: 'Trends Dashboard', subtitle: 'Model launches, providers, pricing over time' },
  }

  const btnStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 6,
    background: 'none', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 5, padding: '6px 14px', cursor: 'pointer',
    fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#8888A0',
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0A0A0F' }}>
      <Sidebar active={page} onChange={setPage} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <PageHeader
          title={PAGE_META[page].title}
          subtitle={loading ? 'Loading...' : PAGE_META[page].subtitle}
          actions={
            page === 'tracker' ? (
              <div style={{ display: 'flex', gap: 8 }}>
                {changes.length > 0 && (
                  <button onClick={exportChangelog} style={btnStyle}>
                    <Download size={12} /> Export changelog
                  </button>
                )}
                <button onClick={() => { clearSnapshot(); window.location.reload() }} style={btnStyle}>
                  <RefreshCw size={12} /> Reset snapshot
                </button>
              </div>
            ) : null
          }
        />

        {/* Change alert bar */}
        {page === 'tracker' && changes.length > 0 && showAlert && (
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
            <button onClick={() => setShowAlert(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#F59E0B', padding: 4 }}>
              <X size={14} />
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#4A4A60' }}>
              Fetching models from OpenRouter...
            </span>
          </div>
        )}

        {/* Pages */}
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
                        return (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: dot, flexShrink: 0 }} />
                            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: dot, width: 55 }}>{c.type.toUpperCase()}</span>
                            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#E8E8F0', flex: 1 }}>{c.model}</span>
                            {c.detail && <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#8888A0' }}>{c.detail}</span>}
                            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#4A4A60' }}>{new Date(c.timestamp).toLocaleTimeString()}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                <ModelTable models={models} />
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
    </div>
  )
}
