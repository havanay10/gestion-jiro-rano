import { z } from 'zod'

export const personneSchema = z.object({
  nom: z
    .string()
    .trim()
    .min(1, 'Le nom est obligatoire.')
    .max(100, 'Maximum 100 caractères.'),
  periode_depart_annee: z
    .string()
    .regex(/^\d{4}$/, 'Année invalide (4 chiffres, ex. 2026).'),
  periode_depart_mois: z
    .string()
    .regex(/^(0?[1-9]|1[0-2])$/, 'Mois invalide (1 à 12).'),
  index_initial: z
    .string()
    .regex(/^\d+(\.\d+)?$/, 'Index invalide (nombre positif).'),
  logement_id: z.string().nullable().optional(),
})

export type PersonneFormValues = z.infer<typeof personneSchema>