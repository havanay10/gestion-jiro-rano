import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export type Logement = {
  id: string
  nom_code: string
  localisation: string | null
  created_at: string
}

type Etat = {
  logements: Logement[]
  loading: boolean
  erreur: string | null
}

export function useLogements() {
  const [etat, setEtat] = useState<Etat>({
    logements: [],
    loading: true,
    erreur: null,
  })

  const charger = useCallback(async () => {
    setEtat((e) => ({ ...e, loading: true, erreur: null }))
    const { data, error } = await supabase
      .from('logements')
      .select('id, nom_code, localisation, created_at')
      .order('nom_code', { ascending: true })

    if (error) {
      setEtat({ logements: [], loading: false, erreur: error.message })
      return
    }
    setEtat({ logements: data ?? [], loading: false, erreur: null })
  }, [])

  useEffect(() => {
    charger()
  }, [charger])

  async function creerLogement(input: {
    nom_code: string
    localisation?: string | null
  }) {
    const { error } = await supabase.from('logements').insert({
      nom_code: input.nom_code,
      localisation: input.localisation?.trim() || null,
    })
    if (error) throw new Error(error.message)
    await charger()
  }

  async function modifierLogement(
    id: string,
    input: { nom_code: string; localisation?: string | null }
  ) {
    const { error } = await supabase
      .from('logements')
      .update({
        nom_code: input.nom_code,
        localisation: input.localisation?.trim() || null,
      })
      .eq('id', id)
    if (error) throw new Error(error.message)
    await charger()
  }

  return { ...etat, recharger: charger, creerLogement, modifierLogement }
}