import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Footer } from './Footer'
import { NavLink, useLocation } from 'react-router-dom'
import { Icone, LogoMarque } from '../../components/ui'

export function PersonnelLayout({ children }: { children: ReactNode }) {
  const { signOut, user, profil } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  const email = user?.email ?? ''
  const nomAffiche = email.split('@')[0] || 'Utilisateur'
  const initiales =
    nomAffiche
      .split(/[._-]/)
      .map((s) => s[0]?.toUpperCase() ?? '')
      .slice(0, 2)
      .join('') || 'U'

  const sousTitre =
    profil?.role === 'personnel' ? 'Espace personnel' : 'Utilisateur'

  return (
    <div className={`layout-app layout-app-personnel${location.pathname === '/accueil' ? ' layout-app-accueil' : ''}`}>
      <header className="header-app">
        <div className="header-marque">
          <LogoMarque />
          <div className="header-marque-texte">
            <div className="header-marque-titre">Jiro &amp; Rano</div>
            <div className="header-marque-sous-titre">Gestion &amp; Décompte</div>
          </div>
        </div>

        <nav className="header-navigation header-navigation-personnel" aria-label="Navigation personnelle">
          <NavLink to="/accueil" end className={({ isActive }) => 'header-lien' + (isActive ? ' header-lien-actif' : '')}>
            <Icone nom="accueil" /> Accueil
          </NavLink>
          <NavLink to="/espace" className={({ isActive }) => 'header-lien' + (isActive ? ' header-lien-actif' : '')}>
            <Icone nom="espace" /> Mon espace
          </NavLink>
        </nav>

        <div className="header-utilisateur">
          <div className="avatar header-profil-avatar" aria-hidden="true">{initiales}</div>
          <div className="header-utilisateur-texte">
            <div className="header-utilisateur-nom">{nomAffiche}</div>
            <div className="header-utilisateur-role">{sousTitre}</div>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="header-action"
            title="Se déconnecter"
            aria-label="Se déconnecter"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M10 17l5-5-5-5M15 12H3m9-8h6a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3h-6" />
            </svg>
          </button>
        </div>
      </header>

      <main className={`layout-contenu layout-contenu-personnel${location.pathname === '/accueil' ? ' layout-contenu-accueil' : ''}`}>{children}</main>

      <Footer />
    </div>
  )
}
