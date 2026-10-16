import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { PageHeader, Table, Button, Message, LoadingState, EmptyState } from '../../components/ui'

type EvenementAudit = {
  id: string
  date_modification: string
  periode_id: string | null
  champ_modifie: string
  ancienne_valeur: string | null
  nouvelle_valeur: string | null
}

const LIBELLES: Record<string, string> = {
  creation_personne: 'Création d’une personne',
  desactivation_personne: 'Désactivation d’une personne',
  reactivation_personne: 'Réactivation d’une personne',
  creation_periode: 'Création d’une période',
  montant_jiro: 'Modification du montant Jiro',
  montant_rano: 'Modification du montant Rano',
}

export function AdminAudit() {
  const [evenements, setEvenements] = useState<EvenementAudit[]>([])
  const [page, setPage] = useState(0)
  const [aPlus, setAPlus] = useState(false)
  const [loading, setLoading] = useState(true)
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    let actif = true
    async function charger() {
      setLoading(true)
      setErreur('')
      const debut = page * 25
      const { data, error } = await supabase
        .from('journal_audit')
        .select('id, date_modification, periode_id, champ_modifie, ancienne_valeur, nouvelle_valeur')
        .order('date_modification', { ascending: false })
        .range(debut, debut + 25)
      if (!actif) return
      if (error) setErreur(error.message)
      else {
        const lignes = data ?? []
        setAPlus(lignes.length > 25)
        setEvenements(lignes.slice(0, 25) as EvenementAudit[])
      }
      setLoading(false)
    }
    void charger()
    return () => { actif = false }
  }, [page])

  return (
    <div className="page">
      <PageHeader surtitre="TRAÇABILITÉ" titre="Journal d’audit" sousTitre="Historique des actions enregistrées dans le système." />
      {erreur && <Message variante="erreur" titre="Chargement impossible">{erreur}</Message>}
      {loading ? <LoadingState /> : evenements.length === 0 ? <EmptyState titre="Aucun événement" texte="Les actions enregistrées apparaîtront ici." /> : (
        <Table
          libelle="Journal d’audit"
          lignes={evenements}
          cleLigne={(e) => e.id}
          colonnes={[
            { cle: 'date', titre: 'Date', afficher: (e) => <span className="audit-date">{new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(e.date_modification))}</span> },
            { cle: 'action', titre: 'Action', afficher: (e) => LIBELLES[e.champ_modifie] ?? e.champ_modifie.replaceAll('_', ' ') },
            { cle: 'details', titre: 'Détails', afficher: (e) => <>{e.ancienne_valeur !== null && <>Ancienne valeur : <strong>{e.ancienne_valeur}</strong> → </>}{e.nouvelle_valeur ?? 'Action enregistrée'}{e.periode_id && <> · <Link to={`/admin/periodes/${e.periode_id}`}>Voir la période</Link></>}</> },
          ]}
        />
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button type="button" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0 || loading}>Précédent</Button>
        <span>Page {page + 1}</span>
        <Button type="button" variante="primaire" onClick={() => setPage((p) => p + 1)} disabled={!aPlus || loading}>Voir plus</Button>
      </div>
    </div>
  )
}
