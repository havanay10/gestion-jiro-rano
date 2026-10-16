import type { ReactNode } from 'react'

type PageHeaderProps = {
  surtitre?: string
  titre: ReactNode
  sousTitre?: ReactNode
  actions?: ReactNode
}

export function PageHeader({ surtitre, titre, sousTitre, actions }: PageHeaderProps) {
  return (
    <header className="page-entete">
      <div className="page-entete-titre">
        {surtitre && <div className="page-surtitre">{surtitre}</div>}
        <h1>{titre}</h1>
        {sousTitre && <div className="page-sous-titre">{sousTitre}</div>}
      </div>
      {actions && <div className="ligne">{actions}</div>}
    </header>
  )
}