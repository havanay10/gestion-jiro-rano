import type { ReactNode } from 'react'

type Variante = 'succes' | 'avertissement' | 'erreur' | 'info'

type MessageProps = {
  variante: Variante
  titre?: string
  icone?: ReactNode
  children: ReactNode
}

const iconeDefaut: Record<Variante, string> = {
  succes: '✓',
  avertissement: '⚠',
  erreur: '✗',
  info: 'ℹ',
}

export function Message({ variante, titre, icone, children }: MessageProps) {
  return (
    <div className={`message message-${variante}`}>
      <span className="message-icone">{icone ?? iconeDefaut[variante]}</span>
      <div>
        {titre && <div className="message-titre">{titre}</div>}
        <div>{children}</div>
      </div>
    </div>
  )
}