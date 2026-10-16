import { useEffect, type ReactNode } from 'react'

type DrawerProps = {
  ouvert: boolean
  titre: ReactNode
  sousTitre?: ReactNode
  onFermer: () => void
  pied?: ReactNode
  children: ReactNode
}

export function Drawer({ ouvert, titre, sousTitre, onFermer, pied, children }: DrawerProps) {
  // Fermeture par la touche Échap
  useEffect(() => {
    if (!ouvert) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onFermer()
    }
    document.addEventListener('keydown', onKey)
    // Empêcher le scroll du body
    const ancienOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ancienOverflow
    }
  }, [ouvert, onFermer])

  if (!ouvert) return null

  return (
    <>
      <div className="drawer-overlay" onClick={onFermer} />
      <div className="drawer" role="dialog" aria-modal="true">
        <div className="drawer-entete">
          <div>
            <div className="drawer-titre">{titre}</div>
            {sousTitre && <div className="drawer-sous-titre">{sousTitre}</div>}
          </div>
          <button
            type="button"
            className="drawer-fermeture"
            onClick={onFermer}
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>
        <div className="drawer-corps">{children}</div>
        {pied && <div className="drawer-pied">{pied}</div>}
      </div>
    </>
  )
}