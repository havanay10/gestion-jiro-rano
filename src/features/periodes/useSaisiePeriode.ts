import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { LigneSaisie } from './calcul'

export type EtatChargement = {
  lignes: LigneSaisie[]
  periodeExistante: boolean
  loading: boolean
  erreur: string | null
}

export function useSaisiePeriode(annee: number, mois: number) {
  const [etat, setEtat] = useState<EtatChargement>({
    lignes: [],
    periodeExistante: false,
    loading: false,
    erreur: null,
  })

  const charger = useCallback(async () => {
    setEtat((e) => ({ ...e, loading: true, erreur: null }))

    // 1. Vérifier si la période existe déjà
    const { data: periodeExistante } = await supabase
      .from('periodes')
      .select('id')
      .eq('annee', annee)
      .eq('mois', mois)
      .maybeSingle()

    if (periodeExistante) {
      setEtat({
        lignes: [],
        periodeExistante: true,
        loading: false,
        erreur: null,
      })
      return
    }

    // 2. Charger les personnes actives dont la période de départ est atteinte
    const { data: personnes, error: errP } = await supabase
      .from('personnes')
      .select('id, nom, periode_depart_annee, periode_depart_mois')
      .eq('statut_actif', true)
      .or(
        `periode_depart_annee.lt.${annee},and(periode_depart_annee.eq.${annee},periode_depart_mois.lte.${mois})`
      )
      .order('nom')

    if (errP) {
      setEtat({ lignes: [], periodeExistante: false, loading: false, erreur: errP.message })
      return
    }

    if (!personnes || personnes.length === 0) {
      setEtat({ lignes: [], periodeExistante: false, loading: false, erreur: null })
      return
    }

    const ids = personnes.map((p) => p.id)

    // 3. Charger les rattachements en cours pour le logement
    const { data: rattach } = await supabase
      .from('rattachements_personne_logement')
      .select('personne_id, logements(nom_code)')
      .is('date_fin', null)
      .in('personne_id', ids)

    const logementMap = new Map<string, string>()
    ;(rattach ?? []).forEach((r: any) => {
      logementMap.set(r.personne_id, r.logements?.nom_code ?? '—')
    })

    // 4. Charger tous les relevés de ces personnes pour trouver l'index de référence
    const { data: releves } = await supabase
      .from('releves')
      .select('personne_id, index_total, est_initial, created_at, periodes(annee, mois)')
      .in('personne_id', ids)
      .order('created_at', { ascending: false })

    // Pour chaque personne, trouver le relevé le plus récent AVANT la période
    const refMap = new Map<string, number>()
    ;(releves ?? []).forEach((r: any) => {
      if (refMap.has(r.personne_id)) return
      const estInitial = r.est_initial === true
      const pAnnee = r.periodes?.annee
      const pMois = r.periodes?.mois
      const estAvant =
        estInitial ||
        (pAnnee !== undefined &&
          (pAnnee < annee || (pAnnee === annee && pMois < mois)))

      if (estAvant) {
        refMap.set(r.personne_id, Number(r.index_total))
      }
    })

    // 5. Construire les lignes
    const lignes: LigneSaisie[] = personnes.map((p) => {
      const consoForceeZero =
        p.periode_depart_annee === annee && p.periode_depart_mois === mois
      return {
        personne_id: p.id,
        nom: p.nom,
        logement: logementMap.get(p.id) ?? '—',
        index_ref: refMap.get(p.id) ?? 0,
        nouveau_index: refMap.get(p.id) ?? 0, // pré-rempli avec la référence
        quantite_rano: 0,
        consoForceeZero,
      }
    })

    setEtat({ lignes, periodeExistante: false, loading: false, erreur: null })
  }, [annee, mois])

  useEffect(() => {
    charger()
  }, [charger])

  return { ...etat, recharger: charger, setLignes: (l: LigneSaisie[]) => setEtat((e) => ({ ...e, lignes: l })) }
}