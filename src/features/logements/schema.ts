import { z } from 'zod'

export const logementSchema = z.object({
  nom_code: z
    .string()
    .trim()
    .min(1, 'Le nom ou code est obligatoire.')
    .max(80, 'Maximum 80 caractères.'),
  localisation: z
    .string()
    .trim()
    .max(120, 'Maximum 120 caractères.')
    .optional()
    .or(z.literal('')),
})

export type LogementFormValues = z.infer<typeof logementSchema>