import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Origines autorisées (à adapter à votre domaine de production)
const ORIGINES_AUTORISEES = [
  'http://localhost:5173',
  'http://localhost:4173',
  // Remplacez par votre URL Vercel réelle
  'https://gestion-jiro-rano.vercel.app',
]

function corsPour(req: Request): Record<string, string> | null {
  const origin = req.headers.get('Origin') ?? ''
  if (!ORIGINES_AUTORISEES.includes(origin)) return null
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers':
      'authorization, content-type, x-client-info, apikey, x-supabase-api-version, prefer',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  }
}

Deno.serve(async (req) => {
  const cors = corsPour(req)

  if (!cors) {
    return new Response(
      JSON.stringify({ ok: false, error: 'Origine non autorisée.' }),
      { status: 403, headers: { 'Content-Type': 'application/json', 'Vary': 'Origin' } }
    )
  }

  // Précontrôle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors })
  }

  // Seule la méthode POST est acceptée
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ ok: false, error: 'Méthode non autorisée.' }),
      { status: 405, headers: { ...cors, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // 1. Vérifier la présence du JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Non authentifié.')
    }

    // 2. Vérifier que l'appelant est admin
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: isAdmin, error: errAdmin } = await supabaseUser.rpc('est_admin')
    if (errAdmin) throw new Error(errAdmin.message)
    if (!isAdmin) {
      throw new Error('Accès refusé. Seul un administrateur peut créer un compte.')
    }

    // 3. Valider les paramètres
    const { email, password, personne_id } = await req.json()
    if (!email || !password || !personne_id) {
      throw new Error('Email, mot de passe et personne_id sont obligatoires.')
    }
    if (password.length < 8) {
      throw new Error('Le mot de passe doit contenir au moins 8 caractères.')
    }

    // 4. Créer l'utilisateur Auth avec le service_role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: newUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (authError) throw new Error(authError.message)
    if (!newUser?.user) throw new Error('Création de l’utilisateur impossible.')

    // 5. Créer le profil (rollback si échec)
    const { error: profilError } = await supabaseAdmin.rpc('creer_profil_personnel', {
      p_user_id: newUser.user.id,
      p_personne_id: personne_id,
    })

    if (profilError) {
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
      throw new Error(profilError.message)
    }

    return new Response(
      JSON.stringify({ ok: true, user_id: newUser.user.id, email }),
      { headers: { ...cors, 'Content-Type': 'application/json' } }
    )
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erreur inconnue'
    return new Response(
      JSON.stringify({ ok: false, error: message }),
      { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
    )
  }
})
