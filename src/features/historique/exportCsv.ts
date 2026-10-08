import Papa from 'papaparse'
import { supabase } from '../../lib/supabase'


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

  // 3. Logement actuel
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

  // 4. Tri par nom de personne
  const lignes = (releves ?? [])
    .map((r: any) => ({
      annee: periode.annee,
      mois: periode.mois,
      personne: r.personnes?.nom ?? '',
      logement: logementMap.get(r.personne_id) ?? '—',
      index: Number(r.index_total).toFixed(3),
      consommation: Number(r.consommation ?? 0).toFixed(3),
      quantite_rano: r.quantite_rano,
      cout_unitaire_jiro: Number(periode.cout_unitaire_jiro ?? 0).toFixed(3),
      part_jiro: Number(r.part_jiro ?? 0).toFixed(3),
      cout_unitaire_rano: Number(periode.cout_unitaire_rano ?? 0).toFixed(3),
      part_rano: Number(r.part_rano ?? 0).toFixed(3),
    }))
    .sort((a, b) => a.personne.localeCompare(b.personne))

  // 5. Générer CSV avec séparateur ; pour Excel FR
  const csv = Papa.unparse(lignes, {
    delimiter: ';',
    columns: [
      'annee',
      'mois',
      'personne',
      'logement',
      'index',
      'consommation',
      'quantite_rano',
      'cout_unitaire_jiro',
      'part_jiro',
      'cout_unitaire_rano',
      'part_rano',
    ],
  })

  // 6. Téléchargement avec BOM UTF-8 (Excel lit correctement les accents)
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