import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { logementSchema } from './schema'
import type { LogementFormValues } from './schema'
import { useLogements } from './useLogements'
import type { Logement } from './useLogements'

export function LogementsPage() {
  const { logements, loading, erreur, creerLogement, modifierLogement } =
    useLogements()

  // logement en cours d'édition (null = mode création)
  const [enEdition, setEnEdition] = useState<Logement | null>(null)
  const [messageSucces, setMessageSucces] = useState('')
  const [messageErreur, setMessageErreur] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LogementFormValues>({
    resolver: zodResolver(logementSchema),
    defaultValues: { nom_code: '', localisation: '' },
  })

  function commencerCreation() {
    setEnEdition(null)
    reset({ nom_code: '', localisation: '' })
    setMessageSucces('')
    setMessageErreur('')
  }

  function commencerEdition(l: Logement) {
    setEnEdition(l)
    reset({
      nom_code: l.nom_code,
      localisation: l.localisation ?? '',
    })
    setMessageSucces('')
    setMessageErreur('')
  }

  async function onSubmit(values: LogementFormValues) {
    setMessageSucces('')
    setMessageErreur('')
    try {
      if (enEdition) {
        await modifierLogement(enEdition.id, values)
        setMessageSucces(`Logement « ${values.nom_code} » modifié.`)
      } else {
        await creerLogement(values)
        setMessageSucces(`Logement « ${values.nom_code} » créé.`)
      }
      reset({ nom_code: '', localisation: '' })
      setEnEdition(null)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue.'
      setMessageErreur(msg)
    }
  }

  return (
    <div style={{ display: 'grid', gap: '2rem' }}>
      <header>
        <h2 style={{ margin: 0 }}>Gestion des logements</h2>
        <p style={{ color: '#555', marginTop: 4 }}>
          Chaque logement possède un nom ou code obligatoire et une localisation
          facultative. Les logements ne sont jamais supprimés.
        </p>
      </header>

      {/* Formulaire */}
      <section
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          padding: '1rem',
          background: '#fff',
        }}
      >
        <h3 style={{ marginTop: 0 }}>
          {enEdition ? `Modifier « ${enEdition.nom_code} »` : 'Nouveau logement'}
        </h3>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'grid', gap: '1rem' }}>
          <label>
            Nom ou code <span style={{ color: 'crimson' }}>*</span>
            <input
              type="text"
              {...register('nom_code')}
              placeholder="Ex. A1, Villa Rose…"
              autoComplete="off"
            />
            {errors.nom_code && (
              <span style={{ color: 'crimson', fontSize: 13 }}>
                {errors.nom_code.message}
              </span>
            )}
          </label>

          <label>
            Localisation (facultative)
            <input
              type="text"
              {...register('localisation')}
              placeholder="Ex. 1er étage, aile gauche…"
              autoComplete="off"
            />
            {errors.localisation && (
              <span style={{ color: 'crimson', fontSize: 13 }}>
                {errors.localisation.message}
              </span>
            )}
          </label>

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? 'Enregistrement…'
                : enEdition
                ? 'Enregistrer les modifications'
                : 'Créer le logement'}
            </button>
            {enEdition && (
              <button type="button" onClick={commencerCreation}>
                Annuler
              </button>
            )}
          </div>
        </form>

        {messageSucces && (
          <p style={{ color: '#2d6a4f', marginTop: 12 }}>{messageSucces}</p>
        )}
        {messageErreur && (
          <p style={{ color: 'crimson', marginTop: 12 }}>{messageErreur}</p>
        )}
      </section>

      {/* Liste */}
      <section>
        <h3>Logements existants ({logements.length})</h3>

        {loading && <p>Chargement…</p>}
        {erreur && <p style={{ color: 'crimson' }}>Erreur : {erreur}</p>}

        {!loading && !erreur && logements.length === 0 && (
          <p>Aucun logement enregistré pour l’instant.</p>
        )}

        {logements.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                <th style={{ padding: 8 }}>Nom / Code</th>
                <th style={{ padding: 8 }}>Localisation</th>
                <th style={{ padding: 8 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {logements.map((l) => (
                <tr key={l.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: 8 }}>{l.nom_code}</td>
                  <td style={{ padding: 8 }}>{l.localisation ?? '—'}</td>
                  <td style={{ padding: 8 }}>
                    <button type="button" onClick={() => commencerEdition(l)}>
                      Modifier
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