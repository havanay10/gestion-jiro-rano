import type { ReactNode } from 'react'

type Variante =
  | 'succes'
  | 'avertissement'
  | 'erreur'
  | 'info'
  | 'neutre'
  | 'jiro'
  | 'rano'
  | 'navy'

type BadgeProps = {
  variante?: Variante
  children: ReactNode
  icone?: ReactNode
}

export function Badge({ variante = 'neutre', children, icone }: BadgeProps) {
  return (
    <span className={`badge badge-${variante}`}>
      {icone}
      {children}
    </span>
  )
}