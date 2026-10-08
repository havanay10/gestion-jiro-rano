import { useState } from 'react'
import { useHistorique } from './useHistorique'
import { exporterPeriodeCsv } from './exportCsv'
import { Link } from 'react-router-dom';

const moisFrancais = [
  '', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

function arrondi(n: number): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(n)
}

export function HistoriquePage() {
  const [annee, setAnnee] = useState<number | 'toutes'>('toutes')
  const [mois, setMois] = useState<number | 'tous'>('tous')
  const [personneId, setPersonneId] = useState<string | 'toutes'>('toutes')
  const [messageErreur, setMessageErreur] = useState('')
  const [exportEnCours, setExportEnCours] = useState<string | null>(null)

  const { periodes, personnes, anneesDispo, loading, erreur } = useHistorique({
    annee,
    mois,
    personne_id: personneId,
  })

  async function exporter(id: string) {
    setMessageErreur('')
    setExportEnCours(id)
    try {
      await exporterPeriodeCsv(id)
    } catch (e: unknown) {
      setMessageErreur(
        e instanceof Error
          ? `Échec de la génération de l’export CSV : ${e.message}`
          : 'Erreur inconnue.'
      )
    } finally {
      setExportEnCours(null)
    }
  }

  function reinitialiser() {
    setAnnee('toutes')
    setMois('tous')
    setPersonneId('toutes')
  }

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <header>
        <h2 style={{ margin: 0 }}>Historique des périodes</h2>
        <p style={{ color: '#666', marginTop: 4 }}>
          Consultation chronologique et export CSV.
        </p>
      </header>

      {/* Filtres */}
      <section style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
          <label>
            Année
            <select
              value={annee}
              onChange={(e) =>
                setAnnee(e.target.value === 'toutes' ? 'toutes' : Number(e.target.value))
              }
            >
              <option value="toutes">Toutes</option>
              {anneesDispo.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </label>

          <label>
            Mois
            <select
              value={mois}
              onChange={(e) =>
                setMois(e.target.value === 'tous' ? 'tous' : Number(e.target.value))
              }
            >
              <option value="tous">Tous</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {moisFrancais[m]}
                </option>
              ))}
            </select>
          </label>

          <label>
            Personne
            <select
              value={personneId}
              onChange={(e) => setPersonneId(e.target.value)}
            >
              <option value="toutes">Toutes les personnes</option>
              {personnes.map((p) => (
                <option key={p.id} value={p.id}>{p.nom}</option>
              ))}
            </select>
          </label>

          <button type="button" onClick={reinitialiser}>
            Réinitialiser
          </button>
        </div>

        <p style={{ marginTop: 12, color: '#666', fontSize: 13 }}>
          {periodes.length} période{periodes.length > 1 ? 's' : ''} affichée
          {periodes.length > 1 ? 's' : ''}
        </p>
      </section>

      {/* Message d'erreur */}
      {messageErreur && (
        <div
          style={{
            border: '1px solid crimson',
            borderRadius: 8,
            padding: 12,
            background: '#fff5f5',
            color: 'crimson',
          }}
        >
          {messageErreur}
        </div>
      )}

      {/* Liste */}
      <section>
        {loading && <p>Chargement…</p>}
        {erreur && <p style={{ color: 'crimson' }}>Erreur : {erreur}</p>}
        {!loading && !erreur && periodes.length === 0 && (
          <p style={{ color: '#666' }}>Aucune période enregistrée pour ces filtres.</p>
        )}

        {periodes.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                <th style={{ padding: 8 }}>Période</th>
                <th style={{ padding: 8 }}>Facture Jiro</th>
                <th style={{ padding: 8 }}>Facture Rano</th>
                <th style={{ padding: 8 }}>Total</th>
                <th style={{ padding: 8 }}>Personnes</th>
                <th style={{ padding: 8 }}>État</th>
                <th style={{ padding: 8 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {periodes.map((p) => {
                const total = p.montant_jiro + p.montant_rano
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: 12 }}>
                      <div style={{ fontWeight: 600 }}>
                        {moisFrancais[p.mois]} {p.annee}
                      </div>
                      <div style={{ fontSize: 12, color: '#888' }}>
                        Période {p.annee}-{String(p.mois).padStart(2, '0')}
                      </div>
                    </td>
                    <td style={{ padding: 12 }}>{arrondi(p.montant_jiro)} Ar</td>
                    <td style={{ padding: 12 }}>{arrondi(p.montant_rano)} Ar</td>
                    <td style={{ padding: 12, fontWeight: 600 }}>{arrondi(total)} Ar</td>
                    <td style={{ padding: 12 }}>{p.nb_personnes}</td>
                    <td style={{ padding: 12 }}>
                      {p.equilibre ? (
                        <span style={{ color: 'green' }}>✓ Vérifiée</span>
                      ) : (
                        <span style={{ color: 'crimson' }}>✗ Déséquilibre</span>
                      )}
                    </td>
                    <td style={{ padding: 12, display: 'flex', gap: 8 }}>
                        <Link
                            to={`/admin/periodes/${p.id}`}
                            style={{
                            textDecoration: 'none',
                            padding: '6px 10px',
                            borderRadius: 6,
                            border: '1px solid #ccc',
                            fontSize: 13,
                            color: '#333',
                            }}
                        >
                           Voir le détail
                        </Link>
                        <button
                            type="button"
                            onClick={() => exporter(p.id)}
                            disabled={exportEnCours === p.id || !p.equilibre}
                            title={
                            p.equilibre
                                ? 'Exporter en CSV'
                                : 'Export bloqué : la répartition n’est pas équilibrée.'
                            }
                        >
                            {exportEnCours === p.id ? 'Export…' : 'Exporter CSV'}
                        </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}