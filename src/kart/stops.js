/**
 * Kart stops (SPEC-v5 7): the kart.json stops in race order, each with its site link.
 * Pure: pass getKart() and getSectionHref from lib/content/index.js.
 * @param {import('../lib/content/types.js').Kart|null} kart
 * @param {(sectionId: string) => string|null} sectionHref
 * @returns {{ id: string, label: string, text: string, href: string|null }[]}
 */
export function buildStops(kart, sectionHref) {
  return (kart?.stops ?? []).map(({ id, label, text, ref }) => ({ id, label, text, href: sectionHref(ref) }))
}
