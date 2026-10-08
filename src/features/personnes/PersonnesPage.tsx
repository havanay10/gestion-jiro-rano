import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { personneSchema } from './schema'
import type { PersonneFormValues } from './schema'
import { usePersonnes } from './usePersonnes'
import { supabase } from '../../lib/supabase'

type LogementOption = { id: string; nom_code: string }

export function PersonnesPage() {
  const { personnes, loading, erreur, creerPersonne, recharger } = usePersonnes()
  const [logementsDispo, setLogementsDispo] = useState<LogementOption[]>([])
  const [messageSucces, setMessageSucces] = useState('')
  const [messageErreur, setMessageErreur] = useState('')

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
    // 1. Récupérer les personnes actives
    const { data: actifs, error: errA } = await supabase
      .from('personnes')
      .select('id')
      .eq('statut_actif', true)

    if (errA) {
      setMessageErreur(errA.message)
      return
    }

    const idsActifs = (actifs ?? []).map((p) => p.id)

    // 2. Récupérer les rattachements en cours pour ces personnes
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

    // 3. Récupérer tous les logements, puis filtrer
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

  // Recharge les logements dispo à chaque changement de la liste personnes
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

  async function basculerStatut(id: string, actif: boolean) {
    setMessageSucces('')
    setMessageErreur('')
    try {
      const { error } = await supabase
        .from('personnes')
        .update({ statut_actif: !actif })
        .eq('id', id)
      if (error) throw new Error(error.message)
      setMessageSucces('Statut mis à jour.')
      await recharger()
      await chargerLogementsDispo()
    } catch (e: unknown) {
      setMessageErreur(e instanceof Error ? e.message : 'Erreur inconnue.')
    }
  }

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <header>
        <h2>Gestion des personnes</h2>
        <p style={{ color: '#666' }}>
          Créez une personne avec son index initial et son logement. Les personnes
          existantes ne peuvent qu’être activées ou désactivées.
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

        {loading && <p>Chargement…</p>}
        {erreur && <p style={{ color: 'crimson' }}>Erreur : {erreur}</p>}
        {!loading && personnes.length === 0 && <p>Aucune personne enregistrée.</p>}

        {personnes.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                <th style={{ padding: 8 }}>Nom</th>
                <th style={{ padding: 8 }}>Logement</th>
                <th style={{ padding: 8 }}>Période de départ</th>
                <th style={{ padding: 8 }}>Dernier index</th>
                <th style={{ padding: 8 }}>Statut</th>
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
                    <button
                      type="button"
                      onClick={() => basculerStatut(p.id, p.statut_actif)}
                    >
                      {p.statut_actif ? 'Désactiver' : 'Réactiver'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}