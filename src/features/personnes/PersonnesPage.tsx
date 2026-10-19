import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { personneSchema } from './schema'
import type { PersonneFormValues } from './schema'
import { usePersonnes } from './usePersonnes'
import { supabase } from '../../lib/supabase'
import { Drawer } from '../../components/ui/Drawer'
import { PageHeader } from '../../components/ui/PageHeader'
import { Button } from '../../components/ui/Button'
import { Badge, EmptyState, LoadingState, Message, Modal } from '../../components/ui'
import { Icone } from '../../components/ui/Icone'

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
  const [creationOuverte, setCreationOuverte] = useState(false)

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
      setCreationOuverte(false)
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

  const fermerReactivation = useCallback(() => {
    setReactivationEnCours(null)
    setLogementReactivation('')
    setMessageReactivation('')
  }, [])

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

  const fermerCreationCompte = useCallback(() => {
    setCompteEnCours(null)
    setEmail('')
    setPassword('')
    setMessageCompte('')
  }, [])

  return (
    <div className="page personnes-page">
      <PageHeader
        titre="Gestion des personnes & sous-comptes"
        sousTitre="Configuration des occupants, logements, compteurs et accès aux comptes personnels."
        actions={<div className="personnes-entete-actions">
          <div className="personnes-compteur" aria-label={`${personnes.filter((p) => p.statut_actif).length} personnes actives`}>
            <span>Personnes actives</span>
            <strong>{personnes.filter((p) => p.statut_actif).length}</strong>
          </div>
          <Button variante="primaire" taille="lg" className="personnes-ajouter" icone={<Icone nom="ajouter" />} onClick={() => setCreationOuverte(true)}>Ajouter une nouvelle personne</Button>
        </div>}
      />
      <details open className="notice-pedagogique notice-personnes">
        <summary>
          <span className="notice-personnes-icone"><Icone nom="info" /></span>
          <strong>Règle de rattachement au calcul de répartition</strong>
          <span className="badge badge-info notice-personnes-periode">Période active : {String(new Date().getMonth() + 1).padStart(2, '0')}/{new Date().getFullYear()}</span>
        </summary>
        <p>Toute nouvelle inscription requiert un index initial de référence. La période de départ ne génère pas de consommation Jiro pour cette personne ; la répartition démarre à partir des périodes suivantes.</p>
      </details>

      {/* Formulaire de création */}
      <Drawer ouvert={creationOuverte} titre="Nouvelle personne" sousTitre="Enregistrez les informations de départ et le logement." onFermer={() => setCreationOuverte(false)}>
        <form onSubmit={handleSubmit(onSubmit)} className="personnes-formulaire">
          <label>
            Nom *
            <input type="text" {...register('nom')} />
            {errors.nom && <span className="texte-erreur">{errors.nom.message}</span>}
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
                <span className="texte-erreur">{errors.periode_depart_annee.message}</span>
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
                <span className="texte-erreur">{errors.periode_depart_mois.message}</span>
              )}
            </label>
          </div>

          <label>
            Index initial (kWh) *
            <input
              type="text"
              inputMode="decimal"
              placeholder="Ex. 1234.567890"
              {...register('index_initial')}
            />
            {errors.index_initial && (
              <span className="texte-erreur">{errors.index_initial.message}</span>
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
              <span className="texte-tertiaire texte-petit">
                Tous les logements sont actuellement occupés par une personne active.
              </span>
            )}
          </label>

          <div>
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Enregistrement…' : 'Créer la personne'}
            </button>
          </div>

          {messageSucces && <Message variante="succes">{messageSucces}</Message>}
          {messageErreur && <Message variante="erreur">{messageErreur}</Message>}
        </form>
      </Drawer>

      {/* Liste */}
      <section className="carte carte-sans-padding personnes-liste">
        <div className="carte-entete personnes-liste-entete">
          <div className="carte-titre">Personnes existantes ({personnes.length})</div>
        </div>

        {erreurEmails && <Message variante="avertissement" titre="État des comptes indisponible">Impossible de charger l’état des comptes : {erreurEmails}. Le bouton « Créer un compte » est désactivé pour éviter les doublons.</Message>}

        {loading && <LoadingState texte="Chargement des personnes…" />}
        {erreur && <Message variante="erreur">Erreur : {erreur}</Message>}
        {!loading && !erreur && personnes.length === 0 && <EmptyState titre="Aucune personne enregistrée" texte="Ajoutez une personne pour commencer la gestion des sous-comptes." />}

        {personnes.length > 0 && (
          <div className="tableau-conteneur"><table className="tableau">
            <thead>
              <tr>
                <th scope="col">Nom</th>
                <th scope="col">Logement</th>
                <th scope="col">Période de départ</th>
                <th scope="col" className="col-droite">Dernier index</th>
                <th scope="col">Statut</th>
                <th scope="col">Compte</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {personnes.map((p) => (
                <tr key={p.id}>
                  <td className="texte-demi-gras">{p.nom}</td>
                  <td>{p.logement_nom ?? '—'}</td>
                  <td>
                    {String(p.periode_depart_mois).padStart(2, '0')}/{p.periode_depart_annee}
                  </td>
                  <td className="col-droite">
                    {p.dernier_index !== null ? `${p.dernier_index} kWh` : '—'}
                  </td>
                  <td>
                    {p.statut_actif ? (
                      <Badge variante="succes">Actif</Badge>
                    ) : (
                      <Badge variante="neutre">Inactif</Badge>
                    )}
                  </td>
                  <td>
                    {erreurEmails ? (
                      <Badge variante="avertissement">État inconnu</Badge>
                    ) : p.compte_email ? (
                      <span className="texte-succes">✓ {p.compte_email}</span>
                    ) : (
                      <span className="texte-tertiaire">Aucun</span>
                    )}
                  </td>
                  <td className="personnes-actions">
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
          </table></div>
        )}

      </section>
      {compteEnCours && (
        <Modal
          ouvert
          titre="Créer un compte"
          sousTitre={`Pour ${personnes.find((p) => p.id === compteEnCours)?.nom ?? 'cette personne'}`}
          onFermer={fermerCreationCompte}
        >
          <form
            className="personnes-compte-formulaire"
            onSubmit={(e) => {
              e.preventDefault()
              void creerCompte(compteEnCours)
            }}
          >
            <label className="champ">
              <span className="champ-label">Adresse e-mail</span>
              <input className="champ-saisie" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="champ">
              <span className="champ-label">Mot de passe (8 caractères minimum)</span>
              <input className="champ-saisie" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
            {messageCompte && <Message variante="erreur">{messageCompte}</Message>}
            <div className="personnes-compte-actions">
              <Button type="button" onClick={fermerCreationCompte}>Annuler</Button>
              <Button type="submit" variante="primaire">Créer le compte</Button>
            </div>
          </form>
        </Modal>
      )}
      {reactivationEnCours && (
        <Modal
          ouvert
          titre={`Réactiver ${personnes.find((p) => p.id === reactivationEnCours)?.nom ?? 'cette personne'}`}
          sousTitre="Choisissez un logement disponible pour rétablir le rattachement."
          onFermer={fermerReactivation}
        >
          <form
            className="personnes-compte-formulaire"
            onSubmit={(e) => {
              e.preventDefault()
              void reactiverAvecLogement(reactivationEnCours)
            }}
          >
            <p className="personnes-reactivation-aide">Seuls les logements libres sont proposés. Le rattachement précédent reste dans l’historique.</p>
            <label className="champ">
              <span className="champ-label">Logement</span>
              <select className="champ-select" value={logementReactivation} onChange={(e) => setLogementReactivation(e.target.value)}>
                <option value="">— Sélectionner —</option>
                {logementsDispo.map((l) => <option key={l.id} value={l.id}>{l.nom_code}</option>)}
              </select>
            </label>
            {logementsDispo.length === 0 && <p className="personnes-reactivation-indisponible" role="status">Aucun logement disponible. Libérez un logement d’abord.</p>}
            {messageReactivation && <Message variante="erreur">{messageReactivation}</Message>}
            <div className="personnes-compte-actions">
              <Button type="button" onClick={fermerReactivation}>Annuler</Button>
              <Button type="submit" variante="primaire" disabled={logementsDispo.length === 0}>Réactiver</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
