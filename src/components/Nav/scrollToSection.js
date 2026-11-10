/**
 * Scrolls to a page section, updates the URL hash and moves focus to the
 * section heading (`#{id}-heading`, which has tabindex="-1").
 * Smooth scrolling only when the visitor has not asked for reduced motion.
 * Returns false if the section is not on the page (caller keeps default).
 */
export function scrollToSection(id) {
  const section = document.getElementById(id)
  if (!section) return false

  let reduce = false
  try {
    reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    reduce = false
  }

  section.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  if (window.location.hash !== `#${id}`) {
    window.history.pushState(null, '', `#${id}`)
  }
  const heading = document.getElementById(`${id}-heading`)
  if (heading) heading.focus({ preventScroll: true })
  return true
}
