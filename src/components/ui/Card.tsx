import type { ReactNode } from 'react'

type CardProps = {
  children: ReactNode
  className?: string
  compacte?: boolean
  sansPadding?: boolean
}

export function Card({ children, className = '', compacte, sansPadding }: CardProps) {
  let classe = 'carte'
  if (compacte) classe += ' carte-compacte'
  if (sansPadding) classe += ' carte-sans-padding'
  if (className) classe += ' ' + className
  return <div className={classe}>{children}</div>
}

type CardEnteteProps = {
  titre: ReactNode
  sousTitre?: ReactNode
  actions?: ReactNode
}

export function CardEntete({ titre, sousTitre, actions }: CardEnteteProps) {
  return (
    <div className="carte-entete">
      <div>
        <div className="carte-titre">{titre}</div>
        {sousTitre && <div className="carte-sous-titre">{sousTitre}</div>}
      </div>
      {actions && <div className="ligne">{actions}</div>}
    </div>
  )
}

/* ---------- Carte statistique (KPI) ---------- */

type CardStatProps = {
  label: ReactNode
  valeur: ReactNode
  valeurExacte?: ReactNode
  detail?: ReactNode
  icone?: ReactNode
  variante?: 'defaut' | 'jiro' | 'rano' | 'sombre'
}

export function CardStat({
  label,
  valeur,
  valeurExacte,
  detail,
  icone,
  variante = 'defaut',
}: CardStatProps) {
  let classe = 'carte-stat'
  if (variante === 'jiro') classe += ' carte-stat-variante-jiro'
  if (variante === 'rano') classe += ' carte-stat-variante-rano'
  if (variante === 'sombre') classe += ' carte-stat-sombre'

  let classeIcone = 'carte-stat-icone'
  if (variante === 'jiro') classeIcone += ' carte-stat-icone-jiro'
  if (variante === 'rano') classeIcone += ' carte-stat-icone-rano'

  return (
    <div className={classe}>
      <div className="carte-stat-entete">
        <div className="carte-stat-label">{label}</div>
        {icone && <div className={classeIcone}>{icone}</div>}
      </div>
      <div className="carte-stat-valeur">{valeur}</div>
      {valeurExacte && <div className="carte-stat-valeur-exacte">{valeurExacte}</div>}
      {detail && <div className="carte-stat-detail">{detail}</div>}
    </div>
  )
}