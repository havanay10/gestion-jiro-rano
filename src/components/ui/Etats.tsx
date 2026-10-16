import type { ReactNode } from 'react'

type EmptyStateProps = {
  titre?: string
  texte?: ReactNode
  icone?: ReactNode
  action?: ReactNode
}

export function EmptyState({ titre, texte, icone, action }: EmptyStateProps) {
  return (
    <div className="etat-vide">
      {icone && <div className="etat-vide-icone">{icone}</div>}
      {titre && <div className="etat-vide-titre">{titre}</div>}
      {texte && <div className="etat-vide-texte">{texte}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function LoadingState({ texte = 'Chargement…' }: { texte?: string }) {
  return (
    <div className="etat-chargement">
      <span className="spinner" />
      <span>{texte}</span>
    </div>
  )
}