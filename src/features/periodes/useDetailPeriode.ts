import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export type LigneDetail = {
  personne_id: string
  personne: string
  logement: string
  index_total: number
  consommation: number
  quantite_rano: number
  part_jiro: number
  part_rano: number
}

export type DetailPeriode = {
  id: string
  annee: number
  mois: number
  montant_jiro: number
  montant_rano: number
  cout_unitaire_jiro: number | null
  cout_unitaire_rano: number | null
  lignes: LigneDetail[]
}

export function useDetailPeriode(periodeId: string | undefined) {
  const [detail, setDetail] = useState<DetailPeriode | null>(null)
  const [loading, setLoading] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)

  const charger = useCallback(async () => {
    if (!periodeId) {
      setDetail(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setErreur(null)

    // 1. La période
    const { data: periode, error: errP } = await supabase
      .from('periodes')
      .select('id, annee, mois, montant_jiro, montant_rano, cout_unitaire_jiro, cout_unitaire_rano')
      .eq('id', periodeId)
      .maybeSingle()

    if (errP) {
      setErreur(errP.message)
      setLoading(false)
      return
    }
    if (!periode) {
      setErreur('Période introuvable.')
      setLoading(false)
      return
    }

    // 2. Les relevés + nom de personne
    const { data: releves, error: errR } = await supabase
      .from('releves')
      .select(`
        personne_id,
        index_total,
        consommation,
        quantite_rano,
        part_jiro,
        part_rano,
        personnes ( nom )
      `)
      .eq('periode_id', periodeId)

    if (errR) {
      setErreur(errR.message)
      setLoading(false)
      return
    }

    // 3. Logements actuels
    const idsPersonnes = (releves ?? []).map((r: any) => r.personne_id)
    const logementMap = new Map<string, string>()
    if (idsPersonnes.length > 0) {
      const { data: rattach } = await supabase
        .from('rattachements_personne_logement')
        .select('personne_id, logements ( nom_code )')
        .is('date_fin', null)
        .in('personne_id', idsPersonnes)

      ;(rattach ?? []).forEach((r: any) => {
        logementMap.set(r.personne_id, r.logements?.nom_code ?? '—')
      })
    }

    const lignes: LigneDetail[] = (releves ?? [])
      .map((r: any) => ({
        personne_id: r.personne_id,
        personne: r.personnes?.nom ?? '',
        logement: logementMap.get(r.personne_id) ?? '—',
        index_total: Number(r.index_total),
        consommation: Number(r.consommation ?? 0),
        quantite_rano: Number(r.quantite_rano),
        part_jiro: Number(r.part_jiro ?? 0),
        part_rano: Number(r.part_rano ?? 0),
      }))
      .sort((a, b) => a.personne.localeCompare(b.personne))

    setDetail({
      id: periode.id,
      annee: periode.annee,
      mois: periode.mois,
      montant_jiro: Number(periode.montant_jiro),
      montant_rano: Number(periode.montant_rano),
      cout_unitaire_jiro:
        periode.cout_unitaire_jiro === null ? null : Number(periode.cout_unitaire_jiro),
      cout_unitaire_rano:
        periode.cout_unitaire_rano === null ? null : Number(periode.cout_unitaire_rano),
      lignes,
    })
    setLoading(false)
  }, [periodeId])

  useEffect(() => {
    charger()
  }, [charger])

  return { detail, loading, erreur, recharger: charger }
}