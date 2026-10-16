import type { ReactNode } from 'react'
import { Icone } from './Icone'
import type { NomIcone } from './Icone'

type Variante = 'succes' | 'avertissement' | 'erreur' | 'info'

type MessageProps = {
  variante: Variante
  titre?: string
  icone?: ReactNode
  children: ReactNode
}

const iconeDefaut: Record<Variante, NomIcone> = {
  succes: 'succes',
  avertissement: 'avertissement',
  erreur: 'erreur',
  info: 'info',
}

export function Message({ variante, titre, icone, children }: MessageProps) {
  return (
    <div className={`message message-${variante}`} role={variante === 'erreur' ? 'alert' : 'status'}>
      <span className="message-icone">{icone ?? <Icone nom={iconeDefaut[variante]} />}</span>
      <div>
        {titre && <div className="message-titre">{titre}</div>}
        <div>{children}</div>
      </div>
    </div>
  )
}
