import { useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useSaisiePeriode } from './useSaisiePeriode'
import { calculerRepartition } from './calcul'
import { TOLERANCE_EQUILIBRE } from '../../lib/constantes';
import { PageHeader } from '../../components/ui/PageHeader'
import { Icone } from '../../components/ui/Icone'

function arrondi(n: number, maxDec = 6): string {
  return new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: maxDec,
    minimumFractionDigits: maxDec,
  }).format(n)
}

const REGEX_DECIMAL = /^\d*\.?\d*$/
const MOIS_NOMS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

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
  const equilibreJiro = Math.abs(resultat.totalPartJiro - montantJiroNum) < TOLERANCE_EQUILIBRE
  const equilibreRano = Math.abs(resultat.totalPartRano - montantRanoNum) < TOLERANCE_EQUILIBRE
  const saisieIncomplete = loading || Boolean(erreur) ||
    (!periodeExistante && (
      lignes.length === 0 ||
      !Number.isFinite(parseFloat(montantJiroStr)) ||
      !Number.isFinite(parseFloat(montantRanoStr)) ||
      lignes.some((l) => !l.consoForceeZero && !Number.isFinite(parseFloat(l.nouveau_index)))
    ))
  const etatControleActif: 1 | 2 | 3 | 4 | null = periodeExistante
    ? null
    : saisieIncomplete
      ? 1
      : resultat.erreurs.length > 0 || !equilibreJiro || !equilibreRano
        ? 3
        : resultat.avertissements.length > 0
          ? 2
          : 4
  const detailEtatIncomplet = erreur
    ? 'Les données de saisie n’ont pas pu être chargées.'
    : lignes.length === 0 && !loading && !periodeExistante
      ? 'Aucune personne active n’est disponible pour cette période.'
      : 'Renseignez les deux factures et les index requis avant l’enregistrement.'

  return (
    <div className="page saisie-page">
      <PageHeader
        surtitre="MODULE C · CRÉATION ET SAISIE D’UNE PÉRIODE"
        titre="Nouvelle période de répartition mensuelle"
        sousTitre="Ventilation des factures globales certifiées avec une précision de 6 décimales."
        actions={<div className="saisie-periode-controles">
          <label>Mois<select value={mois} onChange={(e) => setMois(Number(e.target.value))}>
            {MOIS_NOMS.map((nom, i) => <option key={nom} value={i + 1}>{nom}</option>)}
          </select></label>
          <label>Année<input type="number" value={annee} onChange={(e) => setAnnee(Number(e.target.value))} /></label>
          <div className="saisie-identifiant"><span>Identifiant période</span><strong>{annee}-{String(mois).padStart(2, '0')}</strong></div>
        </div>}
      />

      {periodeExistante && <div className="message message-erreur" role="alert"><span className="message-icone"><Icone nom="erreur" /></span><div><div className="message-titre">Période déjà enregistrée</div>Une période existe déjà pour {String(mois).padStart(2, '0')}/{annee}. Choisissez un autre mois ou consultez l’historique.</div></div>}

      {/* Montants */}
      <section className="grille-2 saisie-montants">
        <div className="carte saisie-facture saisie-facture-jiro">
          <div className="saisie-facture-entete"><h3>Facture globale Électricité (Jiro)</h3><span className="badge badge-jiro">Strictement &gt; 0 Ar</span></div>
          <p className="texte-secondaire">Montant brut certifié de la facture à répartir selon les consommations individuelles.</p>
          <label className="saisie-facture-label">
            Montant facture Jiro (Ar) *
            <span className="saisie-montant-groupe">
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
              <span aria-hidden="true">Ar</span>
            </span>
          </label>
          <div className="saisie-facture-pied"><span>Format attendu : chiffre décimal</span><strong>Précision : 6 décimales</strong></div>
        </div>
        <div className="carte saisie-facture saisie-facture-rano">
          <div className="saisie-facture-entete"><h3>Facture globale Eau (Rano)</h3><span className="badge badge-rano">Strictement &gt; 0 Ar</span></div>
          <p className="texte-secondaire">Montant brut certifié de la facture à répartir au prorata des quantités Rano.</p>
          <label className="saisie-facture-label">
            Montant facture Rano (Ar) *
            <span className="saisie-montant-groupe">
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
              <span aria-hidden="true">Ar</span>
            </span>
          </label>
          <div className="saisie-facture-pied"><span>Format attendu : chiffre décimal</span><strong>Précision : 6 décimales</strong></div>
        </div>
      </section>

      {/* Tableau de saisie */}
      <section className="carte carte-sans-padding">
        <div className="carte-entete saisie-tableau-entete">
          <div>
            <div className="carte-titre">Personnes concernées ({lignes.length})</div>
            <div className="carte-sous-titre">Les index et quantités saisis recalculent les parts automatiquement.</div>
          </div>
        </div>

        {loading && <p>Chargement…</p>}
        {erreur && <p style={{ color: 'crimson' }}>Erreur : {erreur}</p>}
        {!loading && lignes.length === 0 && !periodeExistante && (
          <p style={{ color: '#666' }}>Aucune personne active à cette période.</p>
        )}

        {lignes.length > 0 && (
          <>
          <p className="saisie-tableau-aide">Sur petit écran, faites défiler le tableau horizontalement pour consulter toutes les colonnes.</p>
          <div className="tableau-conteneur saisie-tableau-conteneur"><table className="tableau saisie-tableau-tableau" aria-label="Saisie des consommations et répartition individuelle">
            <thead>
              <tr>
                <th scope="col">Personnes</th>
                <th scope="col">Logement</th>
                <th scope="col" className="saisie-col-numerique">Index réf. (kWh)</th>
                <th scope="col" className="saisie-col-saisie">Nouvel index (kWh)</th>
                <th scope="col" className="saisie-col-calcule">Consommation (kWh)</th>
                <th scope="col" className="saisie-col-saisie">Qté Rano</th>
                <th scope="col" className="saisie-col-calcule saisie-col-jiro">Part Jiro (Ar)</th>
                <th scope="col" className="saisie-col-calcule saisie-col-rano">Part Rano (Ar)</th>
                <th scope="col" className="saisie-col-total">Total individuel (Ar)</th>
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
                  <tr key={l.personne_id}>
                    <td className="saisie-cellule-personne">
                      {l.nom}
                      {l.consoForceeZero && (
                        <div className="saisie-note-cellule">
                          Période de départ (conso = 0)
                        </div>
                      )}
                    </td>
                    <td>{l.logement}</td>
                    <td className="saisie-cellule-calcule saisie-cellule-numerique">{arrondi(l.index_ref)}</td>
                    <td className="saisie-cellule-saisie">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={l.nouveau_index}
                        onChange={(e) => changerIndex(l.personne_id, e.target.value)}
                        disabled={bloque || l.consoForceeZero}
                        aria-label={`Nouvel index pour ${l.nom}`}
                        aria-invalid={indexInvalide}
                        className={indexInvalide ? 'saisie-index-invalide' : undefined}
                      />
                    </td>
                    <td className={`saisie-cellule-calcule saisie-cellule-numerique${indexInvalide ? ' saisie-valeur-invalide' : ''}`}>
                      {arrondi(conso)}
                    </td>
                    <td className="saisie-cellule-saisie">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={l.quantite_rano === 0 ? '' : String(l.quantite_rano)}
                        onChange={(e) => changerRano(l.personne_id, e.target.value)}
                        disabled={bloque}
                        aria-label={`Quantité Rano pour ${l.nom}`}
                      />
                    </td>
                    <td className="saisie-cellule-calcule saisie-cellule-numerique saisie-cellule-jiro">
                      {arrondi(calc?.part_jiro ?? 0)}
                    </td>
                    <td className="saisie-cellule-calcule saisie-cellule-numerique saisie-cellule-rano">
                      {arrondi(calc?.part_rano ?? 0)}
                    </td>
                    <td className="saisie-cellule-total saisie-cellule-numerique">
                      {arrondi((calc?.part_jiro ?? 0) + (calc?.part_rano ?? 0))} Ar
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4}>Totaux répartis</td>
                <td className="saisie-cellule-numerique">{arrondi(resultat.totalConsoJiro)}</td>
                <td>{resultat.totalRano}</td>
                <td className="saisie-cellule-numerique saisie-cellule-jiro">{arrondi(resultat.totalPartJiro)}</td>
                <td className="saisie-cellule-numerique saisie-cellule-rano">{arrondi(resultat.totalPartRano)}</td>
                <td className="saisie-cellule-numerique">{arrondi(resultat.totalPartJiro + resultat.totalPartRano)} Ar</td>
              </tr>
            </tfoot>
          </table></div>
          </>
        )}
      </section>

      <section className="saisie-controles-grille" aria-label="Contrôles de la répartition">
      {/* Contrôle arithmétique déterministe */}
        <section className="carte saisie-controle-arithmetique" aria-labelledby="saisie-controle-titre">
          <header className="saisie-controle-entete">
            <h3 id="saisie-controle-titre">Contrôle Arithmétique Déterministe</h3>
            <span className="badge badge-info">Précision : 6 décimales</span>
          </header>
          {resultat.lignes.length > 0 ? <>
          <div className="saisie-controle-services">
            <article className="saisie-controle-service saisie-controle-jiro">
              <h4>Équilibre Jiro</h4>
              <dl>
                <div><dt>Facture saisie</dt><dd>{arrondi(montantJiroNum)} Ar</dd></div>
                <div><dt>Total des parts calculées</dt><dd>{arrondi(resultat.totalPartJiro)} Ar</dd></div>
                <div className="saisie-controle-ecart"><dt>Écart arithmétique</dt><dd>{arrondi(Math.abs(resultat.totalPartJiro - montantJiroNum))} Ar</dd></div>
              </dl>
              <span className={`badge ${equilibreJiro ? 'badge-succes' : 'badge-erreur'}`} role="status">
                {equilibreJiro ? 'Équilibré' : 'Écart détecté'}
              </span>
            </article>
            <article className="saisie-controle-service saisie-controle-rano">
              <h4>Équilibre Rano</h4>
              <dl>
                <div><dt>Facture saisie</dt><dd>{arrondi(montantRanoNum)} Ar</dd></div>
                <div><dt>Total des parts calculées</dt><dd>{arrondi(resultat.totalPartRano)} Ar</dd></div>
                <div className="saisie-controle-ecart"><dt>Écart arithmétique</dt><dd>{arrondi(Math.abs(resultat.totalPartRano - montantRanoNum))} Ar</dd></div>
              </dl>
              <span className={`badge ${equilibreRano ? 'badge-succes' : 'badge-erreur'}`} role="status">
                {equilibreRano ? 'Équilibré' : 'Écart détecté'}
              </span>
            </article>
          </div>
          <div className="saisie-controle-total">
            <strong>Total mensuel consolidé à ventiler</strong>
            <strong>{arrondi(montantJiroNum + montantRanoNum)} Ar</strong>
          </div>
          <p className="saisie-controle-note">
            <strong>Note sur l’arrondi déterministe :</strong> les parts sont réparties au millionième d’Ariary selon la méthode du plus grand reste. Le montant total de chaque facture est réparti sans unité monétaire perdue ni créée.
          </p>
          </> : <p className="saisie-controle-attente">Complétez les données requises pour afficher les comparaisons et les écarts arithmétiques.</p>}
        </section>

      <section className="carte saisie-matrice-controles" aria-labelledby="saisie-matrice-titre">
        <header className="saisie-matrice-entete">
          <h3 id="saisie-matrice-titre">Matrice des 4 États de Contrôle</h3>
          <p>Les contrôles sont mis à jour à mesure de la saisie.</p>
        </header>
        <div className="saisie-matrice-etats">
          <article className={`saisie-etat-controle saisie-etat-incomplet${etatControleActif === 1 ? ' est-actif' : ''}`} aria-current={etatControleActif === 1 ? 'step' : undefined}>
            <Icone nom="info" />
            <div><h4>État 1 : Saisie incomplète</h4><p>{detailEtatIncomplet}</p></div>
            {etatControleActif === 1 && <span className="saisie-etat-courant">État actuel</span>}
          </article>
          <article className={`saisie-etat-controle saisie-etat-zero${etatControleActif === 2 ? ' est-actif' : ''}`} aria-current={etatControleActif === 2 ? 'step' : undefined}>
            <Icone nom="avertissement" />
            <div><h4>État 2 : Valeur zéro acceptée</h4><p>Une consommation ou une quantité individuelle nulle donne une part de 0 Ar pour ce service. La répartition reste possible si les totaux du service sont positifs.</p></div>
            {etatControleActif === 2 && <span className="saisie-etat-courant">État actuel</span>}
          </article>
          <article className={`saisie-etat-controle saisie-etat-incorrect${etatControleActif === 3 ? ' est-actif' : ''}`} aria-current={etatControleActif === 3 ? 'step' : undefined}>
            <Icone nom="erreur" />
            <div><h4>État 3 : Répartition incorrecte / écart</h4><p>Une erreur de saisie ou un écart entre les parts et la facture bloque l’enregistrement.</p></div>
            {etatControleActif === 3 && <span className="saisie-etat-courant">État actuel</span>}
          </article>
          <article className={`saisie-etat-controle saisie-etat-reussi${etatControleActif === 4 ? ' est-actif' : ''}`} aria-current={etatControleActif === 4 ? 'step' : undefined}>
            <Icone nom="succes" />
            <div><h4>État 4 : Contrôles réussis</h4><p>Les factures sont équilibrées avec une précision de six décimales. La période est prête à être enregistrée.</p></div>
            {etatControleActif === 4 && <span className="saisie-etat-courant">État actuel</span>}
          </article>
        </div>
        {periodeExistante && <p className="saisie-matrice-verrouillee">Cette période existe déjà ; sa saisie est verrouillée.</p>}
      </section>
      </section>

      {/* Résumé */}
      {resultat.lignes.length > 0 && (
        <section className="carte saisie-resume" aria-labelledby="saisie-resume-titre">
          <header className="saisie-resume-entete">
            <div>
              <h3 id="saisie-resume-titre">Résumé de la répartition</h3>
              <p>Coûts unitaires et comparaison des parts calculées avec les factures.</p>
            </div>
          </header>
          <div className="saisie-resume-couts">
            <article className="saisie-resume-cout saisie-resume-cout-jiro">
              <span>Coût unitaire Jiro</span>
              <strong>{arrondi(resultat.coutUnitaireJiro)} <small>Ar/kWh</small></strong>
            </article>
            <article className="saisie-resume-cout saisie-resume-cout-rano">
              <span>Coût unitaire Rano</span>
              <strong>{arrondi(resultat.coutUnitaireRano)} <small>Ar/unité</small></strong>
            </article>
          </div>
          <div className="saisie-resume-equilibres">
            <article className="saisie-equilibre saisie-equilibre-jiro">
              <header>
                <h4>Équilibre Jiro</h4>
                <span className={`badge ${equilibreJiro ? 'badge-succes' : 'badge-erreur'}`} role="status">
                  {equilibreJiro ? 'Équilibré' : 'Écart détecté'}
                </span>
              </header>
              <dl>
                <div><dt>Facture saisie</dt><dd>{arrondi(montantJiroNum)} Ar</dd></div>
                <div><dt>Total des parts calculées</dt><dd>{arrondi(resultat.totalPartJiro)} Ar</dd></div>
                <div className="saisie-equilibre-ecart"><dt>Écart arithmétique</dt><dd>{arrondi(resultat.totalPartJiro - montantJiroNum)} Ar</dd></div>
              </dl>
            </article>
            <article className="saisie-equilibre saisie-equilibre-rano">
              <header>
                <h4>Équilibre Rano</h4>
                <span className={`badge ${equilibreRano ? 'badge-succes' : 'badge-erreur'}`} role="status">
                  {equilibreRano ? 'Équilibré' : 'Écart détecté'}
                </span>
              </header>
              <dl>
                <div><dt>Facture saisie</dt><dd>{arrondi(montantRanoNum)} Ar</dd></div>
                <div><dt>Total des parts calculées</dt><dd>{arrondi(resultat.totalPartRano)} Ar</dd></div>
                <div className="saisie-equilibre-ecart"><dt>Écart arithmétique</dt><dd>{arrondi(resultat.totalPartRano - montantRanoNum)} Ar</dd></div>
              </dl>
            </article>
          </div>
        </section>
      )}

      {/* Erreurs */}
      {resultat.erreurs.length > 0 && (
        <section className="message message-erreur saisie-message" role="alert" aria-live="assertive">
          <div>
            <h4>Erreurs bloquantes</h4>
            <ul>{resultat.erreurs.map((e, i) => <li key={i}>{e}</li>)}</ul>
          </div>
        </section>
      )}

      {/* Avertissements */}
      {resultat.avertissements.length > 0 && (
        <section className="message message-avertissement saisie-message" role="status" aria-live="polite">
          <div>
            <h4>Avertissements</h4>
            <ul>{resultat.avertissements.map((a, i) => <li key={i}>{a}</li>)}</ul>
          </div>
        </section>
      )}

      {messageSucces && <p className="message message-succes saisie-retour" role="status">{messageSucces}</p>}
      {messageErreur && <p className="message message-erreur saisie-retour" role="alert">{messageErreur}</p>}

      {/* Actions */}
      <div className="ligne-fin saisie-actions">
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
          className="btn btn-primaire btn-lg saisie-action-primaire"
          aria-busy={enregistrementEnCours}
        >
          {enregistrementEnCours
            ? 'Enregistrement…'
            : `Enregistrer la période ${String(mois).padStart(2, '0')}/${annee}`}
        </button>
        <button type="button" className="btn saisie-action-secondaire" onClick={recharger} disabled={bloque}>
          Similuler
        </button>
      </div>
    </div>
  )
}
