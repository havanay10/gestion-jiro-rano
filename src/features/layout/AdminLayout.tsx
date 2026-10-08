import type { ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

const lienStyle = ({ isActive }: { isActive: boolean }) => ({
  padding: '0.5rem 0.75rem',
  borderRadius: 6,
  textDecoration: 'none',
  color: isActive ? '#fff' : '#333',
  background: isActive ? '#2d6a4f' : 'transparent',
})

export function AdminLayout({ children }: { children: ReactNode }) {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', minHeight: '100vh' }}>
      <aside style={{ borderRight: '1px solid #e5e7eb', padding: '1rem', background: '#fafafa' }}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Gestion Jiro &amp; Rano</h2>
        <nav style={{ display: 'grid', gap: 4 }}>
          <NavLink to="/admin" end style={lienStyle}>Tableau de bord</NavLink>
          <NavLink to="/admin/logements" style={lienStyle}>Logements</NavLink>
          <NavLink to="/admin/personnes" style={lienStyle}>Personnes</NavLink>
          <NavLink to="/admin/periodes" style={lienStyle}>Périodes</NavLink>
          <NavLink to="/admin/historique" style={lienStyle}>Historique</NavLink>
          <NavLink to="/admin/audit" style={lienStyle}>Journal d’audit</NavLink>
        </nav>
        <button onClick={handleSignOut} style={{ marginTop: '2rem' }}>
          Se déconnecter
        </button>
      </aside>

      <main style={{ padding: '2rem' }}>{children}</main>
    </div>
  )
}