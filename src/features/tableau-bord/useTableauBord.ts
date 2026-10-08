import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export type DernierePeriode = {
  id: string
  annee: number
  mois: number
  montant_jiro: number
  montant_rano: number
  cout_unitaire_jiro: number | null
  cout_unitaire_rano: number | null
  conso_jiro: number
  quantite_rano: number
  nb_personnes: number
}

export type TableauBord = {
  nbPersonnesActives: number
  nbLogements: number
  nbPeriodes: number
  totalJiro: number
  totalRano: number
  totalConsoJiro: number
  totalQuantiteRano: number
  dernierePeriode: DernierePeriode | null
  dernieresPeriodes: {
    id: string
    annee: number
    mois: number
    montant_jiro: number
    montant_rano: number
    nb_personnes: number
  }[]
}

export function useTableauBord() {
  const [data, setData] = useState<TableauBord | null>(null)
  const [loading, setLoading] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)

  useEffect(() => {
    async function charger() {
      setLoading(true)
      setErreur(null)

      // 1. Compteurs simples
      const [persRes, logRes, perRes] = await Promise.all([
        supabase
          .from('personnes')
          .select('id', { count: 'exact', head: true })
          .eq('statut_actif', true),
        supabase.from('logements').select('id', { count: 'exact', head: true }),
        supabase.from('periodes').select('id', { count: 'exact', head: true }),
      ])

      if (persRes.error || logRes.error || perRes.error) {
        setErreur(
          persRes.error?.message ?? logRes.error?.message ?? perRes.error?.message ?? 'Erreur'
        )
        setLoading(false)
        return
      }

      // 2. Toutes les périodes (récap + totaux)
      const { data: periodes, error: errP } = await supabase
        .from('periodes')
        .select('id, annee, mois, montant_jiro, montant_rano, cout_unitaire_jiro, cout_unitaire_rano')
        .order('annee', { ascending: false })
        .order('mois', { ascending: false })

      if (errP) {
        setErreur(errP.message)
        setLoading(false)
        return
      }

      // 3. Relevés pour calculs de conso / quantités et nb personnes par période
      const { data: releves, error: errR } = await supabase
        .from('releves')
        .select('periode_id, consommation, quantite_rano')
        .not('periode_id', 'is', null)

      if (errR) {
        setErreur(errR.message)
        setLoading(false)
        return
      }

      const totalJiro = (periodes ?? []).reduce(
        (s, p) => s + Number(p.montant_jiro),
        0
      )
      const totalRano = (periodes ?? []).reduce(
        (s, p) => s + Number(p.montant_rano),
        0
      )
      const totalConsoJiro = (releves ?? []).reduce(
        (s, r) => s + Number(r.consommation ?? 0),
        0
      )
      const totalQuantiteRano = (releves ?? []).reduce(
        (s, r) => s + Number(r.quantite_rano ?? 0),
        0
      )

      // 4. Dernière période + stats
      const derniere = periodes && periodes.length > 0 ? periodes[0] : null

      let dernierePeriode: DernierePeriode | null = null
      if (derniere) {
        const relevésDernière = (releves ?? []).filter(
          (r) => r.periode_id === derniere.id
        )
        dernierePeriode = {
          id: derniere.id,
          annee: derniere.annee,
          mois: derniere.mois,
          montant_jiro: Number(derniere.montant_jiro),
          montant_rano: Number(derniere.montant_rano),
          cout_unitaire_jiro:
            derniere.cout_unitaire_jiro === null
              ? null
              : Number(derniere.cout_unitaire_jiro),
          cout_unitaire_rano:
            derniere.cout_unitaire_rano === null
              ? null
              : Number(derniere.cout_unitaire_rano),
          conso_jiro: relevésDernière.reduce(
            (s, r) => s + Number(r.consommation ?? 0),
            0
          ),
          quantite_rano: relevésDernière.reduce(
            (s, r) => s + Number(r.quantite_rano ?? 0),
            0
          ),
          nb_personnes: relevésDernière.length,
        }
      }

      // 5. Récap des 6 dernières
      const dernieresPeriodes = (periodes ?? []).slice(0, 6).map((p) => {
        const nb = (releves ?? []).filter((r) => r.periode_id === p.id).length
        return {
          id: p.id,
          annee: p.annee,
          mois: p.mois,
          montant_jiro: Number(p.montant_jiro),
          montant_rano: Number(p.montant_rano),
          nb_personnes: nb,
        }
      })

      setData({
        nbPersonnesActives: persRes.count ?? 0,
        nbLogements: logRes.count ?? 0,
        nbPeriodes: perRes.count ?? 0,
        totalJiro,
        totalRano,
        totalConsoJiro,
        totalQuantiteRano,
        dernierePeriode,
        dernieresPeriodes,
      })
      setLoading(false)
    }
    charger()
  }, [])

  return { data, loading, erreur }
}