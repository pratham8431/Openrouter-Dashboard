import type { ReactNode } from 'react'

interface Props {
  title: string
  subtitle: string
  actions?: ReactNode
}

export default function PageHeader({ title, subtitle, actions }: Props) {
  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: '#0A0A0F',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        padding: '16px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <div>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>
          {title}
        </h1>
        <p style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#8888A0', margin: '3px 0 0' }}>
          {subtitle}
        </p>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
