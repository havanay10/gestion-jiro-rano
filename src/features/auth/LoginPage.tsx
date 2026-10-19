import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from './AuthContext'
import { LogoMarque } from '../../components/ui/LogoMarque'
import { Icone } from '../../components/ui/Icone'

export function LoginPage() {
  const navigate = useNavigate()
  const { user, profil, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [motDePasseVisible, setMotDePasseVisible] = useState(false)
  const [message, setMessage] = useState('')
  const [enCours, setEnCours] = useState(false)

  // Redirection automatique si déjà connecté
  useEffect(() => {
    if (!loading && user && profil) {
      navigate(profil.role === 'admin' ? '/admin' : '/accueil', { replace: true })
    }
  }, [loading, user, profil, navigate])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')
    setEnCours(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    setEnCours(false)

    if (error) {
      // Message générique pour ne pas exposer les détails Supabase
      setMessage('Identifiant ou mot de passe incorrect. Veuillez vérifier vos accès.')
    }
    // En cas de succès, la redirection est gérée par le useEffect ci-dessus
  }

  return (
    <main className="login-page">
      <div className="login-conteneur">
        <header className="login-entete">
          <LogoMarque variante="connexion" />
          <div>
            <h1 className="login-titre">Gestion Jiro &amp; Rano</h1>
            <div className="login-sous-titre">Connexion à votre espace de gestion</div>
          </div>
        </header>

        <section className="login-boite" aria-label="Connexion">
          <form onSubmit={handleLogin} className="login-formulaire">
          {message && (
            <div className="message message-erreur" role="alert" aria-live="assertive">
              <span className="message-icone"><Icone nom="avertissement" /></span>
              <div>
                <div className="message-titre">Erreur d'authentification</div>
                <div>{message}</div>
              </div>
            </div>
          )}

          <div className="champ">
            <label className="champ-label" htmlFor="login-email">
              Adresse e-mail
            </label>
            <div className="champ-icone">
              <span className="champ-icone-gauche"><Icone nom="mail" /></span>
              <input
                id="login-email"
                type="email"
                className="champ-saisie"
                placeholder="nom@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="champ">
            <label className="champ-label" htmlFor="login-password">
              Mot de passe
            </label>
            <div className="champ-icone">
              <span className="champ-icone-gauche"><Icone nom="cadenas" /></span>
              <input
                id="login-password"
                type={motDePasseVisible ? 'text' : 'password'}
                className="champ-saisie"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="champ-icone-droite"
                onClick={() => setMotDePasseVisible((v) => !v)}
                aria-label={motDePasseVisible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                aria-pressed={motDePasseVisible}
              >
                <Icone nom={motDePasseVisible ? 'oeilMasque' : 'oeil'} />
              </button>
            </div>
          </div>

          <div className="login-note">
            <span><Icone nom="info" /></span>
            <span>Les comptes sont créés par l'administrateur.</span>
          </div>

          <button type="submit" className="btn btn-primaire btn-lg btn-bloc" disabled={enCours}>
            {enCours ? 'Connexion…' : '→ Se connecter'}
          </button>
          </form>
        </section>

        <footer className="login-pied">© Gestion Jiro &amp; Rano 2026</footer>
      </div>
    </main>
  )
}
