import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { useMesDonnees } from './useMesDonnees'

const moisFrancais = [
  '', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]

function fmt(n: number | null, dec = 3): string {
  if (n === null) return '—'
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  }).format(n)
}

export function EspacePersonnelPage() {
  const { profil, signOut } = useAuth()
  const navigate = useNavigate()
  const { lignes, loading, erreur } = useMesDonnees()
  const [nom, setNom] = useState<string>('')
  const [deconnexionEnCours, setDeconnexionEnCours] = useState(false)

  useEffect(() => {
    async function chargerNom() {
      if (!profil?.personne_id) return
      const { data } = await supabase
        .from('personnes')
        .select('nom')
        .eq('id', profil.personne_id)
        .maybeSingle()
      setNom(data?.nom ?? '')
    }
    chargerNom()
  }, [profil?.personne_id])

  async function handleDeconnexion() {
    setDeconnexionEnCours(true)
    await signOut()
    navigate('/login', { replace: true })
  }

  // Compte désactivé ou personne inactive → message bloquant avec bouton de déconnexion
  const accesRefuse =
    erreur !== null &&
    (erreur.toLowerCase().includes('accès refusé') ||
      erreur.toLowerCase().includes('désactivé'))

  if (accesRefuse) {
    return (
      <div style={{ display: 'grid', gap: 16, maxWidth: 520, margin: '0 auto' }}>
        <div
          style={{
            border: '1px solid crimson',
            borderRadius: 8,
            padding: 20,
            background: '#fff5f5',
          }}
        >
          <h2 style={{ marginTop: 0, color: 'crimson', fontSize: 18 }}>
            Accès refusé
          </h2>
          <p style={{ color: '#333', marginBottom: 16 }}>
            Votre compte ou votre fiche personne est désactivé. Vous ne pouvez
            plus accéder à vos données. Contactez l’administrateur si vous pensez
            qu’il s’agit d’une erreur.
          </p>
          <button
            type="button"
            onClick={handleDeconnexion}
            disabled={deconnexionEnCours}
            style={{
              padding: '8px 16px',
              background: '#0f172a',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: deconnexionEnCours ? 'not-allowed' : 'pointer',
              opacity: deconnexionEnCours ? 0.6 : 1,
            }}
          >
            {deconnexionEnCours ? 'Déconnexion…' : 'Se déconnecter'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <header>
        <h2 style={{ margin: 0 }}>Mon historique</h2>
        <p style={{ color: '#666', marginTop: 4 }}>
          {nom ? `Bonjour ${nom}. ` : ''}
          Voici vos relevés personnels, du plus récent au plus ancien.
        </p>
      </header>

      {loading && <p>Chargement…</p>}
      {erreur && !accesRefuse && (
        <p style={{ color: 'crimson' }}>Erreur : {erreur}</p>
      )}
      {!loading && !erreur && lignes.length === 0 && (
        <p style={{ color: '#666' }}>Aucun relevé enregistré pour l’instant.</p>
      )}

      {lignes.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
              <th style={{ padding: 8 }}>Période</th>
              <th style={{ padding: 8, textAlign: 'right' }}>Index</th>
              <th style={{ padding: 8, textAlign: 'right' }}>Conso (kWh)</th>
              <th style={{ padding: 8, textAlign: 'right' }}>Qté Rano (u)</th>
              <th style={{ padding: 8, textAlign: 'right' }}>CU Jiro (Ar/kWh)</th>
              <th style={{ padding: 8, textAlign: 'right' }}>Part Jiro (Ar)</th>
              <th style={{ padding: 8, textAlign: 'right' }}>CU Rano (Ar/u)</th>
              <th style={{ padding: 8, textAlign: 'right' }}>Part Rano (Ar)</th>
              <th style={{ padding: 8, textAlign: 'right' }}>Total (Ar)</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((l, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: 10, fontWeight: 600 }}>
                  {moisFrancais[l.mois]} {l.annee}
                </td>
                <td style={{ padding: 10, textAlign: 'right' }}>{fmt(l.index_total)}</td>
                <td style={{ padding: 10, textAlign: 'right' }}>{fmt(l.consommation)}</td>
                <td style={{ padding: 10, textAlign: 'right' }}>{l.quantite_rano}</td>
                <td style={{ padding: 10, textAlign: 'right' }}>{fmt(l.cout_unitaire_jiro)}</td>
                <td style={{ padding: 10, textAlign: 'right' }}>{fmt(l.part_jiro)}</td>
                <td style={{ padding: 10, textAlign: 'right' }}>{fmt(l.cout_unitaire_rano)}</td>
                <td style={{ padding: 10, textAlign: 'right' }}>{fmt(l.part_rano)}</td>
                <td style={{ padding: 10, textAlign: 'right', fontWeight: 600 }}>
                  {fmt(l.total_individuel)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}