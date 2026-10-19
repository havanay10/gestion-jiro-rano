import type { ReactNode } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

type Props = {
  children: ReactNode
  roleRequis?: 'admin' | 'personnel'
}

export function ProtectedRoute({ children, roleRequis }: Props) {
  const { user, profil, loading, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleDeconnexion() {
    await signOut()
    navigate('/login', { replace: true })
  }

  if (loading) {
    return <div style={{ padding: 40 }}>Chargement…</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!profil) {
    return (
      <div style={{ padding: 40, maxWidth: 520 }}>
        <h2 style={{ marginTop: 0 }}>Profil introuvable</h2>
        <p>
          Aucun profil n’est associé à ce compte. Contactez l’administrateur.
        </p>
        <button
          type="button"
          onClick={handleDeconnexion}
          style={{
            padding: '8px 16px',
            background: '#0f172a',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          Se déconnecter
        </button>
      </div>
    )
  }

  if (!profil.actif) {
    return (
      <div style={{ padding: 40, maxWidth: 520 }}>
        <div
          style={{
            border: '1px solid crimson',
            borderRadius: 8,
            padding: 20,
            background: '#fff5f5',
          }}
        >
          <h2 style={{ marginTop: 0, color: 'crimson', fontSize: 18 }}>
            Accès refusé
          </h2>
          <p style={{ color: '#333', marginBottom: 16 }}>
            Votre compte est désactivé. Vous ne pouvez plus accéder à vos
            données. Contactez l’administrateur si vous pensez qu’il s’agit
            d’une erreur.
          </p>
          <button
            type="button"
            onClick={handleDeconnexion}
            style={{
              padding: '8px 16px',
              background: '#0f172a',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            Se déconnecter
          </button>
        </div>
      </div>
    )
  }

  if (roleRequis && profil.role !== roleRequis) {
    return (
      <Navigate
        to={profil.role === 'admin' ? '/admin' : '/accueil'}
        replace
      />
    )
  }

  return <>{children}</>
}
