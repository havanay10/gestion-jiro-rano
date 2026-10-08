import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export type PeriodeResume = {
  id: string
  annee: number
  mois: number
  montant_jiro: number
  montant_rano: number
  nb_personnes: number
  equilibre: boolean
}

export type PersonneOption = { id: string; nom: string }

export type Filtres = {
  annee: number | 'toutes'
  mois: number | 'tous'
  personne_id: string | 'toutes'
}

export function useHistorique(filtres: Filtres) {
  const [periodes, setPeriodes] = useState<PeriodeResume[]>([])
  const [personnes, setPersonnes] = useState<PersonneOption[]>([])
  const [anneesDispo, setAnneesDispo] = useState<number[]>([])
  const [loading, setLoading] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)

  // Charger une fois la liste des personnes et des années
  useEffect(() => {
    async function init() {
      const { data: p } = await supabase
        .from('personnes')
        .select('id, nom')
        .order('nom')
      setPersonnes(p ?? [])

      const { data: an } = await supabase
        .from('periodes')
        .select('annee')
      const distinct = Array.from(new Set((an ?? []).map((x) => x.annee))).sort(
        (a, b) => b - a
      )
      setAnneesDispo(distinct)
    }
    init()
  }, [])

  const charger = useCallback(async () => {
    setLoading(true)
    setErreur(null)

    let query = supabase
      .from('periodes')
      .select('id, annee, mois, montant_jiro, montant_rano')
      .order('annee', { ascending: false })
      .order('mois', { ascending: false })

    if (filtres.annee !== 'toutes') query = query.eq('annee', filtres.annee)
    if (filtres.mois !== 'tous') query = query.eq('mois', filtres.mois)

    const { data: periods, error: errP } = await query
    if (errP) {
      setErreur(errP.message)
      setLoading(false)
      return
    }

    let periodesFiltrees = periods ?? []

    // Filtre par personne
    if (filtres.personne_id !== 'toutes' && periodesFiltrees.length > 0) {
      const ids = periodesFiltrees.map((p) => p.id)
      const { data: relevésPersonne } = await supabase
        .from('releves')
        .select('periode_id')
        .in('periode_id', ids)
        .eq('personne_id', filtres.personne_id)

      const gardees = new Set((relevésPersonne ?? []).map((r) => r.periode_id))
      periodesFiltrees = periodesFiltrees.filter((p) => gardees.has(p.id))
    }

    if (periodesFiltrees.length === 0) {
      setPeriodes([])
      setLoading(false)
      return
    }

    // Compter les personnes et vérifier l'équilibre
    const ids = periodesFiltrees.map((p) => p.id)
    const { data: releves, error: errR } = await supabase
      .from('releves')
      .select('periode_id, part_jiro, part_rano')
      .in('periode_id', ids)

    if (errR) {
      setErreur(errR.message)
      setLoading(false)
      return
    }

    const compte = new Map<string, number>()
    const sumJiro = new Map<string, number>()
    const sumRano = new Map<string, number>()
    ;(releves ?? []).forEach((r) => {
      compte.set(r.periode_id, (compte.get(r.periode_id) ?? 0) + 1)
      sumJiro.set(r.periode_id, (sumJiro.get(r.periode_id) ?? 0) + Number(r.part_jiro ?? 0))
      sumRano.set(r.periode_id, (sumRano.get(r.periode_id) ?? 0) + Number(r.part_rano ?? 0))
    })

    const resultat: PeriodeResume[] = periodesFiltrees.map((p) => {
      const mJiro = Number(p.montant_jiro)
      const mRano = Number(p.montant_rano)
      const tJiro = sumJiro.get(p.id) ?? 0
      const tRano = sumRano.get(p.id) ?? 0
      const equilibre =
        Math.abs(tJiro - mJiro) < 0.001 && Math.abs(tRano - mRano) < 0.001
      return {
        id: p.id,
        annee: p.annee,
        mois: p.mois,
        montant_jiro: mJiro,
        montant_rano: mRano,
        nb_personnes: compte.get(p.id) ?? 0,
        equilibre,
      }
    })

    setPeriodes(resultat)
    setLoading(false)
  }, [filtres.annee, filtres.mois, filtres.personne_id])

  useEffect(() => {
    charger()
  }, [charger])

  return { periodes, personnes, anneesDispo, loading, erreur, recharger: charger }
}