import Decimal from 'decimal.js'

export type LigneSaisie = {
  personne_id: string
  nom: string
  logement: string
  index_ref: number
  nouveau_index: number
  quantite_rano: number
  // Si true, la consommation Jiro est forcée à 0 (période de départ)
  consoForceeZero: boolean
}

export type LigneCalculee = LigneSaisie & {
  consommation: number
  part_jiro: number
  part_rano: number
}

export type ResultatCalcul = {
  lignes: LigneCalculee[]
  coutUnitaireJiro: number
  coutUnitaireRano: number
  totalConsoJiro: number
  totalRano: number
  totalPartJiro: number
  totalPartRano: number
  erreurs: string[]
  avertissements: string[]
}

export function calculerRepartition(
  montantJiro: number,
  montantRano: number,
  lignes: LigneSaisie[]
): ResultatCalcul {
  const erreurs: string[] = []
  const avertissements: string[] = []

  if (!(montantJiro > 0)) erreurs.push('Le montant Jiro doit être strictement positif.')
  if (!(montantRano > 0)) erreurs.push('Le montant Rano doit être strictement positif.')

  const lignesDec = lignes.map((l) => {
    const nouveauIndex = new Decimal(l.nouveau_index)
    const indexRef = new Decimal(l.index_ref)

    let conso: Decimal
    if (l.consoForceeZero) {
      conso = new Decimal(0)
    } else {
      conso = nouveauIndex.minus(indexRef)
    }

    if (conso.isNegative()) {
      erreurs.push(
        `Index inférieur au précédent pour ${l.nom} (ref: ${l.index_ref}, saisi: ${l.nouveau_index}).`
      )
    }

    const quantite = new Decimal(l.quantite_rano)
    if (quantite.isNegative()) {
      erreurs.push(`Quantité Rano négative pour ${l.nom}.`)
    }
    if (!l.consoForceeZero && conso.isZero()) {
      avertissements.push(`Consommation Jiro nulle pour ${l.nom} : sa part Jiro sera 0.`)
    }
    if (quantite.isZero()) {
      avertissements.push(`Quantité Rano nulle pour ${l.nom} : sa part Rano sera 0.`)
    }

    return { ligne: l, conso, quantite }
  })

  const totalConso = lignesDec.reduce((s, x) => s.plus(x.conso), new Decimal(0))
  const totalRano = lignesDec.reduce((s, x) => s.plus(x.quantite), new Decimal(0))

  if (totalConso.isZero()) erreurs.push('Le total des consommations Jiro est nul.')
  if (totalRano.isZero()) erreurs.push('Le total des quantités Rano est nul.')

  if (erreurs.length > 0) {
    return {
      lignes: [],
      coutUnitaireJiro: 0,
      coutUnitaireRano: 0,
      totalConsoJiro: totalConso.toNumber(),
      totalRano: totalRano.toNumber(),
      totalPartJiro: 0,
      totalPartRano: 0,
      erreurs,
      avertissements,
    }
  }

  const montantJiroDec = new Decimal(montantJiro)
  const montantRanoDec = new Decimal(montantRano)
  const cuJiro = montantJiroDec.div(totalConso)
  const cuRano = montantRanoDec.div(totalRano)

  // Parts exactes
  const partsJiroExact = lignesDec.map((x) => cuJiro.times(x.conso))
  const partsRanoExact = lignesDec.map((x) => cuRano.times(x.quantite))

  // Répartition en millièmes
  const partsJiroMil = repartirAvecPlusGrandReste(
    partsJiroExact,
    lignesDec.map((x) => x.ligne.personne_id),
    montantJiroDec.times(1000)
  )
  const partsRanoMil = repartirAvecPlusGrandReste(
    partsRanoExact,
    lignesDec.map((x) => x.ligne.personne_id),
    montantRanoDec.times(1000)
  )

  const lignesCalculees: LigneCalculee[] = lignesDec.map((x, i) => ({
    ...x.ligne,
    consommation: x.conso.toNumber(),
    part_jiro: partsJiroMil[i].div(1000).toNumber(),
    part_rano: partsRanoMil[i].div(1000).toNumber(),
  }))

  const totalPartJiro = partsJiroMil.reduce((s, v) => s.plus(v), new Decimal(0)).div(1000).toNumber()
  const totalPartRano = partsRanoMil.reduce((s, v) => s.plus(v), new Decimal(0)).div(1000).toNumber()

  return {
    lignes: lignesCalculees,
    coutUnitaireJiro: cuJiro.toNumber(),
    coutUnitaireRano: cuRano.toNumber(),
    totalConsoJiro: totalConso.toNumber(),
    totalRano: totalRano.toNumber(),
    totalPartJiro,
    totalPartRano,
    erreurs: [],
    avertissements,
  }
}

function repartirAvecPlusGrandReste(
  partsExactes: Decimal[],
  personneIds: string[],
  totalMilliemes: Decimal
): Decimal[] {
  const mille = new Decimal(1000)
  const floors = partsExactes.map((p) => p.times(mille).floor())
  const sumFloors = floors.reduce((s, v) => s.plus(v), new Decimal(0))
  const reste = totalMilliemes.minus(sumFloors).toNumber()

  const rangs = partsExactes.map((p, i) => ({
    i,
    frac: p.times(mille).minus(p.times(mille).floor()),
    id: personneIds[i],
  }))

  rangs.sort((a, b) => {
    const c = b.frac.comparedTo(a.frac)
    if (c !== 0) return c
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  })

  const res = [...floors]
  for (let k = 0; k < reste; k++) {
    res[rangs[k].i] = res[rangs[k].i].plus(1)
  }
  return res
}