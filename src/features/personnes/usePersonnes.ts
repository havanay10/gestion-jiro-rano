import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export type Personne = {
  id: string
  nom: string
  periode_depart_annee: number
  periode_depart_mois: number
  statut_actif: boolean
  // Données jointes calculées côté client
  logement_id: string | null
  logement_nom: string | null
  dernier_index: number | null
}

type Etat = {
  personnes: Personne[]
  loading: boolean
  erreur: string | null
}

export function usePersonnes() {
  const [etat, setEtat] = useState<Etat>({
    personnes: [],
    loading: true,
    erreur: null,
  })

  const charger = useCallback(async () => {
    setEtat((e) => ({ ...e, loading: true, erreur: null }))

    // 1. Récupérer les personnes
    const { data: personnes, error: errP } = await supabase
      .from('personnes')
      .select('id, nom, periode_depart_annee, periode_depart_mois, statut_actif')
      .order('nom', { ascending: true })

    if (errP) {
      setEtat({ personnes: [], loading: false, erreur: errP.message })
      return
    }

    // 2. Récupérer les rattachements en cours (date_fin = null)
    const { data: rattach, error: errR } = await supabase
      .from('rattachements_personne_logement')
      .select('personne_id, logement_id, date_fin, logements(nom_code)')
      .is('date_fin', null)

    if (errR) {
      setEtat({ personnes: [], loading: false, erreur: errR.message })
      return
    }

    // 3. Récupérer tous les relevés pour calculer le dernier index
    const { data: releves, error: errRel } = await supabase
      .from('releves')
      .select('personne_id, index_total, periode_id, est_initial, created_at')
      .order('created_at', { ascending: false })

    if (errRel) {
      setEtat({ personnes: [], loading: false, erreur: errRel.message })
      return
    }

    // 4. Assembler
    const rattachMap = new Map<string, { logement_id: string; logement_nom: string }>()
    ;(rattach ?? []).forEach((r: any) => {
      rattachMap.set(r.personne_id, {
        logement_id: r.logement_id,
        logement_nom: r.logements?.nom_code ?? '—',
      })
    })

    const dernierIndexMap = new Map<string, number>()
    ;(releves ?? []).forEach((r: any) => {
      if (!dernierIndexMap.has(r.personne_id)) {
        dernierIndexMap.set(r.personne_id, Number(r.index_total))
      }
    })

    const enrichies: Personne[] = (personnes ?? []).map((p: any) => {
      const rat = rattachMap.get(p.id)
      return {
        id: p.id,
        nom: p.nom,
        periode_depart_annee: p.periode_depart_annee,
        periode_depart_mois: p.periode_depart_mois,
        statut_actif: p.statut_actif,
        logement_id: rat?.logement_id ?? null,
        logement_nom: rat?.logement_nom ?? null,
        dernier_index: dernierIndexMap.get(p.id) ?? null,
      }
    })

    setEtat({ personnes: enrichies, loading: false, erreur: null })
  }, [])

  useEffect(() => {
    charger()
  }, [charger])

  async function creerPersonne(input: {
    nom: string
    periode_depart_annee: number
    periode_depart_mois: number
    index_initial: number
    logement_id: string | null
  }) {
    const { error } = await supabase.rpc('creer_personne', {
      p_nom: input.nom,
      p_periode_depart_annee: input.periode_depart_annee,
      p_periode_depart_mois: input.periode_depart_mois,
      p_index_initial: input.index_initial,
      p_logement_id: input.logement_id,
    })
    if (error) throw new Error(error.message)
    await charger()
  }

  return { ...etat, recharger: charger, creerPersonne }
}