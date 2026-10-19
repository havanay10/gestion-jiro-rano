import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { useMesDonnees } from './useMesDonnees'
import { Button, Card, CardStat, EmptyState, LoadingState, Message, PageHeader, Icone } from '../../components/ui'

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
  const telephoneAdmin = '+261376487560'

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
      <PageHeader
        surtitre="MES CONSOMMATIONS & DÉCOMPTES"
        titre="Mon espace — Gestion Jiro & Rano"
        sousTitre={<span className="personnel-salutation"><strong className="personnel-salutation-bonjour">{nom ? `Bonjour ${nom}.` : 'Bonjour.'}</strong><span>Voici vos relevés personnels, du plus récent au plus ancien.</span></span>}
        actions={<div className="personnel-dernier-releve">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></svg>
          <div><span>Dernier relevé</span><strong>{loading ? 'Chargement…' : lignes.length > 0 ? `${moisFrancais[lignes[0].mois]} ${lignes[0].annee}` : 'Aucun relevé'}</strong></div>
        </div>}
      />

      {lignes.length > 0 && <>
        <div className="grille-cartes-stat espace-personnel-indicateurs" aria-label="Résumé de vos montants cumulés">
          <CardStat label="Total Jiro" valeur={`${fmt(totalJiro)} Ar`} variante="jiro" />
          <CardStat label="Total Rano" valeur={`${fmt(totalRano)} Ar`} variante="rano" />
          <CardStat label="Total cumulé" valeur={`${fmt(totalGeneral)} Ar`} variante="sombre" />
        </div>
      </>}

      {loading && <LoadingState texte="Chargement de vos relevés…" />}
      {erreur && !accesRefuse && <Message variante="erreur">Erreur : {erreur}</Message>}
      {!loading && !erreur && lignes.length === 0 && <EmptyState titre="Aucun relevé pour le moment" texte="Vos relevés personnels apparaîtront ici après leur enregistrement." />}

      {lignes.length > 0 && (
        <section className="carte carte-sans-padding espace-historique">
          <div className="carte-entete espace-historique-entete">
            <div>
              <div className="carte-titre">Mon historique</div>
              <div className="carte-sous-titre">Le détail de vos consommations et de vos parts personnelles.</div>
            </div>
            <span className="personnel-historique-compte"><Icone nom="saisie" />{lignes.length} période{lignes.length === 1 ? '' : 's'} enregistrée{lignes.length === 1 ? '' : 's'}</span>
          </div>
          <div className="tableau-conteneur espace-historique-tableau-conteneur">
            <table className="tableau tableau-compact espace-historique-tableau" aria-label="Historique des relevés personnels">
              <thead>
                <tr>
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
                    <td className="col-droite texte-demi-gras">{fmt(l.total_individuel)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="espace-historique-pied">
            <span>{lignesPage.length} relevé{lignesPage.length === 1 ? '' : 's'} affiché{lignesPage.length === 1 ? '' : 's'} · Du plus récent au plus ancien</span>
            <span>Montants en Ariary (Ar) · 6 décimales</span>
          </div>
        </section>
      )}

      {lignes.length > 10 && <div className="ligne pagination-liste">
        <Button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>Précédent</Button>
        <span>Page {page + 1} sur {Math.ceil(lignes.length / 10)}</span>
        <Button onClick={() => setPage((p) => p + 1)} disabled={(page + 1) * 10 >= lignes.length}>Suivant</Button>
      </div>}
      <section className="personnel-informations" aria-label="Informations sur votre espace personnel">
        <Card className="personnel-info-card">
          <div className="personnel-info-icone"><Icone nom="info" /></div>
          <div>
            <h2>Comprendre votre relevé</h2>
            <p>La consommation Jiro correspond à la différence entre deux index successifs. CU désigne le coût unitaire : Ar/kWh pour Jiro et Ar/u pour Rano. Les parts sont les montants calculés pour votre logement ; le total correspond à leur somme. Les montants et index sont affichés avec six décimales.</p>
          </div>
        </Card>
      </section>

      <aside className="personnel-contact" aria-label="Contact administrateur">
        <div className="personnel-contact-entete">
          <div className="personnel-contact-icone"><Icone nom="mail" /></div>
          <div className="personnel-contact-contenu">
            <span className="personnel-contact-surtitre">ASSISTANCE</span>
            <h2>Contact administrateur</h2>
            <p>Pour toute question sur un index ou une consommation, contactez l’administrateur via les coordonnées ci-dessous.</p>
          </div>
        </div>
        <div className="personnel-contact-numeros" aria-label="Coordonnées de l’administrateur">
          <a className="personnel-contact-numero" href="mailto:raharisonhavanay@gmail.com" aria-label="Envoyer un e-mail à raharisonhavanay@gmail.com">
            <span className="personnel-contact-numero-icone"><Icone nom="mail" /></span>
            <span><small>E-mail</small><strong>raharisonhavanay@gmail.com</strong></span>
          </a>
          <div className="personnel-contact-numero">
            <span className="personnel-contact-numero-icone"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6.6 3.5 9 3l2 4.5-2 1.6a15 15 0 0 0 5.9 5.9l1.6-2 4.5 2-.5 2.4a3 3 0 0 1-3.3 2.4A17.5 17.5 0 0 1 4.2 6.8 3 3 0 0 1 6.6 3.5Z" /></svg></span>
            <span><small>Téléphone</small><strong>{telephoneAdmin}</strong></span>
          </div>
          <a className="personnel-contact-numero personnel-contact-facebook" href="https://www.facebook.com/ar.not.havanay.2025/" target="_blank" rel="noopener noreferrer" aria-label="Ouvrir le profil Facebook de l’administrateur">
            <span className="personnel-contact-numero-icone"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M13.5 21v-8h2.7l.4-3h-3.1V8.1c0-.9.3-1.5 1.6-1.5h1.7V3.9c-.3 0-1.3-.1-2.4-.1-2.4 0-4 1.5-4 4.1V10H7.8v3h2.6v8h3.1Z" /></svg></span>
            <span><small>Facebook</small><strong>Ar Nõt Havanay</strong></span>
          </a>
        </div>
      </aside>
    </div>
  )
}
