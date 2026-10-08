import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { DetailPeriode } from './useDetailPeriode'

const moisFrancais = [
  '', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

function fmt(n: number, dec = 3): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  }).format(n)
    .replace(/\u202F/g, ' ')   // espace insécable étroit
    .replace(/\u00A0/g, ' ')   // espace insécable classique
}

export function exporterPeriodePdf(detail: DetailPeriode) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  const largeur = doc.internal.pageSize.getWidth()
  const dateGeneration = new Date().toLocaleString('fr-FR')

  // Titre
  doc.setFontSize(16)
  doc.text(
    `Détail de la période — ${moisFrancais[detail.mois]} ${detail.annee}`,
    14,
    18
  )

  // Bloc récapitulatif
  doc.setFontSize(10)
  const cuJiro = detail.cout_unitaire_jiro ?? 0
  const cuRano = detail.cout_unitaire_rano ?? 0
  const montantJiro = detail.montant_jiro
  const montantRano = detail.montant_rano
  const totalGeneral = montantJiro + montantRano

  doc.text(`Facture Jiro : ${fmt(montantJiro)} Ar`, 14, 28)
  doc.text(`Coût unitaire Jiro : ${fmt(cuJiro)} Ar/kWh`, 14, 34)
  doc.text(`Facture Rano : ${fmt(montantRano)} Ar`, 14, 40)
  doc.text(`Coût unitaire Rano : ${fmt(cuRano)} Ar/unité`, 14, 46)
  doc.text(`Total consolidé : ${fmt(totalGeneral)} Ar`, 14, 52)

  // Tableau
  const head = [[
    'Personne',
    'Logement',
    'Index',
    'Conso (kWh)',
    'Qté Rano (u)',
    'Part Jiro (Ar)',
    'Part Rano (Ar)',
    'Total (Ar)',
  ]]

  const body = detail.lignes.map((l) => [
    l.personne,
    l.logement,
    fmt(l.index_total, 3),
    fmt(l.consommation, 3),
    String(l.quantite_rano),
    fmt(l.part_jiro, 3),
    fmt(l.part_rano, 3),
    fmt(l.part_jiro + l.part_rano, 3),
  ])

  // Totaux
  const totalConso = detail.lignes.reduce((s, l) => s + l.consommation, 0)
  const totalRanoQte = detail.lignes.reduce((s, l) => s + l.quantite_rano, 0)
  const totalPartJiro = detail.lignes.reduce((s, l) => s + l.part_jiro, 0)
  const totalPartRano = detail.lignes.reduce((s, l) => s + l.part_rano, 0)
  const totalPartGeneral = totalPartJiro + totalPartRano

  const foot = [[
    'TOTAUX',
    '—',
    '—',
    fmt(totalConso, 3),
    String(totalRanoQte),
    fmt(totalPartJiro, 3),
    fmt(totalPartRano, 3),
    fmt(totalPartGeneral, 3),
  ]]

  autoTable(doc, {
    startY: 60,
    head,
    body,
    foot,
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [15, 23, 42], textColor: 255 },
    footStyles: { fillColor: [240, 240, 240], fontStyle: 'bold' },
    columnStyles: {
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right' },
    },
  })

  // Vérification de l'équilibre
  // @ts-ignore — lastAutoTable est ajouté par jspdf-autotable
  const finTableau = doc.lastAutoTable?.finalY ?? 120
  const ecartJiro = totalPartJiro - montantJiro
  const ecartRano = totalPartRano - montantRano

  doc.setFontSize(11)
  doc.text(
    `Contrôle d'équilibre — Écart Jiro : ${fmt(ecartJiro)} Ar / Écart Rano : ${fmt(ecartRano)} Ar`,
    14,
    finTableau + 10
  )

  const equilibre = Math.abs(ecartJiro) < 0.001 && Math.abs(ecartRano) < 0.001
  doc.setTextColor(equilibre ? 22 : 200, equilibre ? 130 : 30, equilibre ? 60 : 30)
  doc.text(
    equilibre
      ? 'Répartition exacte : la somme des parts égale les factures au millième près.'
      : 'Attention : un écart a été détecté entre les parts et les factures.',
    14,
    finTableau + 17
  )
  doc.setTextColor(0, 0, 0)

  // Pied de page
  doc.setFontSize(9)
  doc.setTextColor(120)
  doc.text(`Document généré le ${dateGeneration}`, 14, doc.internal.pageSize.getHeight() - 8)
  doc.text(
    'Gestion Jiro & Rano',
    largeur - 40,
    doc.internal.pageSize.getHeight() - 8
  )

  // Nom du fichier
  const nom = `jiro-rano-detail-${detail.annee}-${String(detail.mois).padStart(2, '0')}.pdf`
  doc.save(nom)
}