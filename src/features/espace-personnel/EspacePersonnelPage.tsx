import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { useMesDonnees } from './useMesDonnees'
import { Button, Card, CardStat, EmptyState, LoadingState, Message, PageHeader } from '../../components/ui'

const moisFrancais = [
  '', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

function fmt(n: number | null): string {
  if (n === null) return '0,000000'
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 6,
    maximumFractionDigits: 6,
  }).format(n)
}

export function EspacePersonnelPage() {
  const { profil, signOut } = useAuth()
  const navigate = useNavigate()
  const { lignes, loading, erreur } = useMesDonnees()
  const [page, setPage] = useState(0)
  const [aideOuverte, setAideOuverte] = useState(false)
  const [nom, setNom] = useState<string>('')
  const [deconnexionEnCours, setDeconnexionEnCours] = useState(false)

  useEffect(() => {
    async function chargerNom() {
      if (!profil?.personne_id) return
      const { data } = await supabase
        .from('personnes')
        .select('nom')
        .eq('id', profil.personne_id)
        .maybeSingle()
      setNom(data?.nom ?? '')
    }
    chargerNom()
  }, [profil?.personne_id])

  async function handleDeconnexion() {
    setDeconnexionEnCours(true)
    await signOut()
    navigate('/login', { replace: true })
  }

  // Compte désactivé ou personne inactive → message bloquant avec bouton de déconnexion
  const accesRefuse =
    erreur !== null &&
    (erreur.toLowerCase().includes('accès refusé') ||
      erreur.toLowerCase().includes('désactivé'))

  const lignesPage = useMemo(() => lignes.slice(page * 10, page * 10 + 10), [lignes, page])
  const totalJiro = lignes.reduce((s, l) => s + l.part_jiro, 0)
  const totalRano = lignes.reduce((s, l) => s + l.part_rano, 0)
  const totalGeneral = totalJiro + totalRano
  const contactAdmin = import.meta.env.VITE_ADMIN_CONTACT

  if (accesRefuse) {
    return (
      <div className="page espace-refuse">
        <Message variante="erreur" titre="Accès refusé">
          <p>
            Votre compte ou votre fiche personne est désactivé. Vous ne pouvez
            plus accéder à vos données. Contactez l’administrateur si vous pensez
            qu’il s’agit d’une erreur.
          </p>
          <Button
            variante="primaire"
            onClick={handleDeconnexion}
            disabled={deconnexionEnCours}
          >
            {deconnexionEnCours ? 'Déconnexion…' : 'Se déconnecter'}
          </Button>
        </Message>
      </div>
    )
  }

  return (
    <div className="page espace-personnel">
      <PageHeader surtitre="ESPACE PERSONNEL" titre="Mon historique" sousTitre={<>
        {nom ? `Bonjour ${nom}. ` : ''}Voici vos relevés personnels, du plus récent au plus ancien.
      </>} actions={<Button variante="fantome" onClick={handleDeconnexion} disabled={deconnexionEnCours}>{deconnexionEnCours ? 'Déconnexion…' : 'Se déconnecter'}</Button>} />

      {lignes.length > 0 && <>
        <div className="grille-cartes-stat">
          <CardStat label="Total Jiro" valeur={`${fmt(totalJiro)} Ar`} variante="jiro" />
          <CardStat label="Total Rano" valeur={`${fmt(totalRano)} Ar`} variante="rano" />
          <CardStat label="Total cumulé" valeur={`${fmt(totalGeneral)} Ar`} variante="sombre" />
        </div>
        <p className="texte-secondaire texte-petit">Dernier relevé : <strong>{moisFrancais[lignes[0].mois]} {lignes[0].annee}</strong></p>
      </>}

      {loading && <LoadingState texte="Chargement de vos relevés…" />}
      {erreur && !accesRefuse && <Message variante="erreur">Erreur : {erreur}</Message>}
      {!loading && !erreur && lignes.length === 0 && <EmptyState titre="Aucun relevé pour le moment" texte="Vos relevés personnels apparaîtront ici après leur enregistrement." />}

      {lignes.length > 0 && (
        <div className="tableau-conteneur"><table className="tableau tableau-compact">
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
              <th>Période</th>
              <th className="col-droite">Index précédent</th>
              <th className="col-droite">Index</th>
              <th className="col-droite">Conso (kWh)</th>
              <th className="col-droite">Qté Rano (u)</th>
              <th className="col-droite">CU Jiro (Ar/kWh)</th>
              <th className="col-droite">Part Jiro (Ar)</th>
              <th className="col-droite">CU Rano (Ar/u)</th>
              <th className="col-droite">Part Rano (Ar)</th>
              <th className="col-droite">Total (Ar)</th>
            </tr>
          </thead>
          <tbody>
            {lignesPage.map((l) => (
              <tr key={`${l.annee}-${l.mois}`}>
                <td className="texte-demi-gras">
                  <Link to={`/espace/periodes/${l.annee}-${String(l.mois).padStart(2, '0')}`}>{moisFrancais[l.mois]} {l.annee}</Link>
                </td>
                <td className="col-droite">{fmt(lignes[lignes.findIndex((x) => x.annee === l.annee && x.mois === l.mois) + 1]?.index_total ?? null)}</td>
                <td className="col-droite">{fmt(l.index_total)}</td>
                <td className="col-droite">{fmt(l.consommation)}</td>
                <td className="col-droite">{l.quantite_rano}</td>
                <td className="col-droite">{fmt(l.cout_unitaire_jiro)}</td>
                <td className="col-droite">{fmt(l.part_jiro)}</td>
                <td className="col-droite">{fmt(l.cout_unitaire_rano)}</td>
                <td className="col-droite">{fmt(l.part_rano)}</td>
                <td className="col-droite texte-demi-gras">
                  {fmt(l.total_individuel)}
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}

      {lignes.length > 10 && <div className="ligne pagination-liste">
        <Button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>Précédent</Button>
        <span>Page {page + 1} sur {Math.ceil(lignes.length / 10)}</span>
        <Button onClick={() => setPage((p) => p + 1)} disabled={(page + 1) * 10 >= lignes.length}>Suivant</Button>
      </div>}
      {lignes.length > 0 && <Card compacte>
        <Button variante="fantome" onClick={() => setAideOuverte((v) => !v)} aria-expanded={aideOuverte}>Comprendre votre relevé</Button>
        {aideOuverte && <p className="texte-secondaire">La consommation Jiro correspond à la différence entre deux index successifs. Les parts Jiro et Rano sont les montants calculés pour votre logement sur la période. Tous les montants et index sont affichés avec six décimales.</p>}
      </Card>}
      {contactAdmin && <p className="texte-secondaire">Besoin d’aide ? Contactez l’administrateur : <a href={`mailto:${contactAdmin}`}>{contactAdmin}</a></p>}
    </div>
  )
}
