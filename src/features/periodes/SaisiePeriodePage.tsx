import { useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useSaisiePeriode } from './useSaisiePeriode'
import { calculerRepartition } from './calcul'
import { TOLERANCE_EQUILIBRE } from '../../lib/constantes';

function arrondi(n: number, maxDec = 6): string {
  return new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: maxDec,
    minimumFractionDigits: 0,
  }).format(n)
}

const REGEX_DECIMAL = /^\d*\.?\d*$/

export function SaisiePeriodePage() {
  const maintenant = new Date()
  const [annee, setAnnee] = useState(maintenant.getFullYear())
  const [mois, setMois] = useState(maintenant.getMonth() + 1)

  // Les montants sont stockés en string pour préserver la saisie au clavier
  const [montantJiroStr, setMontantJiroStr] = useState('')
  const [montantRanoStr, setMontantRanoStr] = useState('')

  const [messageSucces, setMessageSucces] = useState('')
  const [messageErreur, setMessageErreur] = useState('')
  const [enregistrementEnCours, setEnregistrementEnCours] = useState(false)

  const { lignes, periodeExistante, loading, erreur, setLignes, recharger } =
    useSaisiePeriode(annee, mois)

  // Conversion pour calcul
  const montantJiroNum = parseFloat(montantJiroStr) || 0
  const montantRanoNum = parseFloat(montantRanoStr) || 0

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
    return calculerRepartition(montantJiroNum, montantRanoNum, lignes)
  }, [lignes, montantJiroNum, montantRanoNum])

  // Changement d'un index (string)
  function changerIndex(personne_id: string, valeur: string) {
    if (!REGEX_DECIMAL.test(valeur)) return
    setLignes(
      lignes.map((l) =>
        l.personne_id === personne_id ? { ...l, nouveau_index: valeur } : l
      )
    )
  }

  // Changement de la quantité Rano (entier)
  function changerRano(personne_id: string, valeur: string) {
    if (valeur !== '' && !/^\d+$/.test(valeur)) return
    const n = valeur === '' ? 0 : parseInt(valeur, 10)
    setLignes(
      lignes.map((l) =>
        l.personne_id === personne_id ? { ...l, quantite_rano: n } : l
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

    if (montantJiroNum <= 0 || montantRanoNum <= 0) {
      setMessageErreur('Les montants Jiro et Rano doivent être strictement positifs.')
      return
    }

    setEnregistrementEnCours(true)
    try {
      const payload = lignes.map((l) => {
        const indexNum = parseFloat(l.nouveau_index)
        return {
          personne_id: l.personne_id,
          index_total: Number.isFinite(indexNum) ? indexNum : 0,
          quantite_rano: Math.round(l.quantite_rano),
        }
      })

      const { error } = await supabase.rpc('enregistrer_periode', {
        p_annee: annee,
        p_mois: mois,
        p_montant_jiro: montantJiroNum,
        p_montant_rano: montantRanoNum,
        p_releves: payload,
      })

      if (error) throw new Error(error.message)

      setMessageSucces(
        `Période ${String(mois).padStart(2, '0')}/${annee} enregistrée.`
      )
      setMontantJiroStr('')
      setMontantRanoStr('')
      await recharger()
    } catch (e: unknown) {
      setMessageErreur(e instanceof Error ? e.message : 'Erreur inconnue.')
    } finally {
      setEnregistrementEnCours(false)
    }
  }

  const bloque = periodeExistante || loading

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <header>
        <h2 style={{ margin: 0 }}>Saisie &amp; Répartition d’une période</h2>
        <p style={{ color: '#666', marginTop: 4 }}>
          Sélectionnez un mois, saisissez les montants, puis les index et quantités Rano.
        </p>
      </header>

      {/* Période */}
      <section style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
        <h3 style={{ marginTop: 0 }}>Période</h3>
        <div style={{ display: 'flex', gap: 16 }}>
          <label>
            Mois
            <select
              value={mois}
              onChange={(e) => setMois(Number(e.target.value))}
            >
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
          <p style={{ color: 'crimson' }}>
            Une période existe déjà pour {String(mois).padStart(2, '0')}/{annee}.
            Choisissez un autre mois ou consultez l’historique.
          </p>
        )}
      </section>

      {/* Montants */}
      <section style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
        <h3 style={{ marginTop: 0 }}>Factures globales</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <label>
            Montant facture Jiro (Ar) *
            <input
              type="text"
              inputMode="decimal"
              placeholder="Ex. 1234.567890"
              value={montantJiroStr}
              onChange={(e) => {
                const v = e.target.value
                if (v === '' || REGEX_DECIMAL.test(v)) {
                  setMontantJiroStr(v)
                }
              }}
              disabled={bloque}
            />
          </label>
          <label>
            Montant facture Rano (Ar) *
            <input
              type="text"
              inputMode="decimal"
              placeholder="Ex. 1234.567890"
              value={montantRanoStr}
              onChange={(e) => {
                const v = e.target.value
                if (v === '' || REGEX_DECIMAL.test(v)) {
                  setMontantRanoStr(v)
                }
              }}
              disabled={bloque}
            />
          </label>
        </div>
      </section>

      {/* Tableau de saisie */}
      <section style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
        <h3 style={{ marginTop: 0 }}>Personnes concernées ({lignes.length})</h3>

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

                const indexNum = parseFloat(l.nouveau_index)
                const indexInvalide =
                  !l.consoForceeZero &&
                  Number.isFinite(indexNum) &&
                  indexNum < l.index_ref

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
                        type="text"
                        inputMode="decimal"
                        value={l.nouveau_index}
                        onChange={(e) => changerIndex(l.personne_id, e.target.value)}
                        disabled={bloque || l.consoForceeZero}
                        style={{
                          width: 130,
                          borderColor: indexInvalide ? 'crimson' : undefined,
                        }}
                      />
                    </td>
                    <td
                      style={{
                        padding: 8,
                        color: indexInvalide ? 'crimson' : undefined,
                      }}
                    >
                      {arrondi(conso)}
                    </td>
                    <td style={{ padding: 8 }}>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={l.quantite_rano === 0 ? '' : String(l.quantite_rano)}
                        onChange={(e) => changerRano(l.personne_id, e.target.value)}
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
                <td style={{ padding: 8 }} colSpan={4}>Totaux</td>
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
              {Math.abs(resultat.totalPartJiro - montantJiroNum) < TOLERANCE_EQUILIBRE ? (
                <span style={{ color: 'green' }}>équilibré</span>
              ) : (
                <span style={{ color: 'crimson' }}>écart détecté</span>
              )}{' '}
              (facture : {arrondi(montantJiroNum)} Ar)
            </li>
            <li>
              <strong>Équilibre Rano :</strong>{' '}
              {Math.abs(resultat.totalPartRano - montantRanoNum) < TOLERANCE_EQUILIBRE ? (
                <span style={{ color: 'green' }}>équilibré</span>
              ) : (
                <span style={{ color: 'crimson' }}>écart détecté</span>
              )}{' '}
              (facture : {arrondi(montantRanoNum)} Ar)
            </li>
          </ul>
        </section>
      )}

      {/* Erreurs */}
      {resultat.erreurs.length > 0 && (
        <section
          style={{
            border: '1px solid crimson',
            borderRadius: 8,
            padding: 16,
            background: '#fff5f5',
          }}
        >
          <h4 style={{ marginTop: 0, color: 'crimson' }}>Erreurs bloquantes</h4>
          <ul>
            {resultat.erreurs.map((e, i) => (
              <li key={i} style={{ color: 'crimson' }}>{e}</li>
            ))}
          </ul>
        </section>
      )}

      {/* Avertissements */}
      {resultat.avertissements.length > 0 && (
        <section
          style={{
            border: '1px solid #f59e0b',
            borderRadius: 8,
            padding: 16,
            background: '#fffbeb',
          }}
        >
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
          disabled={
            bloque ||
            enregistrementEnCours ||
            resultat.erreurs.length > 0 ||
            lignes.length === 0 ||
            montantJiroNum <= 0 ||
            montantRanoNum <= 0
          }
        >
          {enregistrementEnCours
            ? 'Enregistrement…'
            : `Enregistrer la période ${String(mois).padStart(2, '0')}/${annee}`}
        </button>
        <button type="button" onClick={recharger} disabled={bloque}>
          Recharger
        </button>
      </div>
    </div>
  )
}