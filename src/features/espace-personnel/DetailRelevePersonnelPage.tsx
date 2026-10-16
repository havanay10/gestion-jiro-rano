import { Link, useParams } from 'react-router-dom'
import { useMesDonnees } from './useMesDonnees'
import { Card, EmptyState, LoadingState, Message, PageHeader } from '../../components/ui'

const moisFrancais = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
const fmt = (n: number | null) => new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 6, maximumFractionDigits: 6 }).format(n ?? 0)

export function DetailRelevePersonnelPage() {
  const { periode } = useParams<{ periode: string }>()
  const { lignes, loading, erreur } = useMesDonnees()
  const [annee, mois] = (periode ?? '').split('-').map(Number)
  const ligne = lignes.find((l) => l.annee === annee && l.mois === mois)
  const indexLigne = ligne ? lignes.indexOf(ligne) : -1
  const indexPrecedent = indexLigne >= 0 ? lignes[indexLigne + 1]?.index_total ?? null : null

  if (loading) return <LoadingState texte="Chargement du relevé…" />
  if (erreur) return <Message variante="erreur">Erreur : {erreur}</Message>
  if (!ligne) return <div className="page"><EmptyState titre="Relevé introuvable" texte="Ce relevé n’est pas disponible dans votre historique." action={<Link to="/espace">Retour à mon historique</Link>} /></div>

  return <div className="page detail-releve-personnel">
    <PageHeader surtitre="ESPACE PERSONNEL" titre={`Mon relevé — ${moisFrancais[ligne.mois]} ${ligne.annee}`} sousTitre={<Link to="/espace">← Retour à mon historique</Link>} />
    <Card>
      <h2>Répartition de la période</h2>
      <dl className="detail-releve-grille">
        <div><dt>Index relevé</dt><dd>{fmt(ligne.index_total)} kWh</dd></div>
        <div><dt>Index précédent</dt><dd>{fmt(indexPrecedent)} kWh</dd></div>
        <div><dt>Consommation Jiro</dt><dd>{fmt(ligne.consommation)} kWh</dd></div>
        <div><dt>Quantité Rano</dt><dd>{ligne.quantite_rano}</dd></div>
        <div><dt>Coût unitaire Jiro</dt><dd>{fmt(ligne.cout_unitaire_jiro)} Ar/kWh</dd></div>
        <div><dt>Part Jiro</dt><dd>{fmt(ligne.part_jiro)} Ar</dd></div>
        <div><dt>Coût unitaire Rano</dt><dd>{fmt(ligne.cout_unitaire_rano)} Ar/unité</dd></div>
        <div><dt>Part Rano</dt><dd>{fmt(ligne.part_rano)} Ar</dd></div>
        <div><dt>Total de la période</dt><dd><strong>{fmt(ligne.total_individuel)} Ar</strong></dd></div>
      </dl>
    </Card>
  </div>
}
