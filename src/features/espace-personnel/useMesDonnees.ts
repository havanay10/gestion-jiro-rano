import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export type LignePerso = {
  annee: number
  mois: number
  index_total: number
  consommation: number
  quantite_rano: number
  cout_unitaire_jiro: number | null
  cout_unitaire_rano: number | null
  part_jiro: number
  part_rano: number
  total_individuel: number
}

export function useMesDonnees() {
  const [lignes, setLignes] = useState<LignePerso[]>([])
  const [loading, setLoading] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)

  useEffect(() => {
    async function charger() {
      setLoading(true)
      setErreur(null)
      const { data, error } = await supabase.rpc('mes_donnees')
      if (error) {
        setErreur(error.message)
        setLignes([])
      } else {
        setLignes(
          (data ?? []).map((r: any) => ({
            annee: r.annee,
            mois: r.mois,
            index_total: Number(r.index_total),
            consommation: Number(r.consommation),
            quantite_rano: Number(r.quantite_rano),
            cout_unitaire_jiro:
              r.cout_unitaire_jiro === null ? null : Number(r.cout_unitaire_jiro),
            cout_unitaire_rano:
              r.cout_unitaire_rano === null ? null : Number(r.cout_unitaire_rano),
            part_jiro: Number(r.part_jiro),
            part_rano: Number(r.part_rano),
            total_individuel: Number(r.total_individuel),
          }))
        )
      }
      setLoading(false)
    }
    charger()
  }, [])

  return { lignes, loading, erreur }
}