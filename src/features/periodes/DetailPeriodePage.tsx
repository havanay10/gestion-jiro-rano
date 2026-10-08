import { Link, useParams } from 'react-router-dom'
import { useDetailPeriode } from './useDetailPeriode'
import { exporterPeriodePdf } from './exportPdf'

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

export function DetailPeriodePage() {
  const { periodeId } = useParams<{ periodeId: string }>()
  const { detail, loading, erreur } = useDetailPeriode(periodeId)

  if (loading) return <p>Chargement…</p>
  if (erreur) return <p style={{ color: 'crimson' }}>Erreur : {erreur}</p>
  if (!detail) return <p>Période introuvable.</p>

  const totalJiro = detail.montant_jiro
  const totalRano = detail.montant_rano
  const totalConso = detail.lignes.reduce((s, l) => s + l.consommation, 0)
  const totalRanoQte = detail.lignes.reduce((s, l) => s + l.quantite_rano, 0)
  const totalPartJiro = detail.lignes.reduce((s, l) => s + l.part_jiro, 0)
  const totalPartRano = detail.lignes.reduce((s, l) => s + l.part_rano, 0)
  const ecartJiro = totalPartJiro - totalJiro
  const ecartRano = totalPartRano - totalRano
  const equilibre = Math.abs(ecartJiro) < 0.001 && Math.abs(ecartRano) < 0.001

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Link to="/admin/historique" style={{ fontSize: 13, color: '#666', textDecoration: 'none' }}>
            ← Retour à l’historique
          </Link>
          <h2 style={{ margin: '8px 0 0 0' }}>
            Détail — {moisFrancais[detail.mois]} {detail.annee}
          </h2>
        </div>
        <button type="button" onClick={() => exporterPeriodePdf(detail)}>
          Exporter en PDF
        </button>
      </header>

      {/* Récapitulatif */}
      <section style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
        <h3 style={{ marginTop: 0 }}>Récapitulatif</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, color: '#888' }}>Facture Jiro</div>
            <div style={{ fontWeight: 600 }}>{fmt(totalJiro)} Ar</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#888' }}>Coût unitaire Jiro</div>
            <div style={{ fontWeight: 600 }}>{fmt(detail.cout_unitaire_jiro ?? 0)} Ar/kWh</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#888' }}>Facture Rano</div>
            <div style={{ fontWeight: 600 }}>{fmt(totalRano)} Ar</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: '#888' }}>Coût unitaire Rano</div>
            <div style={{ fontWeight: 600 }}>{fmt(detail.cout_unitaire_rano ?? 0)} Ar/unité</div>
          </div>
        </div>

        <div style={{ marginTop: 16, fontSize: 14 }}>
          <strong>Total consolidé :</strong> {fmt(totalJiro + totalRano)} Ar
        </div>

        <div style={{ marginTop: 12 }}>
          {equilibre ? (
            <span style={{ color: 'green', fontWeight: 600 }}>
              ✓ Répartition exacte : la somme des parts égale les factures.
            </span>
          ) : (
            <span style={{ color: 'crimson', fontWeight: 600 }}>
              ✗ Écart détecté — Jiro : {fmt(ecartJiro)} Ar, Rano : {fmt(ecartRano)} Ar
            </span>
          )}
        </div>
      </section>

      {/* Tableau */}
      <section style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
        <h3 style={{ marginTop: 0 }}>Ventilation individuelle</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
              <th style={{ padding: 8 }}>Personne</th>
              <th style={{ padding: 8 }}>Logement</th>
              <th style={{ padding: 8, textAlign: 'right' }}>Index</th>
              <th style={{ padding: 8, textAlign: 'right' }}>Conso (kWh)</th>
              <th style={{ padding: 8, textAlign: 'right' }}>Qté Rano (u)</th>
              <th style={{ padding: 8, textAlign: 'right' }}>Part Jiro (Ar)</th>
              <th style={{ padding: 8, textAlign: 'right' }}>Part Rano (Ar)</th>
              <th style={{ padding: 8, textAlign: 'right' }}>Total (Ar)</th>
            </tr>
          </thead>
          <tbody>
            {detail.lignes.map((l) => (
              <tr key={l.personne_id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: 8, fontWeight: 600 }}>{l.personne}</td>
                <td style={{ padding: 8 }}>{l.logement}</td>
                <td style={{ padding: 8, textAlign: 'right' }}>{fmt(l.index_total)}</td>
                <td style={{ padding: 8, textAlign: 'right' }}>{fmt(l.consommation)}</td>
                <td style={{ padding: 8, textAlign: 'right' }}>{l.quantite_rano}</td>
                <td style={{ padding: 8, textAlign: 'right' }}>{fmt(l.part_jiro)}</td>
                <td style={{ padding: 8, textAlign: 'right' }}>{fmt(l.part_rano)}</td>
                <td style={{ padding: 8, textAlign: 'right', fontWeight: 600 }}>
                  {fmt(l.part_jiro + l.part_rano)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '2px solid #333', fontWeight: 700 }}>
              <td style={{ padding: 8 }} colSpan={3}>Totaux</td>
              <td style={{ padding: 8, textAlign: 'right' }}>{fmt(totalConso)}</td>
              <td style={{ padding: 8, textAlign: 'right' }}>{totalRanoQte}</td>
              <td style={{ padding: 8, textAlign: 'right' }}>{fmt(totalPartJiro)}</td>
              <td style={{ padding: 8, textAlign: 'right' }}>{fmt(totalPartRano)}</td>
              <td style={{ padding: 8, textAlign: 'right' }}>{fmt(totalPartJiro + totalPartRano)}</td>
            </tr>
          </tfoot>
        </table>
      </section>
    </div>
  )
}