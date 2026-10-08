import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from './AuthContext'

export function LoginPage() {
  const navigate = useNavigate()
  const { user, profil, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [enCours, setEnCours] = useState(false)

  // Redirection automatique si déjà connecté
  useEffect(() => {
    if (!loading && user && profil) {
      navigate(profil.role === 'admin' ? '/admin' : '/espace', { replace: true })
    }
  }, [loading, user, profil, navigate])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')
    setEnCours(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    setEnCours(false)

    if (error) {
      setMessage(`Erreur : ${error.message}`)
    }
    // La redirection est gérée par le useEffect ci-dessus
  }

  return (
    <main style={{ maxWidth: 420, margin: '4rem auto', padding: '1rem' }}>
      <h1>Connexion — Gestion Jiro &amp; Rano</h1>

      <form onSubmit={handleLogin} style={{ display: 'grid', gap: '1rem' }}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </label>

        <label>
          Mot de passe
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>

        <button type="submit" disabled={enCours}>
          {enCours ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>

      {message && <p style={{ color: 'crimson' }}>{message}</p>}
    </main>
  )
}