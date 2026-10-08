import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

type Props = {
  children: ReactNode
  roleRequis?: 'admin' | 'personnel'
}

export function ProtectedRoute({ children, roleRequis }: Props) {
  const { user, profil, loading } = useAuth()

  if (loading) {
    return <div style={{ padding: 40 }}>Chargement…</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!profil) {
    return (
      <div style={{ padding: 40 }}>
        Profil introuvable. Contactez l’administrateur.
      </div>
    )
  }

  if (!profil.actif) {
    return (
      <div style={{ padding: 40 }}>
        Votre compte est désactivé. Contactez l’administrateur.
      </div>
    )
  }

  if (roleRequis && profil.role !== roleRequis) {
    // Redirection vers l’espace correspondant au rôle réel
    return <Navigate to={profil.role === 'admin' ? '/admin' : '/espace'} replace />
  }

  return <>{children}</>
}