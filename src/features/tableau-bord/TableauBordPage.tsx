import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTableauBord } from './useTableauBord'
import { GraphiqueFactures } from './GraphiqueFactures'
import {
  PageHeader,
  Card,
  CardEntete,
  CardStat,
  Badge,
  Button,
  EmptyState,
  LoadingState,
} from '../../components/ui'

const MOIS_LONGS = [
  '', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

const PERIODES_PAR_PAGE = 5

/* ---------- Helpers de formatage ---------- */

function fmt0(n: number): string {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n) + ' Ar'
}

function fmt6(n: number): string {
  return (
    new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 6,
      maximumFractionDigits: 6,
    })
      .format(n)
      .replace(/\u202F/g, ' ') + ' Ar'
  )
}

function fmtKwh(n: number): string {
  return (
    new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 6,
      maximumFractionDigits: 6,
    }).format(n) + ' kWh'
  )
}

function fmtUnites(n: number): string {
  return (
    new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 6,
      maximumFractionDigits: 6,
    }).format(n) + ' u'
  )
}

/* ---------- Valeur avec exact sous-jacent ---------- */

function ValeurKpi({ montant }: { montant: number }) {
  const entier = Math.round(montant)
  const exacte = Number(montant.toFixed(6))
  const different = Math.abs(exacte - entier) > 1e-6
  return (
    <>
      <div className="carte-stat-valeur">{fmt0(entier)}</div>
      {different && <div className="carte-stat-valeur-exacte">{fmt6(exacte)}</div>}
    </>
  )
}

/* ---------- Page ---------- */

