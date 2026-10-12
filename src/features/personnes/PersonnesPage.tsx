import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { personneSchema } from './schema'
import type { PersonneFormValues } from './schema'
import { usePersonnes } from './usePersonnes'
import { supabase } from '../../lib/supabase'

type LogementOption = { id: string; nom_code: string }

export function PersonnesPage() {
  const {
    personnes,
    loading,
    erreur,
    erreurEmails,
    creerPersonne,
    recharger,
  } = usePersonnes()

  const [logementsDispo, setLogementsDispo] = useState<LogementOption[]>([])
  const [messageSucces, setMessageSucces] = useState('')
  const [messageErreur, setMessageErreur] = useState('')

  // Création de compte
  const [compteEnCours, setCompteEnCours] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [messageCompte, setMessageCompte] = useState('')

  // Réactivation
  const [reactivationEnCours, setReactivationEnCours] = useState<string | null>(null)
  const [logementReactivation, setLogementReactivation] = useState<string>('')
  const [messageReactivation, setMessageReactivation] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PersonneFormValues>({
    resolver: zodResolver(personneSchema),
    defaultValues: {
      nom: '',
      periode_depart_annee: String(new Date().getFullYear()),
      periode_depart_mois: String(new Date().getMonth() + 1),
      index_initial: '0',
      logement_id: null,
    },
  })

  // Charge uniquement les logements NON occupés par une personne active
  const chargerLogementsDispo = useCallback(async () => {
    const { data: actifs, error: errA } = await supabase
      .from('personnes')
      .select('id')
      .eq('statut_actif', true)

    if (errA) {
      setMessageErreur(errA.message)
      return
    }

    const idsActifs = (actifs ?? []).map((p) => p.id)

    let occupees = new Set<string>()
    if (idsActifs.length > 0) {
      const { data: rattach, error: errR } = await supabase
        .from('rattachements_personne_logement')
        .select('logement_id')
        .is('date_fin', null)
        .in('personne_id', idsActifs)

      if (errR) {
        setMessageErreur(errR.message)
        return
      }
      occupees = new Set((rattach ?? []).map((r) => r.logement_id))
    }

    const { data: tous, error: errL } = await supabase
      .from('logements')
      .select('id, nom_code')
      .order('nom_code')

    if (errL) {
      setMessageErreur(errL.message)
      return
    }
    setLogementsDispo((tous ?? []).filter((l) => !occupees.has(l.id)))
  }, [])

  useEffect(() => {
    chargerLogementsDispo()
  }, [chargerLogementsDispo, personnes])

  async function onSubmit(values: PersonneFormValues) {
    setMessageSucces('')
    setMessageErreur('')
    try {
      await creerPersonne({
        nom: values.nom,
        periode_depart_annee: Number(values.periode_depart_annee),
        periode_depart_mois: Number(values.periode_depart_mois),
        index_initial: Number(values.index_initial),
        logement_id: values.logement_id ?? null,
      })
      setMessageSucces(`Personne « ${values.nom} » créée.`)
      reset({
        nom: '',
        periode_depart_annee: String(new Date().getFullYear()),
        periode_depart_mois: String(new Date().getMonth() + 1),
        index_initial: '0',
        logement_id: null,
      })
      await chargerLogementsDispo()
    } catch (e: unknown) {
      setMessageErreur(e instanceof Error ? e.message : 'Erreur inconnue.')
    }
  }

  async function desactiverPersonne(id: string) {
    setMessageSucces('')
    setMessageErreur('')
    try {
      const { error } = await supabase.rpc('desactiver_personne', {
        p_personne_id: id,
      })
      if (error) throw new Error(error.message)
      setMessageSucces('Personne et compte(s) désactivés.')
      await recharger()
      await chargerLogementsDispo()
    } catch (e: unknown) {
      setMessageErreur(e instanceof Error ? e.message : 'Erreur inconnue.')
    }
  }

  async function reactiverAvecLogement(id: string) {
    setMessageReactivation('')
    if (!logementReactivation) {
      setMessageReactivation('Sélectionnez un logement.')
      return
    }
    try {
      const { error } = await supabase.rpc('reactiver_personne', {
        p_personne_id: id,
        p_logement_id: logementReactivation,
      })
      if (error) throw new Error(error.message)

      setMessageSucces('Personne et compte(s) réactivés.')
      setReactivationEnCours(null)
      setLogementReactivation('')
      await recharger()
      await chargerLogementsDispo()
    } catch (e: unknown) {
      setMessageReactivation(e instanceof Error ? e.message : 'Erreur inconnue.')
    }
  }

  async function creerCompte(personne_id: string) {
    setMessageCompte('')
    if (!email || !password) {
      setMessageCompte('Email et mot de passe obligatoires.')
      return
    }
    if (password.length < 8) {
      setMessageCompte('Mot de passe : au moins 8 caractères.')
      return
    }
    try {
      const { data, error } = await supabase.functions.invoke(
        'create-personnel-account',
        { body: { email, password, personne_id } }
      )

      if (error) {
        let message = error.message
        try {
          const ctx = (error as any).context
          if (ctx && typeof ctx.json === 'function') {
            const body = await ctx.json()
            message = body?.error ?? message
          }
        } catch {
          // ignore
        }
        throw new Error(message)
      }

      if (!data?.ok) {
        throw new Error(data?.error ?? 'Erreur inconnue.')
      }

      setMessageCompte('Compte créé avec succès.')
      setCompteEnCours(null)
      setEmail('')
      setPassword('')
      await recharger()
    } catch (e: unknown) {
      setMessageCompte(e instanceof Error ? e.message : 'Erreur inconnue.')
    }
  }

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <header>
        <h2>Gestion des personnes</h2>
        <p style={{ color: '#666' }}>
          Créez une personne avec son index initial et son logement. Les personnes
          existantes peuvent être activées, désactivées, ou recevoir un compte.
        </p>
      </header>

      {/* Formulaire de création */}
      <section style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
        <h3>Nouvelle personne</h3>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'grid', gap: 12 }}>
          <label>
            Nom *
            <input type="text" {...register('nom')} />
            {errors.nom && <span style={{ color: 'crimson' }}>{errors.nom.message}</span>}
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label>
              Année de départ *
              <input
                type="text"
                inputMode="numeric"
                placeholder="2026"
                {...register('periode_depart_annee')}
              />
              {errors.periode_depart_annee && (
                <span style={{ color: 'crimson' }}>{errors.periode_depart_annee.message}</span>
              )}
            </label>
            <label>
              Mois de départ (1-12) *
              <input
                type="text"
                inputMode="numeric"
                placeholder="10"
                {...register('periode_depart_mois')}
              />
              {errors.periode_depart_mois && (
                <span style={{ color: 'crimson' }}>{errors.periode_depart_mois.message}</span>
              )}
            </label>
          </div>

          <label>
            Index initial (kWh) *
            <input
              type="text"
              inputMode="decimal"
              placeholder="1000"
              {...register('index_initial')}
            />
            {errors.index_initial && (
              <span style={{ color: 'crimson' }}>{errors.index_initial.message}</span>
            )}
          </label>

          <label>
            Logement (seuls les logements libres sont proposés)
            <select {...register('logement_id')}>
              <option value="">— Aucun —</option>
              {logementsDispo.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nom_code}
                </option>
              ))}
            </select>
            {logementsDispo.length === 0 && (
              <span style={{ fontSize: 12, color: '#888' }}>
                Tous les logements sont actuellement occupés par une personne active.
              </span>
            )}
          </label>

          <div>
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Enregistrement…' : 'Créer la personne'}
            </button>
          </div>

          {messageSucces && <p style={{ color: 'green' }}>{messageSucces}</p>}
          {messageErreur && <p style={{ color: 'crimson' }}>{messageErreur}</p>}
        </form>
      </section>

      {/* Liste */}
      <section>
        <h3>Personnes existantes ({personnes.length})</h3>

        {erreurEmails && (
          <div
            style={{
              border: '1px solid #f59e0b',
              background: '#fef3c7',
              color: '#92400e',
              padding: 12,
              borderRadius: 6,
              marginBottom: 12,
              fontSize: 13,
            }}
          >
            ⚠ Impossible de charger l’état des comptes : {erreurEmails}. Le bouton
            « Créer un compte » est désactivé pour éviter les doublons.
          </div>
        )}

        {loading && <p>Chargement…</p>}
        {erreur && <p style={{ color: 'crimson' }}>Erreur : {erreur}</p>}
        {!loading && personnes.length === 0 && <p>Aucune personne enregistrée.</p>}

        {personnes.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                <th style={{ padding: 8 }}>Nom</th>
                <th style={{ padding: 8 }}>Logement</th>
                <th style={{ padding: 8 }}>Période de départ</th>
                <th style={{ padding: 8 }}>Dernier index</th>
                <th style={{ padding: 8 }}>Statut</th>
                <th style={{ padding: 8 }}>Compte</th>
                <th style={{ padding: 8 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {personnes.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: 8 }}>{p.nom}</td>
                  <td style={{ padding: 8 }}>{p.logement_nom ?? '—'}</td>
                  <td style={{ padding: 8 }}>
                    {String(p.periode_depart_mois).padStart(2, '0')}/{p.periode_depart_annee}
                  </td>
                  <td style={{ padding: 8 }}>
                    {p.dernier_index !== null ? `${p.dernier_index} kWh` : '—'}
                  </td>
                  <td style={{ padding: 8 }}>
                    {p.statut_actif ? (
                      <span style={{ color: 'green' }}>Actif</span>
                    ) : (
                      <span style={{ color: 'crimson' }}>Inactif</span>
                    )}
                  </td>
                  <td style={{ padding: 8 }}>
                    {erreurEmails ? (
                      <span style={{ color: '#92400e' }}>⚠ État inconnu</span>
                    ) : p.compte_email ? (
                      <span style={{ color: 'green' }}>✓ {p.compte_email}</span>
                    ) : (
                      <span style={{ color: '#888' }}>Aucun</span>
                    )}
                  </td>
                  <td style={{ padding: 8, display: 'flex', gap: 4 }}>
                    {p.statut_actif ? (
                      <button type="button" onClick={() => desactiverPersonne(p.id)}>
                        Désactiver
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setReactivationEnCours(p.id)
                          setLogementReactivation('')
                          setMessageReactivation('')
                        }}
                      >
                        Réactiver
                      </button>
                    )}
                    {!p.compte_email && (
                      <button
                        type="button"
                        onClick={() => {
                          setCompteEnCours(p.id)
                          setEmail('')
                          setPassword('')
                          setMessageCompte('')
                        }}
                        disabled={!!erreurEmails}
                        title={erreurEmails ? 'État des comptes indisponible' : undefined}
                      >
                        Créer un compte
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Formulaire de création de compte */}
        {compteEnCours && (
          <section
            style={{
              border: '1px solid #ddd',
              borderRadius: 8,
              padding: 16,
              marginTop: 16,
            }}
          >
            <h4 style={{ marginTop: 0 }}>
              Créer un compte pour{' '}
              {personnes.find((p) => p.id === compteEnCours)?.nom}
            </h4>
            <div style={{ display: 'grid', gap: 12, maxWidth: 400 }}>
              <label>
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label>
                Mot de passe (8 caractères minimum)
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => creerCompte(compteEnCours)}>
                  Créer le compte
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCompteEnCours(null)
                    setEmail('')
                    setPassword('')
                    setMessageCompte('')
                  }}
                >
                  Annuler
                </button>
              </div>
              {messageCompte && <p style={{ color: 'crimson' }}>{messageCompte}</p>}
            </div>
          </section>
        )}

        {/* Formulaire de réactivation */}
        {reactivationEnCours && (
          <section
            style={{
              border: '1px solid #ddd',
              borderRadius: 8,
              padding: 16,
              marginTop: 16,
            }}
          >
            <h4 style={{ marginTop: 0 }}>
              Réactiver{' '}
              {personnes.find((p) => p.id === reactivationEnCours)?.nom}
            </h4>

            <p style={{ color: '#666', fontSize: 13 }}>
              Choisissez le logement à réattribuer. Seuls les logements libres sont
              proposés. Le rattachement précédent reste dans l’historique.
            </p>

            <div style={{ display: 'grid', gap: 12, maxWidth: 400 }}>
              <label>
                Logement
                <select
                  value={logementReactivation}
                  onChange={(e) => setLogementReactivation(e.target.value)}
                >
                  <option value="">— Sélectionner —</option>
                  {logementsDispo.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.nom_code}
                    </option>
                  ))}
                </select>
              </label>

              {logementsDispo.length === 0 && (
                <p style={{ fontSize: 12, color: '#888' }}>
                  Aucun logement disponible. Libérez un logement d’abord.
                </p>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => reactiverAvecLogement(reactivationEnCours)}
                  disabled={logementsDispo.length === 0}
                >
                  Réactiver
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReactivationEnCours(null)
                    setLogementReactivation('')
                    setMessageReactivation('')
                  }}
                >
                  Annuler
                </button>
              </div>

              {messageReactivation && (
                <p style={{ color: 'crimson' }}>{messageReactivation}</p>
              )}
            </div>
          </section>
        )}
      </section>
    </div>
  )
}