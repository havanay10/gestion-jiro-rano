import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variante = 'defaut' | 'primaire' | 'danger' | 'fantome'
type Taille = 'sm' | 'md' | 'lg'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: Variante
  taille?: Taille
  bloc?: boolean
  icone?: ReactNode
  children?: ReactNode
}

export function Button({
  variante = 'defaut',
  taille = 'md',
  bloc,
  icone,
  children,
  className = '',
  type = 'button',
  ...rest
}: ButtonProps) {
  let classe = 'btn'
  if (variante === 'primaire') classe += ' btn-primaire'
  if (variante === 'danger') classe += ' btn-danger'
  if (variante === 'fantome') classe += ' btn-fantome'
  if (taille === 'sm') classe += ' btn-sm'
  if (taille === 'lg') classe += ' btn-lg'
  if (bloc) classe += ' btn-bloc'
  if (className) classe += ' ' + className

  return (
    <button className={classe} type={type} {...rest}>
      {icone}
      {children}
    </button>
  )
}
