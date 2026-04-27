import { BarChart2, Bot, Calculator, TrendingUp, Zap } from 'lucide-react'

export type Page = 'tracker' | 'recommender' | 'cost' | 'trends'

interface NavItem {
  id: Page
  label: string
  icon: React.ReactNode
}

const NAV: NavItem[] = [
  { id: 'tracker', label: 'Model Tracker', icon: <BarChart2 size={14} /> },
  { id: 'recommender', label: 'AI Recommender', icon: <Bot size={14} /> },
  { id: 'cost', label: 'Cost Estimator', icon: <Calculator size={14} /> },
  { id: 'trends', label: 'Trends', icon: <TrendingUp size={14} /> },
]

interface Props {
  active: Page
  onChange: (p: Page) => void
}

export default function Sidebar({ active, onChange }: Props) {
  return (
    <aside
      style={{ width: 220, minHeight: '100vh', background: '#111118', borderRight: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}
      className="flex flex-col"
    >
      {/* Brand */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-2">
          <Zap size={16} style={{ color: '#6366F1' }} />
          <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, color: '#fff', letterSpacing: '0.02em' }}>
            OR Intelligence
          </span>
        </div>
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#4A4A60', marginTop: 4 }}>
          openrouter.ai / models
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-col" style={{ padding: '12px 0', flex: 1 }}>
        {NAV.map(item => {
          const isActive = item.id === active
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 20px',
                background: 'none',
                border: 'none',
                borderLeft: isActive ? '2px solid #6366F1' : '2px solid transparent',
                cursor: 'pointer',
                fontFamily: 'DM Mono, monospace',
                fontSize: 12,
                color: isActive ? '#E8E8F0' : '#8888A0',
                textAlign: 'left',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = '#E8E8F0' }}
              onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = '#8888A0' }}
            >
              <span style={{ color: isActive ? '#6366F1' : '#4A4A60' }}>{item.icon}</span>
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#4A4A60' }}>
          v1.0 · April 2026
        </div>
      </div>
    </aside>
  )
}
