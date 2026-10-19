import { Link, useParams } from 'react-router-dom'
import { useDetailPeriode } from './useDetailPeriode'
import { exporterPeriodePdf } from './exportPdf'
import { TOLERANCE_EQUILIBRE } from '../../lib/constantes';
import { PageHeader, CardStat, Badge, Button, Table, Message, LoadingState, EmptyState, Icone } from '../../components/ui'

const moisFrancais = [
  '', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

function fmt(n: number, dec = 6): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  }).format(n)
}

export function DetailPeriodePage() {
  const { periodeId } = useParams<{ periodeId: string }>()
  const { detail, loading, erreur } = useDetailPeriode(periodeId)

  if (loading) return <LoadingState />
  if (erreur) return <Message variante="erreur" titre="Chargement impossible">{erreur}</Message>
  if (!detail) return <EmptyState titre="Période introuvable" texte="Cette période n’existe pas ou n’est plus accessible." />

  const totalJiro = detail.montant_jiro
  const totalRano = detail.montant_rano
  const totalConso = detail.lignes.reduce((s, l) => s + l.consommation, 0)
  const totalRanoQte = detail.lignes.reduce((s, l) => s + l.quantite_rano, 0)
  const totalPartJiro = detail.lignes.reduce((s, l) => s + l.part_jiro, 0)
  const totalPartRano = detail.lignes.reduce((s, l) => s + l.part_rano, 0)
  const ecartJiro = totalPartJiro - totalJiro
  const ecartRano = totalPartRano - totalRano
  const equilibre =
    Math.abs(ecartJiro) < TOLERANCE_EQUILIBRE &&
    Math.abs(ecartRano) < TOLERANCE_EQUILIBRE
  const moisFormate = String(detail.mois).padStart(2, '0')
  const dernierJour = new Date(detail.annee, detail.mois, 0).getDate()
  const dateDebut = `01/${moisFormate}/${detail.annee}`
  const dateFin = `${String(dernierJour).padStart(2, '0')}/${moisFormate}/${detail.annee}`

  return (
    <div className="page detail-periode-page">
      <PageHeader
        titre={`Détail de la période — ${moisFrancais[detail.mois]} ${detail.annee}`}
        sousTitre={<div className="detail-periode-meta"><span>Réf. période : {detail.id.toUpperCase()}</span><span>Période du {dateDebut} au {dateFin}</span><Link to="/admin/historique">← Retour à l’historique</Link></div>}
        actions={<Button type="button" variante="primaire" onClick={() => exporterPeriodePdf(detail)} disabled={!equilibre} title={!equilibre ? 'Export bloqué : période non certifiée.' : undefined}>Exporter en PDF</Button>}
      />

      <Message variante={equilibre ? 'succes' : 'erreur'} titre={equilibre ? 'Période certifiée' : 'Période non certifiée'}>
        {equilibre ? 'Les parts Jiro et Rano correspondent aux factures.' : `Écart détecté — Jiro : ${fmt(ecartJiro)} Ar, Rano : ${fmt(ecartRano)} Ar. Les exports sont bloqués.`}
      </Message>

      <section className="grille-3 detail-periode-indicateurs" aria-label="Résumé des factures de la période">
        <CardStat variante="jiro" label="Facture Jiro" valeur={<>{fmt(totalJiro)} <small>Ar</small></>} detail={`Coût unitaire : ${fmt(detail.cout_unitaire_jiro ?? 0)} Ar/kWh`} />
        <CardStat variante="rano" label="Facture Rano" valeur={<>{fmt(totalRano)} <small>Ar</small></>} detail={`Coût unitaire : ${fmt(detail.cout_unitaire_rano ?? 0)} Ar/unité`} />
        <CardStat variante="sombre" label="Total consolidé" valeur={<>{fmt(totalJiro + totalRano)} <small>Ar</small></>} detail={<Badge variante={equilibre ? 'succes' : 'erreur'}>{equilibre ? 'Répartition vérifiée' : 'Écart à corriger'}</Badge>} />
      </section>

      <section className="carte carte-sans-padding detail-periode-tableau">
        <div className="carte-entete detail-tableau-entete"><div><div className="carte-titre">Ventilation individuelle</div><div className="carte-sous-titre">Parts calculées pour chaque personne de la période.</div></div></div>
        <Table
          libelle="Ventilation individuelle de la période"
          lignes={detail.lignes}
          cleLigne={(l) => l.personne_id}
          colonnes={[
            { cle: 'personne', titre: 'Personne', afficher: (l) => <strong>{l.personne}</strong> },
            { cle: 'logement', titre: 'Logement', afficher: (l) => l.logement },
            { cle: 'index', titre: 'Index', alignement: 'droite', afficher: (l) => fmt(l.index_total) },
            { cle: 'conso', titre: 'Conso (kWh)', alignement: 'droite', afficher: (l) => fmt(l.consommation) },
            { cle: 'qte', titre: 'Qté Rano (u)', alignement: 'droite', afficher: (l) => l.quantite_rano },
            { cle: 'jiro', titre: 'Part Jiro (Ar)', alignement: 'droite', afficher: (l) => fmt(l.part_jiro) },
            { cle: 'rano', titre: 'Part Rano (Ar)', alignement: 'droite', afficher: (l) => fmt(l.part_rano) },
            { cle: 'total', titre: 'Total (Ar)', alignement: 'droite', afficher: (l) => <strong>{fmt(l.part_jiro + l.part_rano)}</strong> },
          ]}
          pied={<tr><td colSpan={3}>Totaux</td><td className="col-droite">{fmt(totalConso)}</td><td className="col-droite">{totalRanoQte}</td><td className="col-droite">{fmt(totalPartJiro)}</td><td className="col-droite">{fmt(totalPartRano)}</td><td className="col-droite">{fmt(totalPartJiro + totalPartRano)}</td></tr>}
        />
      </section>

      <section className="dashboard-regles detail-periode-regles" aria-label="Règles de répartition et contrôles">
        <article className="carte dashboard-regle dashboard-regle-zero">
          <div className="dashboard-regle-icone"><Icone nom="info" /></div>
          <div>
            <h3>Règle de répartition à valeur nulle</h3>
            <p>Si la consommation Jiro d’une personne ou sa quantité Rano vaut zéro, sa part pour ce service est de 0,000000 Ar. Le calcul reste possible si le total des consommations Jiro et le total des quantités Rano sont chacun supérieurs à zéro.</p>
            <div className="detail-periode-formules">
              <code>Part Jiro = (consommation individuelle ÷ consommation totale) × facture Jiro</code>
              <code>Part Rano = (quantité individuelle ÷ quantité totale) × facture Rano</code>
            </div>
          </div>
        </article>

        <article className="carte dashboard-regle dashboard-regle-controle">
          <div className="dashboard-regle-icone"><Icone nom="balance" /></div>
          <div className="detail-periode-controle-contenu">
            <h3>Contrôle arithmétique bloquant et certification</h3>
            <p>La période est certifiée si les sommes des parts Jiro et Rano correspondent chacune à leur facture avec un écart strictement inférieur à 0,000001 Ar. L’export PDF reste bloqué si ce contrôle échoue.</p>
            <div className="detail-periode-statut">
              <span>État du contrôle</span>
              <Badge variante={equilibre ? 'succes' : 'erreur'}>{equilibre ? 'Répartition vérifiée' : 'Écart à corriger'}</Badge>
            </div>
            <dl className="detail-periode-ecarts">
              <div><dt>Écart Jiro</dt><dd>{fmt(ecartJiro)} Ar</dd></div>
              <div><dt>Écart Rano</dt><dd>{fmt(ecartRano)} Ar</dd></div>
            </dl>
          </div>
        </article>
      </section>
    </div>
  )
}
