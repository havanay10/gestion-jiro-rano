import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { Link } from 'react-router-dom'
import { Icone } from '../../components/ui'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/AuthContext'

export function AccueilPersonnelPage() {
  const { profil } = useAuth()
  const [nom, setNom] = useState('')
  const heroRef = useRef<HTMLElement>(null)

  function deplacerDecor(event: ReactPointerEvent<HTMLElement>) {
    if (event.pointerType !== 'mouse' || window.matchMedia('(prefers-reduced-motion: reduce), (pointer: coarse)').matches) return
    const cadre = event.currentTarget.getBoundingClientRect()
    const x = (event.clientX - cadre.left) / cadre.width - 0.5
    const y = (event.clientY - cadre.top) / cadre.height - 0.5
    const decor = heroRef.current
    if (!decor) return
    decor.style.setProperty('--accueil-lueur-x', `${-x * 12}px`)
    decor.style.setProperty('--accueil-lueur-y', `${-y * 12}px`)
    decor.style.setProperty('--accueil-decor-x', `${x * 12}px`)
    decor.style.setProperty('--accueil-decor-y', `${y * 8}px`)
  }

  function reinitialiserDecor() {
    const decor = heroRef.current
    if (!decor) return
    decor.style.setProperty('--accueil-lueur-x', '0px')
    decor.style.setProperty('--accueil-lueur-y', '0px')
    decor.style.setProperty('--accueil-decor-x', '0px')
    decor.style.setProperty('--accueil-decor-y', '0px')
  }

  useEffect(() => {
    let actif = true

    async function chargerNom() {
      if (!profil?.personne_id) return
      const { data } = await supabase
        .from('personnes')
        .select('nom')
        .eq('id', profil.personne_id)
        .maybeSingle()
      if (actif) setNom(data?.nom ?? '')
    }

    chargerNom()
    return () => { actif = false }
  }, [profil?.personne_id])

  return (
    <div className="page accueil-personnel-page">
      <section ref={heroRef} className="personnel-accueil-hero" aria-labelledby="personnel-accueil-titre" onPointerMove={deplacerDecor} onPointerLeave={reinitialiserDecor}>
        <div className="personnel-accueil-lueurs" aria-hidden="true"><span /><span /><span /></div>
        <div className="personnel-accueil-decor" aria-hidden="true"><span /><span /><span /><span /></div>
        <div className="personnel-accueil-panneau">
          <div className="personnel-accueil-contenu">
            <div className="personnel-accueil-orbite" aria-hidden="true"><span /></div>
            <div className="personnel-accueil-surtitre"><span /> VOTRE ESPACE PERSONNEL</div>
            <h1 id="personnel-accueil-titre" className="personnel-accueil-titre"><span>Bonjour,</span><strong>{nom || 'bienvenue'}</strong></h1>
            <p className="personnel-accueil-texte">Retrouvez vos consommations et vos décomptes Jiro &amp; Rano en un seul endroit.</p>
            <Link className="btn btn-primaire personnel-accueil-bouton" to="/espace">
              <Icone nom="saisie" /> Découvrir mes relevés <span aria-hidden="true">→</span>
            </Link>
            <span className="personnel-accueil-note">Vos informations personnelles, accessibles en un clic.</span>
          </div>
          <aside className="personnel-accueil-illustration" aria-label="Présentation des services Jiro et Rano">
            <div className="personnel-accueil-legendes">
              <span><Icone nom="eau" /> Eau</span>
              <span><Icone nom="electricite" /> Électricité</span>
            </div>
            <div className="personnel-accueil-scene">
              <span className="personnel-accueil-vague" aria-hidden="true" />
              <span className="personnel-accueil-circuit" aria-hidden="true" />
              <article className="personnel-accueil-service personnel-accueil-service-eau">
                <span className="personnel-accueil-service-icone"><Icone nom="eau" /></span>
                <strong>Eau</strong>
                <p>Vos relevés et consommations sont regroupés ici.</p>
              </article>
              <article className="personnel-accueil-service personnel-accueil-service-jiro">
                <span className="personnel-accueil-service-icone"><Icone nom="electricite" /></span>
                <strong>Électricité</strong>
                <p>Vos relevés et consommations sont regroupés ici.</p>
              </article>
            </div>
          </aside>
        </div>
        <div className="personnel-accueil-pied">
          <div className="personnel-accueil-services"><span><Icone nom="eau" /> Eau</span><i>·</i><span><Icone nom="electricite" /> Électricité</span></div>
          <span className="personnel-accueil-signature">Un seul espace pour vos relevés.</span>
        </div>
      </section>
    </div>
  )
}
