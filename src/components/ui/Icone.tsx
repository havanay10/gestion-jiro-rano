import type { ReactNode, SVGProps } from 'react'

export type NomIcone =
  | 'electricite' | 'eau' | 'personnes' | 'saisie' | 'export' | 'vide'
  | 'accueil' | 'espace'
  | 'info' | 'balance' | 'mail' | 'cadenas' | 'oeil' | 'oeilMasque'
  | 'succes' | 'avertissement' | 'erreur' | 'ajouter'

const chemins: Record<NomIcone, ReactNode> = {
  accueil: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z" /><path d="M8 5.8V4h3" /></>,
  espace: <><circle cx="12" cy="8" r="3.5" /><path d="M4.5 21v-1.5a7.5 7.5 0 0 1 15 0V21Z" /></>,
  electricite: <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />,
  eau: <path d="M12 3s-6 7-6 11a6 6 0 0 0 12 0c0-4-6-11-6-11Z" />,
  personnes: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-1a6 6 0 0 1 12 0v1M16 5.5a3 3 0 0 1 0 5.8M18 14a5 5 0 0 1 3 4.5V20" /></>,
  saisie: <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z" /><path d="M14 3v6h6M8 13h8M8 17h8" /></>,
  export: <><path d="M12 3v12m-5-5 5 5 5-5" /><path d="M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" /></>,
  vide: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h4" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5m0-8h.01" /></>,
  balance: <><path d="M12 3v18m-7-15h14M7 6l-4 7h8L7 6Zm10 0-4 7h8l-4-7ZM5 21h14" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
  cadenas: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2" /></>,
  oeil: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>,
  oeilMasque: <><path d="m3 3 18 18M10.6 5.2A10 10 0 0 1 12 5c6.5 0 10 7 10 7a15 15 0 0 1-3 3.8M6.2 6.2C3.5 8 2 12 2 12s3.5 7 10 7a10 10 0 0 0 3-.5" /></>,
  succes: <path d="m5 12 4 4L19 6" />,
  avertissement: <><path d="m10.3 3.9-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.1l-8-14a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4m0 4h.01" /></>,
  erreur: <><circle cx="12" cy="12" r="9" /><path d="m9 9 6 6m0-6-6 6" /></>,
  ajouter: <path d="M12 5v14m-7-7h14" />,
}

type IconeProps = SVGProps<SVGSVGElement> & { nom: NomIcone }

export function Icone({ nom, ...props }: IconeProps) {
  return <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>{chemins[nom]}</svg>
}
