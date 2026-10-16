type LogoMarqueProps = { variante?: 'barre' | 'connexion' }

export function LogoMarque({ variante = 'barre' }: LogoMarqueProps) {
  return (
    <span className={`logo-marque logo-marque-${variante}`} aria-label="Gestion Jiro et Rano">
      <svg viewBox="0 0 40 40" aria-hidden="true" focusable="false">
        <path d="M17.8 3.5 7.2 21.3h9.5l-1.1 15.2 16.9-22h-10l3-11z" fill="#ffad19" />
        <path d="M30.8 17.1c-1.1 2.2-5.2 7.2-5.2 10.4a5.4 5.4 0 0 0 10.8 0c0-3.2-4.2-8.2-5.2-10.4a.25.25 0 0 0-.4 0Z" fill="#16a6dc" />
      </svg>
    </span>
  )
}
