import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'

type Role = 'admin' | 'personnel'

type Profil = {
  id: string
  role: Role
  personne_id: string | null
  actif: boolean
}

type AuthContextValue = {
  session: Session | null
  user: User | null
  profil: Profil | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profil, setProfil] = useState<Profil | null>(null)
  const [loading, setLoading] = useState(true)

  async function chargerProfil(userId: string) {
    const { data, error } = await supabase
      .from('profils')
      .select('id, role, personne_id, actif')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      console.error('Erreur chargement profil :', error)
      setProfil(null)
      return
    }
    setProfil(data as Profil | null)
  }

  useEffect(() => {
    // 1) Récupérer la session actuelle au démarrage
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        chargerProfil(session.user.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    // 2) Écouter les changements (connexion / déconnexion)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          await chargerProfil(session.user.id)
        } else {
          setProfil(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    setSession(null)
    setUser(null)
    setProfil(null)
  }

  return (
    <AuthContext.Provider value={{ session, user, profil, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth doit être utilisé dans un AuthProvider')
  return ctx
}