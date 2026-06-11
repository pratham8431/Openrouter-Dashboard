import { BarChart2, Bot, Calculator, TrendingUp, Zap } from 'lucide-react'

export type Page = 'tracker' | 'recommender' | 'cost' | 'trends'

interface NavItem { id: Page; label: string; icon: React.ReactNode }

const NAV: NavItem[] = [
  { id: 'tracker',     label: 'Model Tracker',  icon: <BarChart2 size={15} /> },
  { id: 'recommender', label: 'AI Recommender', icon: <Bot size={15} /> },
  { id: 'cost',        label: 'Cost Estimator', icon: <Calculator size={15} /> },
  { id: 'trends',      label: 'Trends',         icon: <TrendingUp size={15} /> },
]

interface Props { active: Page; onChange: (p: Page) => void }

export default function Sidebar({ active, onChange }: Props) {
  return (
    <aside style={{
      width: 220, minHeight: '100vh', background: '#111111',
      borderRight: '1px solid rgba(255,255,255,0.06)', flexShrink: 0,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Brand */}
      <div style={{ padding: '22px 20px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'linear-gradient(135deg, #7C3AED, #5B21B6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={14} color="#fff" />
          </div>
          <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 13, fontWeight: 700, color: '#fff', letterSpacing: '0.02em' }}>
            OR Intelligence
          </span>
        </div>
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#444', marginTop: 2, marginLeft: 36 }}>
          openrouter.ai
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '10px 10px', flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.map(item => {
          const isActive = item.id === active
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 8,
                background: isActive ? 'rgba(124,58,237,0.15)' : 'none',
                border: 'none', cursor: 'pointer',
                fontFamily: 'DM Mono, monospace', fontSize: 12,
                color: isActive ? '#A78BFA' : '#666',
                textAlign: 'left', transition: 'all 0.15s', width: '100%',
              }}
              onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)' }}
              onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'none' }}
            >
              <span style={{ color: isActive ? '#7C3AED' : '#555' }}>{item.icon}</span>
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: '#444' }}>
          v1.0 · {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
        </div>
      </div>
    </aside>
  )
}
