import { Link } from 'react-router-dom'
import { useTableauBord } from './useTableauBord'

const moisFrancais = [
  '', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

function fmt(n: number, dec = 3): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  }).format(n)
}

function Carte({
  titre,
  valeur,
  sousTitre,
}: {
  titre: string
  valeur: string
  sousTitre?: string
}) {
  return (
    <div
      style={{
        border: '1px solid #ddd',
        borderRadius: 8,
        padding: 16,
        background: '#fff',
      }}
    >
      <div style={{ fontSize: 12, color: '#888', textTransform: 'uppercase' }}>
        {titre}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6 }}>{valeur}</div>
      {sousTitre && (
        <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{sousTitre}</div>
      )}
    </div>
  )
}

export function TableauBordPage() {
  const { data, loading, erreur } = useTableauBord()

  if (loading) return <p>Chargement…</p>
  if (erreur) return <p style={{ color: 'crimson' }}>Erreur : {erreur}</p>
  if (!data) return <p>Aucune donnée.</p>

  const d = data.dernierePeriode

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <header>
        <h2 style={{ margin: 0 }}>Tableau de bord</h2>
        <p style={{ color: '#666', marginTop: 4 }}>
          Vue d’ensemble de la gestion Jiro &amp; Rano.
        </p>
      </header>

      {/* Cartes compteurs */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
        }}
      >
        <Carte titre="Personnes actives" valeur={String(data.nbPersonnesActives)} />
        <Carte titre="Logements" valeur={String(data.nbLogements)} />
        <Carte titre="Périodes enregistrées" valeur={String(data.nbPeriodes)} />
        <Carte
          titre="Total consolidé"
          valeur={`${fmt(data.totalJiro + data.totalRano, 0)} Ar`}
          sousTitre={`Jiro ${fmt(data.totalJiro, 0)} + Rano ${fmt(data.totalRano, 0)}`}
        />
      </section>

      {/* Totaux cumulés */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 12,
        }}
      >
        <Carte
          titre="Consommation électrique cumulée"
          valeur={`${fmt(data.totalConsoJiro, 3)} kWh`}
        />
        <Carte
          titre="Quantité Rano cumulée"
          valeur={`${fmt(data.totalQuantiteRano, 0)} unités`}
        />
      </section>

      {/* Dernière période */}
      {d && (
        <section style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <h3 style={{ margin: 0 }}>
              Dernière période : {moisFrancais[d.mois]} {d.annee}
            </h3>
            <Link
              to={`/admin/periodes/${d.id}`}
              style={{
                padding: '6px 10px',
                border: '1px solid #ccc',
                borderRadius: 6,
                textDecoration: 'none',
                color: '#333',
                fontSize: 13,
              }}
            >
              Voir le détail
            </Link>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 16,
              marginTop: 16,
            }}
          >
            <div>
              <div style={{ fontSize: 12, color: '#888' }}>Facture Jiro</div>
              <div style={{ fontWeight: 600 }}>{fmt(d.montant_jiro)} Ar</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                {fmt(d.conso_jiro, 3)} kWh consommés
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#888' }}>Facture Rano</div>
              <div style={{ fontWeight: 600 }}>{fmt(d.montant_rano)} Ar</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                {fmt(d.quantite_rano, 0)} unités
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#888' }}>Coûts unitaires</div>
              <div style={{ fontWeight: 600 }}>
                {fmt(d.cout_unitaire_jiro ?? 0)} Ar/kWh
              </div>
              <div style={{ fontWeight: 600, marginTop: 4 }}>
                {fmt(d.cout_unitaire_rano ?? 0)} Ar/unité
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Récap dernières périodes */}
      <section style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
        <h3 style={{ marginTop: 0 }}>Périodes récentes</h3>
        {data.dernieresPeriodes.length === 0 && (
          <p style={{ color: '#666' }}>Aucune période enregistrée.</p>
        )}
        {data.dernieresPeriodes.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                <th style={{ padding: 8 }}>Période</th>
                <th style={{ padding: 8, textAlign: 'right' }}>Facture Jiro</th>
                <th style={{ padding: 8, textAlign: 'right' }}>Facture Rano</th>
                <th style={{ padding: 8, textAlign: 'right' }}>Total</th>
                <th style={{ padding: 8, textAlign: 'right' }}>Personnes</th>
                <th style={{ padding: 8 }}></th>
              </tr>
            </thead>
            <tbody>
              {data.dernieresPeriodes.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: 10, fontWeight: 600 }}>
                    {moisFrancais[p.mois]} {p.annee}
                  </td>
                  <td style={{ padding: 10, textAlign: 'right' }}>{fmt(p.montant_jiro, 0)} Ar</td>
                  <td style={{ padding: 10, textAlign: 'right' }}>{fmt(p.montant_rano, 0)} Ar</td>
                  <td style={{ padding: 10, textAlign: 'right', fontWeight: 600 }}>
                    {fmt(p.montant_jiro + p.montant_rano, 0)} Ar
                  </td>
                  <td style={{ padding: 10, textAlign: 'right' }}>{p.nb_personnes}</td>
                  <td style={{ padding: 10, textAlign: 'right' }}>
                    <Link
                      to={`/admin/periodes/${p.id}`}
                      style={{ fontSize: 13, textDecoration: 'none', color: '#333' }}
                    >
                      Détail →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}