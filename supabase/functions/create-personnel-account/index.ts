import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-client-info, apikey',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Non authentifié.')

    // Client avec le JWT de l'appelant (pour vérifier qu'il est admin)
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: isAdmin, error: errAdmin } = await supabaseUser.rpc('est_admin')
    if (errAdmin) throw new Error(errAdmin.message)
    if (!isAdmin) throw new Error('Accès refusé. Seul un administrateur peut créer un compte.')

    const { email, password, personne_id } = await req.json()
    if (!email || !password || !personne_id) {
      throw new Error('Email, mot de passe et personne_id sont obligatoires.')
    }
    if (password.length < 8) {
      throw new Error('Le mot de passe doit contenir au moins 8 caractères.')
    }

    // Client admin (service_role) pour créer l'utilisateur
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 1. Créer l'utilisateur Auth
    const { data: newUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (authError) throw new Error(authError.message)
    if (!newUser?.user) throw new Error('Création de l’utilisateur impossible.')

    // 2. Créer le profil lié à la personne
    const { error: profilError } = await supabaseAdmin.rpc('creer_profil_personnel', {
      p_user_id: newUser.user.id,
      p_personne_id: personne_id,
    })

    if (profilError) {
      // Rollback : on supprime l'utilisateur Auth pour ne pas laisser un compte orphelin
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
      throw new Error(profilError.message)
    }

    return new Response(
      JSON.stringify({ ok: true, user_id: newUser.user.id, email }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Erreur inconnue'
    return new Response(
      JSON.stringify({ ok: false, error: message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})