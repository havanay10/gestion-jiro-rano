import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'

/* ---------- Champ simple ---------- */

type FieldProps = {
  label: ReactNode
  requis?: boolean
  erreur?: string
  aide?: ReactNode
  htmlFor?: string
  children: ReactNode
}

export function Field({ label, requis, erreur, aide, htmlFor, children }: FieldProps) {
  return (
    <div className="champ">
      <label className="champ-label" htmlFor={htmlFor}>
        {label}
        {requis && <span className="champ-requis">*</span>}
      </label>
      {children}
      {erreur && <span className="champ-erreur">{erreur}</span>}
      {!erreur && aide && <span className="champ-aide">{aide}</span>}
    </div>
  )
}

/* ---------- Input stylé ---------- */

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  erreur?: boolean
  iconeGauche?: ReactNode
  suffixe?: ReactNode
}

export function Input({ erreur, iconeGauche, suffixe, className = '', ...rest }: InputProps) {
  let classe = 'champ-saisie'
  if (erreur) classe += ' champ-saisie-erreur'
  if (className) classe += ' ' + className

  if (iconeGauche) {
    return (
      <div className="champ-icone">
        <span className="champ-icone-gauche">{iconeGauche}</span>
        <input className={classe} {...rest} />
      </div>
    )
  }

  if (suffixe) {
    return (
      <div className="champ-groupe">
        <input className={classe} {...rest} />
        <span className="champ-suffixe">{suffixe}</span>
      </div>
    )
  }

  return <input className={classe} {...rest} />
}

/* ---------- Select stylé ---------- */

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  erreur?: boolean
}

export function Select({ erreur, className = '', children, ...rest }: SelectProps) {
  let classe = 'champ-select'
  if (erreur) classe += ' champ-saisie-erreur'
  if (className) classe += ' ' + className
  return (
    <select className={classe} {...rest}>
      {children}
    </select>
  )
}