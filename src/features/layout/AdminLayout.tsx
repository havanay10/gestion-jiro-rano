import type { ReactNode } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Footer } from './Footer'
import { useRef } from 'react'
import { LogoMarque } from '../../components/ui/LogoMarque'

export function AdminLayout({ children }: { children: ReactNode }) {
  const { signOut, user, profil } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const menuComplementaire = useRef<HTMLDetailsElement>(null)

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  // Initiales à partir de l'email (ex. "rivo.rasoa@..." → "RR")
  const email = user?.email ?? ''
  const nomAffiche = email.split('@')[0] || 'Admin'
  const initiales =
    nomAffiche
      .split(/[._-]/)
      .map((s) => s[0]?.toUpperCase() ?? '')
      .slice(0, 2)
      .join('') || 'AR'

  const roleAffiche = profil?.role === 'admin' ? 'Administrateur' : 'Utilisateur'

  const liens = [
    { to: '/admin', label: 'Tableau de bord', end: true },
    { to: '/admin/periodes', label: 'Saisie & Répartition' },
    { to: '/admin/personnes', label: 'Gestion des personnes' },
    { to: '/admin/historique', label: 'Historique & Export' },
  ]
  const menuComplementaireActif =
    location.pathname === '/admin/logements' || location.pathname === '/admin/audit'

  return (
    <div className="layout-app layout-app-admin">
      <header className="header-app">
        <div className="header-marque">
          <LogoMarque />
          <div className="header-marque-texte">
            <div className="header-marque-titre">Jiro &amp; Rano</div>
            <div className="header-marque-sous-titre">Gestion &amp; Décompte</div>
          </div>
        </div>

        <nav className="header-navigation" aria-label="Navigation principale">
          {liens.map((lien) => (
            <NavLink
              key={lien.to}
              to={lien.to}
              end={lien.end}
              className={({ isActive }) =>
                'header-lien' + (isActive ? ' header-lien-actif' : '')
              }
            >
              {lien.label}
            </NavLink>
          ))}
          <details className="header-menu" ref={menuComplementaire}>
            <summary className={'header-lien' + (menuComplementaireActif ? ' header-lien-actif' : '')}>
              Administration <span aria-hidden="true">⌄</span>
            </summary>
            <div className="header-menu-contenu">
              <NavLink to="/admin/logements" className="header-menu-lien" onClick={() => { if (menuComplementaire.current) menuComplementaire.current.open = false }}>
                Logements
              </NavLink>
              <NavLink to="/admin/audit" className="header-menu-lien" onClick={() => { if (menuComplementaire.current) menuComplementaire.current.open = false }}>
                Journal d’audit
              </NavLink>
            </div>
          </details>
        </nav>

        <div className="header-utilisateur">
          <div className="avatar header-profil-avatar" aria-hidden="true">{initiales}</div>
          <div className="header-utilisateur-texte">
            <div className="header-utilisateur-nom">{nomAffiche}</div>
            <div className="header-utilisateur-role">{roleAffiche}</div>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            title="Se déconnecter"
            className="header-action"
            aria-label="Se déconnecter"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M10 17l5-5-5-5M15 12H3m9-8h6a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3h-6" />
            </svg>
          </button>
        </div>
      </header>

      <main className="layout-contenu layout-contenu-admin">{children}</main>

      <Footer />
    </div>
  )
}
