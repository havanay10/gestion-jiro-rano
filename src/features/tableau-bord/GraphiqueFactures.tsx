import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import type { PointGraphique } from './useTableauBord'

type Props = {
  points: PointGraphique[]
  onClicPeriode?: (annee: number, mois: number) => void
}

function formaterAr(n: number): string {
  return new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 0,
  }).format(n) + ' Ar'
}

function TooltipPersonnalise({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        boxShadow: '0 4px 6px rgba(15,23,42,0.06)',
        padding: '8px 12px',
        fontSize: 12,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 6 }}>{label}</div>
      {payload.map((entry: any, i: number) => (
        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: entry.color,
            }}
          />
          <span style={{ color: '#64748b' }}>
            {entry.dataKey === 'jiro' ? 'Facture Jiro' : 'Facture Rano'} :
          </span>
          <span style={{ fontWeight: 600 }}>{formaterAr(Number(entry.value))}</span>
        </div>
      ))}
    </div>
  )
}

export function GraphiqueFactures({ points, onClicPeriode }: Props) {
  if (points.length === 0) {
    return (
      <div className="etat-vide" style={{ padding: 'var(--e-5)' }}>
        <div className="etat-vide-texte">Aucune donnée à afficher.</div>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <BarChart
          data={points}
          margin={{ top: 20, right: 20, left: 10, bottom: 5 }}
          barGap={6}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: '#64748b' }}
            axisLine={{ stroke: '#e5e7eb' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => {
              if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
              if (v >= 1000) return `${Math.round(v / 1000)}k`
              return String(v)
            }}
          />
          <Tooltip content-={<TooltipPersonnalise />}/>
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, paddingBottom: 8 }}
            formatter={(value) =>
              value === 'jiro' ? 'Facture Jiro (Élec)' : 'Facture Rano (Eau)'
            }
          />
          <Bar
            dataKey="jiro"
            fill="#e8a33d"
            radius={[4, 4, 0, 0]}
            onClick={(data: any) => {
              if (onClicPeriode && data?.annee && data?.mois) {
                onClicPeriode(data.annee, data.mois)
              }
            }}
            cursor={onClicPeriode ? 'pointer' : 'default'}
          />
          <Bar
            dataKey="rano"
            fill="#3b82f6"
            radius={[4, 4, 0, 0]}
            onClick={(data: any) => {
              if (onClicPeriode && data?.annee && data?.mois) {
                onClicPeriode(data.annee, data.mois)
              }
            }}
            cursor={onClicPeriode ? 'pointer' : 'default'}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}