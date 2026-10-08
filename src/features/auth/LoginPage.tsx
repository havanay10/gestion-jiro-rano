import { useState } from 'react'
import { supabase } from '../../lib/supabase'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setMessage(`Erreur : ${error.message}`)
      return
    }

    setMessage('Connexion réussie.')
  }

  return (
    <main style={{ maxWidth: 420, margin: '4rem auto', padding: '1rem' }}>
      <h1>Connexion — Gestion Jiro & Rano</h1>

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

        <button type="submit">Se connecter</button>
      </form>

      {message && <p>{message}</p>}
    </main>
  )
}