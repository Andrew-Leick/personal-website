/** Icon name for a link `kind` from the content API. */
export function iconForLinkKind(kind) {
  if (kind === 'github') return 'github'
  if (kind === 'linkedin') return 'linkedin'
  if (kind === 'email') return 'mail'
  return 'external'
}
