import type { ReactNode } from 'react'

export type ColonneTableau<T> = {
  cle: string
  titre: ReactNode
  alignement?: 'gauche' | 'centre' | 'droite'
  classe?: string
  afficher?: (ligne: T, index: number) => ReactNode
}

type TableProps<T> = {
  colonnes: ColonneTableau<T>[]
  lignes: T[]
  cleLigne: (ligne: T, index: number) => string | number
  libelle?: string
  vide?: ReactNode
  pied?: ReactNode
  compacte?: boolean
}

export function Table<T>({
  colonnes,
  lignes,
  cleLigne,
  libelle,
  vide = 'Aucune donnée à afficher.',
  pied,
  compacte = false,
}: TableProps<T>) {
  const classe = `tableau${compacte ? ' tableau-compact' : ''}`

  return (
    <div className="tableau-conteneur">
      <table className={classe}>
        {libelle && <caption className="tableau-libelle">{libelle}</caption>}
        <thead>
          <tr>
            {colonnes.map((colonne) => (
              <th
                key={colonne.cle}
                scope="col"
                className={[
                  colonne.alignement ? `col-${colonne.alignement}` : '',
                  colonne.classe ?? '',
                ].filter(Boolean).join(' ')}
              >
                {colonne.titre}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lignes.length === 0 ? (
            <tr><td className="tableau-vide" colSpan={colonnes.length}>{vide}</td></tr>
          ) : lignes.map((ligne, index) => (
            <tr key={cleLigne(ligne, index)}>
              {colonnes.map((colonne) => (
                <td
                  key={colonne.cle}
                  className={[
                    colonne.alignement ? `col-${colonne.alignement}` : '',
                    colonne.classe ?? '',
                  ].filter(Boolean).join(' ')}
                >
                  {colonne.afficher ? colonne.afficher(ligne, index) : (ligne as Record<string, ReactNode>)[colonne.cle]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {pied && <tfoot>{pied}</tfoot>}
      </table>
    </div>
  )
}
