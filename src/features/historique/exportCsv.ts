import Papa from 'papaparse'
import { supabase } from '../../lib/supabase'

function dernierJourDuMois(annee: number, mois: number): string {
  const d = new Date(annee, mois, 0)
  const jour = String(d.getDate()).padStart(2, '0')
  return `${annee}-${String(mois).padStart(2, '0')}-${jour}`
}

export async function exporterPeriodeCsv(periodeId: string) {
  // 1. Période
  const { data: periode, error: errP } = await supabase
    .from('periodes')
    .select('annee, mois, cout_unitaire_jiro, cout_unitaire_rano')
    .eq('id', periodeId)
    .single()

  if (errP || !periode) throw new Error(errP?.message ?? 'Période introuvable.')

  // 2. Relevés + nom de personne
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

  if (errR) throw new Error(errR.message)

  // 3. Logements applicables À LA DATE DE LA PÉRIODE
  const idsPersonnes = (releves ?? []).map((r: any) => r.personne_id)
  const logementMap = new Map<string, string>()

  if (idsPersonnes.length > 0) {
    const dateRef = dernierJourDuMois(periode.annee, periode.mois)

    const { data: rattach } = await supabase
      .from('rattachements_personne_logement')
      .select('personne_id, date_debut, date_fin, logements ( nom_code )')
      .in('personne_id', idsPersonnes)
      .lte('date_debut', dateRef)
      .or(`date_fin.is.null,date_fin.gte.${dateRef}`)
      .order('date_debut', { ascending: false })

    ;(rattach ?? []).forEach((r: any) => {
      if (!logementMap.has(r.personne_id)) {
        logementMap.set(r.personne_id, r.logements?.nom_code ?? '—')
      }
    })
  }

  // 4. Tri par nom de personne
  const lignes = (releves ?? [])
    .map((r: any) => ({
      annee: periode.annee,
      mois: periode.mois,
      personne: r.personnes?.nom ?? '',
      logement: logementMap.get(r.personne_id) ?? '—',
      index: Number(r.index_total).toFixed(6),
      consommation: Number(r.consommation ?? 0).toFixed(6),
      quantite_rano: r.quantite_rano,
      cout_unitaire_jiro: Number(periode.cout_unitaire_jiro ?? 0).toFixed(6),
      part_jiro: Number(r.part_jiro ?? 0).toFixed(6),
      cout_unitaire_rano: Number(periode.cout_unitaire_rano ?? 0).toFixed(6),
      part_rano: Number(r.part_rano ?? 0).toFixed(6),
    }))
    .sort((a, b) => a.personne.localeCompare(b.personne))

  // 5. Générer CSV
  const csv = Papa.unparse(lignes, {
    delimiter: ';',
    columns: [
      'annee', 'mois', 'personne', 'logement',
      'index', 'consommation', 'quantite_rano',
      'cout_unitaire_jiro', 'part_jiro',
      'cout_unitaire_rano', 'part_rano',
    ],
  })

  // 6. Téléchargement
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `jiro-rano-${periode.annee}-${String(periode.mois).padStart(2, '0')}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}