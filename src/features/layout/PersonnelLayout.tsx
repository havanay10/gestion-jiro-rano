import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export function PersonnelLayout({ children }: { children: ReactNode }) {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 22 }}>Mon espace — Gestion Jiro &amp; Rano</h1>
        <button onClick={handleSignOut}>Se déconnecter</button>
      </header>
      <main>{children}</main>
    </div>
  )
}