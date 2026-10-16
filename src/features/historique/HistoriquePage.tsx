import { useState } from 'react'
import { useHistorique } from './useHistorique'
import { exporterPeriodeCsv } from './exportCsv'
import { Link } from 'react-router-dom';
import { PageHeader, CardEntete, Button, Badge, Message, EmptyState, LoadingState, Table } from '../../components/ui'

const moisFrancais = [
  '', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

function arrondi(n: number): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 6,
    maximumFractionDigits: 6,
  }).format(n)
}

export function HistoriquePage() {
  const [annee, setAnnee] = useState<number | 'toutes'>('toutes')
  const [mois, setMois] = useState<number | 'tous'>('tous')
  const [personneId, setPersonneId] = useState<string | 'toutes'>('toutes')
  const [messageErreur, setMessageErreur] = useState('')
  const [exportEnCours, setExportEnCours] = useState<string | null>(null)

  const { periodes, personnes, anneesDispo, loading, erreur } = useHistorique({
    annee,
    mois,
    personne_id: personneId,
  })

  async function exporter(id: string) {
    setMessageErreur('')
    setExportEnCours(id)
    try {
      await exporterPeriodeCsv(id)
    } catch (e: unknown) {
      setMessageErreur(
        e instanceof Error
          ? `Échec de la génération de l’export CSV : ${e.message}`
          : 'Erreur inconnue.'
      )
    } finally {
      setExportEnCours(null)
    }
  }

  function reinitialiser() {
    setAnnee('toutes')
    setMois('tous')
    setPersonneId('toutes')
  }

  return (
    <div className="page">
      <PageHeader
        surtitre="CONSULTATION ET EXPORT"
        titre="Historique des périodes"
        sousTitre="Consultez les répartitions enregistrées et exportez les périodes certifiées."
      />

      {/* Filtres */}
      <section className="carte carte-compacte">
        <div className="grille-filtres">
          <label>
            Année
            <select
              value={annee}
              onChange={(e) =>
                setAnnee(e.target.value === 'toutes' ? 'toutes' : Number(e.target.value))
              }
            >
              <option value="toutes">Toutes</option>
              {anneesDispo.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </label>

          <label>
            Mois
            <select
              value={mois}
              onChange={(e) =>
                setMois(e.target.value === 'tous' ? 'tous' : Number(e.target.value))
              }
            >
              <option value="tous">Tous</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {moisFrancais[m]}
                </option>
              ))}
            </select>
          </label>

          <label>
            Personne
            <select
              value={personneId}
              onChange={(e) => setPersonneId(e.target.value)}
            >
              <option value="toutes">Toutes les personnes</option>
              {personnes.map((p) => (
                <option key={p.id} value={p.id}>{p.nom}</option>
              ))}
            </select>
          </label>

          <Button type="button" variante="fantome" onClick={reinitialiser}>
            Réinitialiser
          </Button>
        </div>

        <p className="historique-compte">
          {periodes.length} période{periodes.length > 1 ? 's' : ''} affichée
          {periodes.length > 1 ? 's' : ''}
        </p>
      </section>

      {/* Message d'erreur */}
      {messageErreur && <Message variante="erreur" titre="Échec de l’export">{messageErreur}</Message>}

      {/* Liste */}
      <section className="carte carte-sans-padding">
        <CardEntete titre="Périodes enregistrées" sousTitre={`${periodes.length} période${periodes.length === 1 ? '' : 's'} affichée${periodes.length === 1 ? '' : 's'}`} />
        {loading && <LoadingState />}
        {erreur && <Message variante="erreur" titre="Erreur de chargement">{erreur}</Message>}
        {!loading && !erreur && periodes.length === 0 && <EmptyState titre="Aucune période trouvée" texte="Modifiez les filtres ou réinitialisez la recherche." />}
        {!loading && !erreur && periodes.length > 0 && <Table
          libelle="Historique des périodes"
          lignes={periodes}
          cleLigne={(p) => p.id}
          colonnes={[
            { cle: 'periode', titre: 'Période', afficher: (p) => <><strong>{moisFrancais[p.mois]} {p.annee}</strong><div className="col-secondaire">{p.annee}-{String(p.mois).padStart(2, '0')}</div></> },
            { cle: 'jiro', titre: 'Facture Jiro', alignement: 'droite', afficher: (p) => `${arrondi(p.montant_jiro)} Ar` },
            { cle: 'rano', titre: 'Facture Rano', alignement: 'droite', afficher: (p) => `${arrondi(p.montant_rano)} Ar` },
            { cle: 'total', titre: 'Total', alignement: 'droite', afficher: (p) => <strong>{arrondi(p.montant_jiro + p.montant_rano)} Ar</strong> },
            { cle: 'personnes', titre: 'Personnes', alignement: 'centre', afficher: (p) => p.nb_personnes },
            { cle: 'etat', titre: 'État', afficher: (p) => p.equilibre ? <Badge variante="succes">✓ Vérifiée</Badge> : <Badge variante="erreur">Déséquilibre</Badge> },
            { cle: 'actions', titre: 'Actions', afficher: (p) => <div className="tableau-actions"><Link to={`/admin/periodes/${p.id}`} className="btn btn-sm">Voir le détail</Link><Button type="button" taille="sm" variante="primaire" onClick={() => exporter(p.id)} disabled={exportEnCours === p.id || !p.equilibre} title={p.equilibre ? 'Exporter en CSV' : 'Export bloqué : période non certifiée.'}>{exportEnCours === p.id ? 'Export…' : 'Exporter CSV'}</Button></div> },
          ]}
        />}
      </section>
    </div>
  )
}
