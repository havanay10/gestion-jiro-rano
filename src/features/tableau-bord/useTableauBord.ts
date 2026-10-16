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
  certifiee: boolean
}

export type PeriodeResume = {
  id: string
  annee: number
  mois: number
  montant_jiro: number
  montant_rano: number
  conso_jiro: number
  quantite_rano: number
  nb_personnes: number
  certifiee: boolean
}

export type PointGraphique = {
  label: string
  annee: number
  mois: number
  jiro: number
  rano: number
}

export type TableauBord = {
  nbPersonnesActives: number
  nbLogements: number
  nbPeriodes: number
  totalJiro: number
  totalRano: number
  moyenneJiro6m: number
  moyenneRano6m: number
  dernierePeriode: DernierePeriode | null
  periodes: PeriodeResume[]
  pointsGraphique: PointGraphique[]
}

const MOIS_COURTS = [
  '', 'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
  'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc',
]

const TOLERANCE = 1e-6

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

      // 2. Toutes les périodes
      const { data: periodes, error: errP } = await supabase
        .from('periodes')
        .select(
          'id, annee, mois, montant_jiro, montant_rano, cout_unitaire_jiro, cout_unitaire_rano'
        )
        .order('annee', { ascending: false })
        .order('mois', { ascending: false })

      if (errP) {
        setErreur(errP.message)
        setLoading(false)
        return
      }

      // 3. Tous les relevés (pour calculer conso, quantités, équilibre)
      const { data: releves, error: errR } = await supabase
        .from('releves')
        .select('periode_id, consommation, quantite_rano, part_jiro, part_rano')
        .not('periode_id', 'is', null)

      if (errR) {
        setErreur(errR.message)
        setLoading(false)
        return
      }

      // Regrouper par période
      const parPeriode = new Map<
        string,
        { conso: number; rano: number; nb: number; sumJiro: number; sumRano: number }
      >()
      ;(releves ?? []).forEach((r: any) => {
        const existing = parPeriode.get(r.periode_id) ?? {
          conso: 0,
          rano: 0,
          nb: 0,
          sumJiro: 0,
          sumRano: 0,
        }
        existing.conso += Number(r.consommation ?? 0)
        existing.rano += Number(r.quantite_rano ?? 0)
        existing.nb += 1
        existing.sumJiro += Number(r.part_jiro ?? 0)
        existing.sumRano += Number(r.part_rano ?? 0)
        parPeriode.set(r.periode_id, existing)
      })

      const totalJiro = (periodes ?? []).reduce((s, p) => s + Number(p.montant_jiro), 0)
      const totalRano = (periodes ?? []).reduce((s, p) => s + Number(p.montant_rano), 0)

      // 4. Liste enrichie
      const periodesEnrichies: PeriodeResume[] = (periodes ?? []).map((p) => {
        const stats = parPeriode.get(p.id)
        const mJiro = Number(p.montant_jiro)
        const mRano = Number(p.montant_rano)
        const certifiee =
          Math.abs((stats?.sumJiro ?? 0) - mJiro) < TOLERANCE &&
          Math.abs((stats?.sumRano ?? 0) - mRano) < TOLERANCE
        return {
          id: p.id,
          annee: p.annee,
          mois: p.mois,
          montant_jiro: mJiro,
          montant_rano: mRano,
          conso_jiro: stats?.conso ?? 0,
          quantite_rano: stats?.rano ?? 0,
          nb_personnes: stats?.nb ?? 0,
          certifiee,
        }
      })

      // 5. Moyennes sur les 6 dernières périodes
      const sixDernieres = periodesEnrichies.slice(0, 6)
      const moyenneJiro6m =
        sixDernieres.length > 0
          ? sixDernieres.reduce((s, p) => s + p.montant_jiro, 0) / sixDernieres.length
          : 0
      const moyenneRano6m =
        sixDernieres.length > 0
          ? sixDernieres.reduce((s, p) => s + p.montant_rano, 0) / sixDernieres.length
          : 0

      // 6. Points du graphique (6 derniers mois, dans l'ordre chronologique)
      const pointsGraphique: PointGraphique[] = sixDernieres
        .slice()
        .reverse()
        .map((p) => ({
          label: `${MOIS_COURTS[p.mois]} ${p.annee}`,
          annee: p.annee,
          mois: p.mois,
          jiro: p.montant_jiro,
          rano: p.montant_rano,
        }))

      // 7. Dernière période (avec coûts unitaires)
      let dernierePeriode: DernierePeriode | null = null
      if (periodes && periodes.length > 0) {
        const d = periodes[0]
        const stats = parPeriode.get(d.id)
        const mJiro = Number(d.montant_jiro)
        const mRano = Number(d.montant_rano)
        const certifiee =
          Math.abs((stats?.sumJiro ?? 0) - mJiro) < TOLERANCE &&
          Math.abs((stats?.sumRano ?? 0) - mRano) < TOLERANCE
        dernierePeriode = {
          id: d.id,
          annee: d.annee,
          mois: d.mois,
          montant_jiro: mJiro,
          montant_rano: mRano,
          cout_unitaire_jiro:
            d.cout_unitaire_jiro === null ? null : Number(d.cout_unitaire_jiro),
          cout_unitaire_rano:
            d.cout_unitaire_rano === null ? null : Number(d.cout_unitaire_rano),
          conso_jiro: stats?.conso ?? 0,
          quantite_rano: stats?.rano ?? 0,
          nb_personnes: stats?.nb ?? 0,
          certifiee,
        }
      }

      setData({
        nbPersonnesActives: persRes.count ?? 0,
        nbLogements: logRes.count ?? 0,
        nbPeriodes: perRes.count ?? 0,
        totalJiro,
        totalRano,
        moyenneJiro6m,
        moyenneRano6m,
        dernierePeriode,
        periodes: periodesEnrichies,
        pointsGraphique,
      })
      setLoading(false)
    }
    charger()
  }, [])

  return { data, loading, erreur }
}