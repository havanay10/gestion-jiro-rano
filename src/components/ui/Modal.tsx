import { useEffect, useId, useRef, type ReactNode, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'

type ModalProps = {
  ouvert: boolean
  titre: string
  sousTitre?: string
  onFermer: () => void
  children: ReactNode
}

export function Modal({ ouvert, titre, sousTitre, onFermer, children }: ModalProps) {
  const dialogRef = useRef<HTMLElement>(null)
  const titreId = useId()

  useEffect(() => {
    if (!ouvert) return

    const focusPrecedent = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
    const overflowPrecedent = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const premierChamp = dialogRef.current?.querySelector<HTMLElement>(
      'input:not(:disabled), select:not(:disabled), textarea:not(:disabled), button:not(:disabled)'
    )
    ;(premierChamp ?? dialogRef.current)?.focus()

    function gererClavier(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onFermer()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return

      const elements = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'input:not(:disabled), select:not(:disabled), textarea:not(:disabled), button:not(:disabled), [href], [tabindex]:not([tabindex="-1"])'
      ))
      if (elements.length === 0) {
        event.preventDefault()
        dialogRef.current.focus()
      } else if (event.shiftKey && document.activeElement === elements[0]) {
        event.preventDefault()
        elements[elements.length - 1].focus()
      } else if (!event.shiftKey && document.activeElement === elements[elements.length - 1]) {
        event.preventDefault()
        elements[0].focus()
      }
    }

    document.addEventListener('keydown', gererClavier)
    return () => {
      document.removeEventListener('keydown', gererClavier)
      document.body.style.overflow = overflowPrecedent
      focusPrecedent?.focus()
    }
  }, [ouvert, onFermer])

  if (!ouvert) return null

  function fermerFond(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onFermer()
  }

  return createPortal(
    <div className="modale-overlay personnes-compte-modal-overlay" onMouseDown={fermerFond}>
      <section
        ref={dialogRef}
        className="modale modale-compacte"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titreId}
        tabIndex={-1}
      >
        <header className="modale-entete">
          <div>
          <h2 className="modale-titre" id={titreId}>{titre}</h2>
            {sousTitre && <p className="modale-sous-titre">{sousTitre}</p>}
          </div>
          <button type="button" className="modale-fermer" onClick={onFermer} aria-label="Fermer la fenêtre">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
          </button>
        </header>
        <div className="modale-corps">{children}</div>
      </section>
    </div>,
    document.body
  )
}
