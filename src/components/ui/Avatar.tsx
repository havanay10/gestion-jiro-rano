type AvatarProps = {
  nom: string
  taille?: 'sm' | 'md' | 'lg'
  variante?: 'defaut' | 'jiro' | 'rano' | 'neutre'
}

function initiales(nom: string): string {
  return nom
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('')
}

export function Avatar({ nom, taille = 'md', variante = 'defaut' }: AvatarProps) {
  let classe = 'avatar'
  if (taille === 'sm') classe += ' avatar-sm'
  if (taille === 'lg') classe += ' avatar-lg'
  if (variante === 'jiro') classe += ' avatar-jiro'
  if (variante === 'rano') classe += ' avatar-rano'
  if (variante === 'neutre') classe += ' avatar-neutre'
  return <div className={classe}>{initiales(nom)}</div>
}