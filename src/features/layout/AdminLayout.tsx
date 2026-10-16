import type { ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Footer } from './Footer'

export function AdminLayout({ children }: { children: ReactNode }) {
  const { signOut, user, profil } = useAuth()
  const navigate = useNavigate()

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
    { to: '/admin/logements', label: 'Logements' },
    { to: '/admin/historique', label: 'Historique & Export' },
    { to: '/admin/audit', label: "Journal d'audit" },
  ]

  return (
    <div className="layout-app">
      <header className="header-app">
        <div className="header-marque">
          <div className="header-marque-icone">JR</div>
          <div className="header-marque-texte">
            <div className="header-marque-titre">Jiro &amp; Rano</div>
            <div className="header-marque-sous-titre">Gestion &amp; Décompte</div>
          </div>
        </div>

        <nav className="header-navigation">
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
        </nav>

        <div className="header-utilisateur">
          <div className="avatar">{initiales}</div>
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
            ⎋
          </button>
        </div>
      </header>

      <main className="layout-contenu">{children}</main>

      <Footer />
    </div>
  )
}