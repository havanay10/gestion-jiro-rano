import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Footer } from './Footer'
import { NavLink } from 'react-router-dom'
import { LogoMarque } from '../../components/ui/LogoMarque'

export function PersonnelLayout({ children }: { children: ReactNode }) {
  const { signOut, user, profil } = useAuth()
  const navigate = useNavigate()

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
    <div className="layout-app layout-app-personnel">
      <header className="header-app">
        <div className="header-marque">
          <LogoMarque />
          <div className="header-marque-texte">
            <div className="header-marque-titre">Jiro &amp; Rano</div>
            <div className="header-marque-sous-titre">Gestion &amp; Décompte</div>
          </div>
        </div>

        <nav className="header-navigation header-navigation-personnel" aria-label="Navigation personnelle">
          <NavLink to="/espace" className={({ isActive }) => 'header-lien' + (isActive ? ' header-lien-actif' : '')}>
            Mon espace
          </NavLink>
        </nav>

        <div className="header-utilisateur">
          <div className="avatar">{initiales}</div>
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
            ⎋
          </button>
        </div>
      </header>

      <main className="layout-contenu layout-contenu-personnel">{children}</main>

      <Footer />
    </div>
  )
}
