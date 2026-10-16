import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTableauBord } from './useTableauBord'
import { GraphiqueFactures } from './GraphiqueFactures'
import { useDetailPeriode } from '../periodes/useDetailPeriode'
import { Icone } from '../../components/ui/Icone'
import type { ReactNode } from 'react'
import {
  PageHeader,
  Card,
  CardEntete,
  CardStat,
  Badge,
  Button,
  EmptyState,
  LoadingState,
  Message,
  Table,
} from '../../components/ui'

const MOIS_LONGS = [
  '', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]
const MOIS_COURTS = ['', 'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']

const PERIODES_PAR_PAGE = 4

/* ---------- Helpers de formatage ---------- */

function fmt6(n: number): string {
  return fmtNombre(n) + ' Ar'
}

function fmtNombre(n: number): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 6,
    maximumFractionDigits: 6,
  }).format(n).replace(/\u202F/g, ' ')
}

function fmtKwh(n: number): string {
  return (
    fmtNombre(n) + ' kWh'
  )
}

function fmtUnites(n: number): string {
  return (
    fmtNombre(n) + ' u'
  )
}

/* ---------- Page ---------- */

export function TableauBordPage() {
  const { data, loading, erreur } = useTableauBord()
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [periodeIdSelectionnee, setPeriodeIdSelectionnee] = useState<string | null>(null)
  const periodeSelectionnee = data?.periodes.find((p) => p.id === periodeIdSelectionnee) ?? data?.periodes[0] ?? null
  const { detail: detailDerniere, loading: chargementDetail, erreur: erreurDetail } =
    useDetailPeriode(periodeSelectionnee?.id)

  if (loading) return <LoadingState />
  if (erreur) return <p className="texte-erreur">Erreur : {erreur}</p>
  if (!data) return <p className="texte-secondaire">Aucune donnée.</p>

  const d = periodeSelectionnee
  const anneesDisponibles = [...new Set(data.periodes.map((p) => p.annee))].sort((a, b) => b - a)
  const anneeSelectionnee = d?.annee ?? anneesDisponibles[0] ?? new Date().getFullYear()
  const periodesAnneeSelectionnee = data.periodes.filter((p) => p.annee === anneeSelectionnee)
  const pointsGraphique = d
    ? data.periodes
        .filter((p) => p.annee < d.annee || (p.annee === d.annee && p.mois <= d.mois))
        .slice(0, 6)
        .reverse()
        .map((p) => ({ label: `${MOIS_COURTS[p.mois]} ${p.annee}`, annee: p.annee, mois: p.mois, jiro: p.montant_jiro, rano: p.montant_rano }))
    : []
  const moyenneJiro = pointsGraphique.length ? pointsGraphique.reduce((s, p) => s + p.jiro, 0) / pointsGraphique.length : 0
  const moyenneRano = pointsGraphique.length ? pointsGraphique.reduce((s, p) => s + p.rano, 0) / pointsGraphique.length : 0

  // Pagination
  const totalPages = Math.max(1, Math.ceil(data.periodes.length / PERIODES_PAR_PAGE))
  const pageCourante = Math.min(page, totalPages)
  const debut = (pageCourante - 1) * PERIODES_PAR_PAGE
  const periodesPage = data.periodes.slice(debut, debut + PERIODES_PAR_PAGE)
  const dernierePeriodeCarte = d ? (
    <Card className="carte-sans-padding dashboard-dernier">
      <CardEntete
        titre={`Ventilation — ${MOIS_LONGS[d.mois]} ${d.annee}`}
        sousTitre={`Répartition pour ${d.nb_personnes} personne${d.nb_personnes > 1 ? 's' : ''}`}
        actions={<>
          {d.certifiee ? <Badge variante="succes">✓ Répartition vérifiée</Badge> : <Badge variante="erreur">Non certifiée</Badge>}
          <Link to={`/admin/periodes/${d.id}`} className="btn btn-sm">Voir le détail</Link>
        </>}
      />
      {chargementDetail && <LoadingState texte="Chargement de la ventilation…" />}
      {erreurDetail && <Message variante="erreur">Erreur : {erreurDetail}</Message>}
      {detailDerniere?.id === d.id && <Table
        libelle={`Ventilation individuelle — ${MOIS_LONGS[d.mois]} ${d.annee}`}
        lignes={detailDerniere.lignes}
        cleLigne={(l) => l.personne_id}
        colonnes={[
          { cle: 'personne', titre: 'Personne / logement', afficher: (l) => <div className="col-nom">{l.personne}<div className="col-secondaire">{l.logement}</div></div> },
          { cle: 'index_ref', titre: 'Index réf. (kWh)', alignement: 'droite', afficher: (l) => fmtNombre(l.index_total - l.consommation) },
          { cle: 'index_fin', titre: 'Index fin (kWh)', alignement: 'droite', afficher: (l) => fmtNombre(l.index_total) },
          { cle: 'consommation', titre: 'Conso calculée (kWh)', alignement: 'droite', classe: 'dashboard-col-jiro', afficher: (l) => fmtNombre(l.consommation) },
          { cle: 'part_jiro', titre: 'Part Jiro (Ar)', alignement: 'droite', classe: 'dashboard-col-jiro', afficher: (l) => fmtNombre(l.part_jiro) },
          { cle: 'quantite_rano', titre: 'Qté Rano (unités)', alignement: 'droite', classe: 'dashboard-col-rano', afficher: (l) => fmtUnites(l.quantite_rano) },
          { cle: 'part_rano', titre: 'Part Rano (Ar)', alignement: 'droite', classe: 'dashboard-col-rano', afficher: (l) => fmtNombre(l.part_rano) },
          { cle: 'total', titre: 'Total individuel (Ar)', alignement: 'droite', afficher: (l) => <strong>{fmtNombre(l.part_jiro + l.part_rano)}</strong> },
        ]}
        pied={<tr>
          <td colSpan={3}><strong>Total consolidé</strong></td>
          <td className="col-droite">{fmtKwh(detailDerniere.lignes.reduce((s, l) => s + l.consommation, 0))}</td>
          <td className="col-droite">{fmt6(detailDerniere.lignes.reduce((s, l) => s + l.part_jiro, 0))}</td>
          <td className="col-droite">{fmtUnites(detailDerniere.lignes.reduce((s, l) => s + l.quantite_rano, 0))}</td>
          <td className="col-droite">{fmt6(detailDerniere.lignes.reduce((s, l) => s + l.part_rano, 0))}</td>
          <td className="col-droite"><strong>{fmt6(d.montant_jiro + d.montant_rano)}</strong></td>
        </tr>}
      />}
    </Card>
  ) : null

  return (
    <div className="page">
      <PageHeader
        surtitre="GESTION DES CONSOMMATIONS"
        titre="Tableau de bord"
        sousTitre="Vue d'ensemble des factures, consommations et répartitions."
        actions={<div className="dashboard-periode-selecteurs" aria-label="Filtrer le tableau de bord par période">
          <label>Mois<select
            value={d ? String(d.mois) : ''}
            onChange={(e) => {
              const periode = periodesAnneeSelectionnee.find((p) => p.mois === Number(e.target.value))
              setPeriodeIdSelectionnee(periode?.id ?? null)
            }}
            disabled={periodesAnneeSelectionnee.length === 0}
          >
            {periodesAnneeSelectionnee.map((p) => <option key={p.id} value={p.mois}>{MOIS_LONGS[p.mois]}</option>)}
          </select></label>
          <label>Année<select
            value={String(anneeSelectionnee)}
            onChange={(e) => {
              const periode = data.periodes.find((p) => p.annee === Number(e.target.value))
              setPeriodeIdSelectionnee(periode?.id ?? null)
            }}
            disabled={anneesDisponibles.length === 0}
          >
            {anneesDisponibles.map((annee) => <option key={annee} value={annee}>{annee}</option>)}
            {anneesDisponibles.length === 0 && <option value={anneeSelectionnee}>{anneeSelectionnee}</option>}
          </select></label>
          {d && <div className="dashboard-periode-identifiant"><span>Période sélectionnée</span><strong>{d.annee}-{String(d.mois).padStart(2, '0')}</strong></div>}
        </div>}
      />

      {/* KPI en haut : 3 cartes */}
      <section className="grille-3 dashboard-indicateurs">
        <CardStat
          label="Facture Jiro (Électricité)"
          valeur={fmt6(d?.montant_jiro ?? 0)}
          detail={d ? `${MOIS_LONGS[d.mois]} ${d.annee}` : 'Aucune période enregistrée'}
          icone={<Icone nom="electricite" />}
          variante="jiro"
        />
        <CardStat
          label="Facture Rano (Eau)"
          valeur={fmt6(d?.montant_rano ?? 0)}
          detail={d ? `${MOIS_LONGS[d.mois]} ${d.annee}` : 'Aucune période enregistrée'}
          icone={<Icone nom="eau" />}
          variante="rano"
        />
        <CardStat
          label="Personnes actives"
          valeur={d?.nb_personnes ?? 0}
          detail={d ? `Personnes relevées en ${MOIS_LONGS[d.mois]} ${d.annee}` : 'Aucune période enregistrée'}
          icone={<Icone nom="personnes" />}
          variante="sombre"
        />
      </section>

      {/* Graphique + raccourcis */}
      <section className="grille-2-1">
        <Card>
          <CardEntete
            titre="Évolution mensuelle des factures"
            sousTitre={d ? `Comparatif des périodes jusqu’à ${MOIS_LONGS[d.mois]} ${d.annee}` : 'Comparatif des factures Jiro et Rano'}
          />
          <GraphiqueFactures
            points={pointsGraphique}
            onClicPeriode={(annee, mois) => {
              const p = data.periodes.find((x) => x.annee === annee && x.mois === mois)
              if (p) navigate(`/admin/periodes/${p.id}`)
            }}
          />
          <div className="dashboard-moyennes">
            <div><span>Moyenne Jiro ({pointsGraphique.length} périodes)</span><strong>{fmt6(moyenneJiro)}</strong></div>
            <div><span>Moyenne Rano ({pointsGraphique.length} périodes)</span><strong>{fmt6(moyenneRano)}</strong></div>
          </div>
        </Card>

        <Card>
          <CardEntete titre="Raccourcis rapides" />
          <div className="empilement-serre">
            <RaccourciLien
              to="/admin/periodes"
              icone={<Icone nom="saisie" />}
              titre="Nouvelle saisie de période"
              sousTitre="Enregistrer les factures et index"
            />
            <RaccourciLien
              to="/admin/personnes"
              icone={<Icone nom="personnes" />}
              titre="Gestion des personnes"
              sousTitre="Gérer les personnes et les comptes"
            />
            <RaccourciLien
              to="/admin/historique"
              icone={<Icone nom="export" />}
              titre="Historique & Export"
              sousTitre="Consulter et exporter les périodes"
            />
          </div>
        </Card>
      </section>

      {/* Liste des périodes */}
      <Card className="carte-sans-padding dashboard-periodes">
        <CardEntete
          titre="Périodes enregistrées récentes"
          sousTitre="Consommations globales et état des répartitions."
          actions={<Badge variante="info">{data.periodes.length} période{data.periodes.length > 1 ? 's' : ''} répertoriée{data.periodes.length > 1 ? 's' : ''}</Badge>}
        />
        {data.periodes.length === 0 ? (
          <EmptyState
            icone={<Icone nom="vide" />}
            titre="Aucune période"
            texte="Commencez par saisir une période de répartition."
            action={
              <Link to="/admin/periodes" className="btn btn-primaire">
                Nouvelle saisie
              </Link>
            }
          />
        ) : (
          <>
            <div className="tableau-conteneur">
              <table className="tableau">
                <thead>
                  <tr>
                    <th>Période</th>
                    <th className="col-droite">Facture Jiro</th>
                    <th className="col-droite">Conso. Jiro</th>
                    <th className="col-droite">Facture Rano</th>
                    <th className="col-droite">Qté Rano</th>
                    <th className="col-centre">Personnes</th>
                    <th className="col-centre">État</th>
                    <th className="col-droite">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {periodesPage.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div className="col-nom">
                          {MOIS_LONGS[p.mois]} {p.annee}
                        </div>
                        <div className="col-secondaire">
                          {p.annee}-{String(p.mois).padStart(2, '0')}
                        </div>
                      </td>
                      <td className="col-droite col-num">{fmt6(p.montant_jiro)}</td>
                      <td className="col-droite col-num">{fmtKwh(p.conso_jiro)}</td>
                      <td className="col-droite col-num">{fmt6(p.montant_rano)}</td>
                      <td className="col-droite col-num">{fmtUnites(p.quantite_rano)}</td>
                      <td className="col-centre">{p.nb_personnes}</td>
                      <td className="col-centre">
                        {p.certifiee ? (
                          <Badge variante="succes">✓ Vérifiée</Badge>
                        ) : (
                          <Badge variante="erreur">Non certifiée</Badge>
                        )}
                      </td>
                      <td className="col-droite">
                        <Link to={`/admin/periodes/${p.id}`} className="btn btn-sm">
                          Voir détail
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="ligne-entre mt-4">
                <div className="texte-secondaire texte-petit">
                  Page {pageCourante} sur {totalPages} — affichage {debut + 1} à{' '}
                  {Math.min(debut + PERIODES_PAR_PAGE, data.periodes.length)} sur{' '}
                  {data.periodes.length}
                </div>
                <div className="ligne">
                  <Button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={pageCourante === 1}
                    taille="sm"
                  >
                    ← Précédent
                  </Button>
                  <Button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={pageCourante === totalPages}
                    taille="sm"
                  >
                    Suivant →
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
      {dernierePeriodeCarte}
      <section className="dashboard-regles" aria-label="Règles de répartition et contrôles">
        <Card className="dashboard-regle dashboard-regle-zero">
          <div className="dashboard-regle-icone"><Icone nom="info" /></div>
          <div>
            <h3>Règle de répartition à valeur nulle</h3>
            <p>Si une personne a une consommation Jiro nulle ou une quantité Rano nulle, sa part pour ce service est fixée à 0,000000 Ar et un avertissement s’affiche. La répartition reste possible tant que le total des consommations Jiro et le total des quantités Rano sont chacun supérieurs à zéro.</p>
          </div>
        </Card>
        <Card className="dashboard-regle dashboard-regle-controle">
          <div className="dashboard-regle-icone"><Icone nom="balance" /></div>
          <div>
            <h3>Contrôle arithmétique bloquant</h3>
            <p>Le calcul est bloqué si un montant de facture est nul ou négatif, si une valeur saisie est invalide, ou si le total des unités d’un service est nul. La certification exige que les parts Jiro et Rano correspondent chacune à leur facture avec un écart strictement inférieur à 0,000001 Ar. Les exports restent bloqués tant que la période n’est pas certifiée.</p>
          </div>
        </Card>
      </section>
    </div>
  )
}

/* ---------- Composant RaccourciLien ---------- */

function RaccourciLien({
  to,
  icone,
  titre,
  sousTitre,
}: {
  to: string
  icone: ReactNode
  titre: string
  sousTitre: string
}) {
  return (
    <Link
      to={to}
      className="raccourci-lien"
    >
      <div className="raccourci-icone">
        {icone}
      </div>
      <div className="raccourci-texte">
        <div className="texte-demi-gras">
          {titre}
        </div>
        <div className="texte-secondaire texte-petit">{sousTitre}</div>
      </div>
      <div className="raccourci-fleche" aria-hidden="true">›</div>
    </Link>
  )
}
