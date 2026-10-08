import { useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useSaisiePeriode } from './useSaisiePeriode'
import { calculerRepartition } from './calcul'
import type { LigneSaisie } from './calcul'

function arrondi(n: number, dec = 3): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  }).format(n)
}

export function SaisiePeriodePage() {
  const maintenant = new Date()
  const [annee, setAnnee] = useState(maintenant.getFullYear())
  const [mois, setMois] = useState(maintenant.getMonth() + 1)
  const [montantJiro, setMontantJiro] = useState<number>(0)
  const [montantRano, setMontantRano] = useState<number>(0)
  const [messageSucces, setMessageSucces] = useState('')
  const [messageErreur, setMessageErreur] = useState('')
  const [enregistrementEnCours, setEnregistrementEnCours] = useState(false)

  const { lignes, periodeExistante, loading, erreur, setLignes, recharger } =
    useSaisiePeriode(annee, mois)

  // Calcul en temps réel
  const resultat = useMemo(() => {
    if (lignes.length === 0) {
      return {
        lignes: [],
        coutUnitaireJiro: 0,
        coutUnitaireRano: 0,
        totalConsoJiro: 0,
        totalRano: 0,
        totalPartJiro: 0,
        totalPartRano: 0,
        erreurs: [],
        avertissements: [],
      }
    }
    return calculerRepartition(montantJiro, montantRano, lignes)
  }, [lignes, montantJiro, montantRano])

  function modifierLigne(personne_id: string, champ: keyof LigneSaisie, valeur: number) {
    setLignes(
      lignes.map((l) =>
        l.personne_id === personne_id ? { ...l, [champ]: valeur } : l
      )
    )
  }

  async function enregistrer() {
    setMessageSucces('')
    setMessageErreur('')

    if (resultat.erreurs.length > 0) {
      setMessageErreur('Corrigez les erreurs avant d’enregistrer.')
      return
    }

    setEnregistrementEnCours(true)
    try {
      const payload = lignes.map((l) => ({
        personne_id: l.personne_id,
        index_total: l.nouveau_index,
        quantite_rano: Math.round(l.quantite_rano),
      }))

      const { error } = await supabase.rpc('enregistrer_periode', {
        p_annee: annee,
        p_mois: mois,
        p_montant_jiro: montantJiro,
        p_montant_rano: montantRano,
        p_releves: payload,
      })

      if (error) throw new Error(error.message)

      setMessageSucces(`Période ${String(mois).padStart(2, '0')}/${annee} enregistrée.`)
      setMontantJiro(0)
      setMontantRano(0)
      await recharger()
    } catch (e: unknown) {
      setMessageErreur(e instanceof Error ? e.message : 'Erreur inconnue.')
    } finally {
      setEnregistrementEnCours(false)
    }
  }

  // Verrouille la saisie quand la période est déjà enregistrée
  const bloque = periodeExistante || loading

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <header>
        <h2 style={{ margin: 0 }}>Saisie &amp; Répartition d’une période</h2>
        <p style={{ color: '#666', marginTop: 4 }}>
          Sélectionnez un mois, saisissez les montants des factures, puis les index et quantités Rano.
        </p>
      </header>

      {/* Sélection période */}
      <section style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
        <h3 style={{ marginTop: 0 }}>Période</h3>
        <div style={{ display: 'flex', gap: 16 }}>
          <label>
            Mois
            <select value={mois} onChange={(e) => setMois(Number(e.target.value))}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {String(m).padStart(2, '0')}
                </option>
              ))}
            </select>
          </label>
          <label>
            Année
            <input
                type="number"
                value={annee}
                onChange={(e) => setAnnee(Number(e.target.value))}
            />
          </label>
        </div>

        {periodeExistante && (
        <div
            style={{
            background: '#fef3c7',
            border: '1px solid #f59e0b',
            borderRadius: 6,
            padding: 12,
            color: '#92400e',
            fontSize: 14,
            }}
        >
            <strong>Période déjà enregistrée.</strong> Une période existe déjà pour{' '}
            {String(mois).padStart(2, '0')}/{annee}. Changez le mois ou l’année ci-dessus
            pour créer une nouvelle période, ou consultez la page{' '}
            <a href="/admin/historique">Historique</a> pour la voir en détail.
        </div>
        )}
      </section>

      {/* Montants */}
      <section style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
        <h3 style={{ marginTop: 0 }}>Factures globales</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <label>
            Montant facture Jiro (Ar) *
            <input
              type="number"
              step="0.001"
              value={montantJiro || ''}
              onChange={(e) => setMontantJiro(Number(e.target.value))}
              disabled={bloque}
            />
          </label>
          <label>
            Montant facture Rano (Ar) *
            <input
              type="number"
              step="0.001"
              value={montantRano || ''}
              onChange={(e) => setMontantRano(Number(e.target.value))}
              disabled={bloque}
            />
          </label>
        </div>
      </section>

      {/* Tableau de saisie */}
      <section style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
        <h3 style={{ marginTop: 0 }}>
          Personnes concernées ({lignes.length})
        </h3>

        {loading && <p>Chargement…</p>}
        {erreur && <p style={{ color: 'crimson' }}>Erreur : {erreur}</p>}
        {!loading && lignes.length === 0 && !periodeExistante && (
          <p style={{ color: '#666' }}>Aucune personne active à cette période.</p>
        )}

        {lignes.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                <th style={{ padding: 8 }}>Personne</th>
                <th style={{ padding: 8 }}>Logement</th>
                <th style={{ padding: 8 }}>Index réf.</th>
                <th style={{ padding: 8 }}>Nouvel index</th>
                <th style={{ padding: 8 }}>Conso</th>
                <th style={{ padding: 8 }}>Qté Rano</th>
                <th style={{ padding: 8 }}>Part Jiro</th>
                <th style={{ padding: 8 }}>Part Rano</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((l, i) => {
                const calc = resultat.lignes[i]
                const conso = calc?.consommation ?? 0
                const indexInvalide = !l.consoForceeZero && l.nouveau_index < l.index_ref
                return (
                  <tr key={l.personne_id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: 8 }}>
                      {l.nom}
                      {l.consoForceeZero && (
                        <div style={{ fontSize: 11, color: '#888' }}>
                          Période de départ (conso = 0)
                        </div>
                      )}
                    </td>
                    <td style={{ padding: 8 }}>{l.logement}</td>
                    <td style={{ padding: 8 }}>{arrondi(l.index_ref)}</td>
                    <td style={{ padding: 8 }}>
                      <input
                        type="number"
                        step="0.001"
                        value={l.nouveau_index}
                        onChange={(e) =>
                          modifierLigne(l.personne_id, 'nouveau_index', Number(e.target.value))
                        }
                        disabled={bloque || l.consoForceeZero}
                        style={{
                          width: 110,
                          borderColor: indexInvalide ? 'crimson' : undefined,
                        }}
                      />
                    </td>
                    <td style={{ padding: 8, color: indexInvalide ? 'crimson' : undefined }}>
                      {arrondi(conso)}
                    </td>
                    <td style={{ padding: 8 }}>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        value={l.quantite_rano}
                        onChange={(e) =>
                          modifierLigne(
                            l.personne_id,
                            'quantite_rano',
                            Math.max(0, Math.floor(Number(e.target.value)))
                          )
                        }
                        disabled={bloque}
                        style={{ width: 80 }}
                      />
                    </td>
                    <td style={{ padding: 8 }}>
                      {calc ? arrondi(calc.part_jiro) : '—'}
                    </td>
                    <td style={{ padding: 8 }}>
                      {calc ? arrondi(calc.part_rano) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid #333', fontWeight: 600 }}>
                <td style={{ padding: 8 }} colSpan={4}>
                  Totaux
                </td>
                <td style={{ padding: 8 }}>{arrondi(resultat.totalConsoJiro)}</td>
                <td style={{ padding: 8 }}>{resultat.totalRano}</td>
                <td style={{ padding: 8 }}>{arrondi(resultat.totalPartJiro)}</td>
                <td style={{ padding: 8 }}>{arrondi(resultat.totalPartRano)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </section>

      {/* Résumé */}
      {resultat.lignes.length > 0 && (
        <section style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
          <h3 style={{ marginTop: 0 }}>Résumé de la répartition</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 6 }}>
            <li>
              <strong>Coût unitaire Jiro :</strong> {arrondi(resultat.coutUnitaireJiro)} Ar/kWh
            </li>
            <li>
              <strong>Coût unitaire Rano :</strong> {arrondi(resultat.coutUnitaireRano)} Ar/unité
            </li>
            <li>
              <strong>Équilibre Jiro :</strong>{' '}
              {arrondi(resultat.totalPartJiro) === arrondi(montantJiro) ? (
                <span style={{ color: 'green' }}>équilibré</span>
              ) : (
                <span style={{ color: 'crimson' }}>écart détecté</span>
              )}{' '}
              (facture : {arrondi(montantJiro)} Ar)
            </li>
            <li>
              <strong>Équilibre Rano :</strong>{' '}
              {arrondi(resultat.totalPartRano) === arrondi(montantRano) ? (
                <span style={{ color: 'green' }}>équilibré</span>
              ) : (
                <span style={{ color: 'crimson' }}>écart détecté</span>
              )}{' '}
              (facture : {arrondi(montantRano)} Ar)
            </li>
          </ul>
        </section>
      )}

      {/* Messages */}
      {resultat.erreurs.length > 0 && (
        <section style={{ border: '1px solid crimson', borderRadius: 8, padding: 16, background: '#fff5f5' }}>
          <h4 style={{ marginTop: 0, color: 'crimson' }}>Erreurs bloquantes</h4>
          <ul>
            {resultat.erreurs.map((e, i) => (
              <li key={i} style={{ color: 'crimson' }}>{e}</li>
            ))}
          </ul>
        </section>
      )}

      {resultat.avertissements.length > 0 && (
        <section style={{ border: '1px solid #f59e0b', borderRadius: 8, padding: 16, background: '#fffbeb' }}>
          <h4 style={{ marginTop: 0, color: '#92400e' }}>Avertissements</h4>
          <ul>
            {resultat.avertissements.map((a, i) => (
              <li key={i} style={{ color: '#92400e' }}>{a}</li>
            ))}
          </ul>
        </section>
      )}

      {messageSucces && <p style={{ color: 'green' }}>{messageSucces}</p>}
      {messageErreur && <p style={{ color: 'crimson' }}>{messageErreur}</p>}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12 }}>
        <button
          type="button"
          onClick={enregistrer}
          disabled={bloque || enregistrementEnCours || resultat.erreurs.length > 0 || lignes.length === 0}
        >
          {enregistrementEnCours ? 'Enregistrement…' : `Enregistrer la période ${String(mois).padStart(2, '0')}/${annee}`}
        </button>
        <button type="button" onClick={recharger} disabled={bloque}>
          Recharger
        </button>
      </div>
    </div>
  )
}