export function TableauBordPage() {
  const { data, loading, erreur } = useTableauBord()
  const navigate = useNavigate()
  const [page, setPage] = useState(1)

  if (loading) return <LoadingState />
  if (erreur) return <p className="texte-erreur">Erreur : {erreur}</p>
  if (!data) return <p className="texte-secondaire">Aucune donnée.</p>

  const d = data.dernierePeriode

  // Pagination
  const totalPages = Math.max(1, Math.ceil(data.periodes.length / PERIODES_PAR_PAGE))
  const pageCourante = Math.min(page, totalPages)
  const debut = (pageCourante - 1) * PERIODES_PAR_PAGE
  const periodesPage = data.periodes.slice(debut, debut + PERIODES_PAR_PAGE)

  return (
    <div className="page">
      <PageHeader
        surtitre="GESTION DES CONSOMMATIONS"
        titre="Tableau de bord"
        sousTitre="Vue d'ensemble des factures, consommations et répartitions."
      />

      {/* KPI en haut : 3 cartes */}
      <section className="grille-3">
        <CardStat
          label="Facture Jiro (Électricité)"
          valeur={<ValeurKpi montant={data.totalJiro} />}
          detail="Total cumulé"
          icone="⚡"
          variante="jiro"
        />
        <CardStat
          label="Facture Rano (Eau)"
          valeur={<ValeurKpi montant={data.totalRano} />}
          detail="Total cumulé"
          icone="💧"
          variante="rano"
        />
        <CardStat
          label="Personnes actives"
          valeur={data.nbPersonnesActives}
          detail={`${data.nbLogements} logement${data.nbLogements > 1 ? 's' : ''} • ${data.nbPeriodes} période${data.nbPeriodes > 1 ? 's' : ''}`}
          icone="👥"
          variante="sombre"
        />
      </section>

      {/* Graphique + raccourcis */}
      <section className="grille-2-1">
        <Card>
          <CardEntete
            titre="Évolution mensuelle des factures"
            sousTitre="Comparatif Jiro et Rano sur les 6 dernières périodes"
          />
          <GraphiqueFactures
            points={data.pointsGraphique}
            onClicPeriode={(annee, mois) => {
              const p = data.periodes.find((x) => x.annee === annee && x.mois === mois)
              if (p) navigate(`/admin/periodes/${p.id}`)
            }}
          />
          <div className="grille-2 mt-4">
            <CardStat
              label="Moyenne Jiro (6 mois)"
              valeur={fmt0(data.moyenneJiro6m)}
              variante="jiro"
            />
            <CardStat
              label="Moyenne Rano (6 mois)"
              valeur={fmt0(data.moyenneRano6m)}
              variante="rano"
            />
          </div>
        </Card>

        <Card>
          <CardEntete titre="Raccourcis rapides" />
          <div className="empilement-serre">
            <RaccourciLien
              to="/admin/periodes"
              icone="📝"
              titre="Nouvelle saisie de période"
              sousTitre="Enregistrer les factures et index"
            />
            <RaccourciLien
              to="/admin/personnes"
              icone="👥"
              titre="Gestion des personnes"
              sousTitre="Gérer les personnes et les comptes"
            />
            <RaccourciLien
              to="/admin/historique"
              icone="📤"
              titre="Historique & Export"
              sousTitre="Consulter et exporter les périodes"
            />
          </div>
        </Card>
      </section>

      {/* Dernière période */}
      {d && (
        <Card>
          <CardEntete
            titre={`Dernière période — ${MOIS_LONGS[d.mois]} ${d.annee}`}
            sousTitre={`${d.nb_personnes} personne${d.nb_personnes > 1 ? 's' : ''} concernée${d.nb_personnes > 1 ? 's' : ''}`}
            actions={
              <>
                {d.certifiee ? (
                  <Badge variante="succes">✓ Vérifiée</Badge>
                ) : (
                  <Badge variante="erreur">Non certifiée</Badge>
                )}
                <Link to={`/admin/periodes/${d.id}`} className="btn">
                  Voir le détail
                </Link>
              </>
            }
          />
          <div className="grille-3">
            <div>
              <div className="texte-majuscules texte-secondaire">Facture Jiro</div>
              <div className="texte-gras" style={{ fontSize: 18 }}>
                {fmt0(d.montant_jiro)}
              </div>
              <div className="texte-petit texte-secondaire">
                {fmtKwh(d.conso_jiro)} consommés
              </div>
              <div className="texte-petit texte-secondaire">
                CU : {d.cout_unitaire_jiro ? fmt6(d.cout_unitaire_jiro) + ' /kWh' : '—'}
              </div>
            </div>
            <div>
              <div className="texte-majuscules texte-secondaire">Facture Rano</div>
              <div className="texte-gras" style={{ fontSize: 18 }}>
                {fmt0(d.montant_rano)}
              </div>
              <div className="texte-petit texte-secondaire">
                {fmtUnites(d.quantite_rano)} réparties
              </div>
              <div className="texte-petit texte-secondaire">
                CU : {d.cout_unitaire_rano ? fmt6(d.cout_unitaire_rano) + ' /u' : '—'}
              </div>
            </div>
            <div>
              <div className="texte-majuscules texte-secondaire">Total consolidé</div>
              <div className="texte-gras" style={{ fontSize: 18 }}>
                {fmt0(d.montant_jiro + d.montant_rano)}
              </div>
              <div className="texte-petit texte-secondaire">
                {d.nb_personnes} personne{d.nb_personnes > 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Liste des périodes */}
      <Card>
        <CardEntete
          titre="Périodes enregistrées"
          sousTitre={`${data.periodes.length} période${data.periodes.length > 1 ? 's' : ''} au total`}
        />
        {data.periodes.length === 0 ? (
          <EmptyState
            icone="📭"
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
                    <th className="col-droite">Facture Rano</th>
                    <th className="col-droite">Total</th>
                    <th className="col-centre">Personnes</th>
                    <th className="col-centre">État</th>
                    <th></th>
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
                      <td className="col-droite col-num">{fmt6(p.montant_rano)}</td>
                      <td className="col-droite col-num col-nom">
                        {fmt6(p.montant_jiro + p.montant_rano)}
                      </td>
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
                          Détail →
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
  icone: string
  titre: string
  sousTitre: string
}) {
  return (
    <Link
      to={to}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--e-3)',
        padding: 'var(--e-3)',
        border: '1px solid var(--c-bordure)',
        borderRadius: 'var(--r-md)',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'background 0.15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = '#f8fafc'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent'
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 'var(--r-sm)',
          background: 'var(--c-bordure-douce)',
          display: 'grid',
          placeItems: 'center',
          fontSize: 18,
          flexShrink: 0,
        }}
      >
        {icone}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="texte-demi-gras" style={{ fontSize: 13 }}>
          {titre}
        </div>
        <div className="texte-secondaire texte-petit">{sousTitre}</div>
      </div>
      <div className="texte-tertiaire">→</div>
    </Link>
  )
}