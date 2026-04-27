interface StatCard {
  label: string
  value: number | string
}

interface Props {
  totalModels: number
  newCount: number
  changedCount: number
  providerCount: number
}

function Card({ label, value }: StatCard) {
  return (
    <div style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '16px 20px' }}>
      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 26, fontWeight: 700, color: '#fff', lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#8888A0', marginTop: 6 }}>
        {label}
      </div>
    </div>
  )
}

export default function StatsRow({ totalModels, newCount, changedCount, providerCount }: Props) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, padding: '20px 28px' }}>
      <Card label="Total models" value={totalModels} />
      <Card label="New this week" value={newCount} />
      <Card label="Price changes" value={changedCount} />
      <Card label="Providers" value={providerCount} />
    </div>
  )
}
