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
    minimumFractionDigits: 6,
    maximumFractionDigits: 6,
  }).format(n) + ' Ar'
}

type LigneTooltip = { value?: number; dataKey?: string; color?: string }

function TooltipPersonnalise({ active, payload, label }: {
  active?: boolean
  payload?: LigneTooltip[]
  label?: string
}) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div
      className="graphique-infobulle"
    >
      <div style={{ fontWeight: 600, marginBottom: 6 }}>{label}</div>
      {payload.map((entry, i) => (
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
    <div className="graphique-factures">
      <ResponsiveContainer>
        <BarChart
          data={points}
          margin={{ top: 20, right: 20, left: 10, bottom: 5 }}
          barGap={6}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e3e9f4" />
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
          <Tooltip content={<TooltipPersonnalise />} />
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
            fill="#f3922c"
            radius={[4, 4, 0, 0]}
            onClick={(data: { payload?: PointGraphique }) => {
              const point = data.payload
              if (onClicPeriode && point?.annee && point?.mois) {
                onClicPeriode(point.annee, point.mois)
              }
            }}
            cursor={onClicPeriode ? 'pointer' : 'default'}
          />
          <Bar
            dataKey="rano"
            fill="#168bd2"
            radius={[4, 4, 0, 0]}
            onClick={(data: { payload?: PointGraphique }) => {
              const point = data.payload
              if (onClicPeriode && point?.annee && point?.mois) {
                onClicPeriode(point.annee, point.mois)
              }
            }}
            cursor={onClicPeriode ? 'pointer' : 'default'}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
