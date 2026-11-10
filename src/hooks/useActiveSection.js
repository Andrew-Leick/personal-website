import { useEffect, useState } from 'react'

/**
 * Returns the id of the section currently in view, or null (e.g. while the
 * hero is on screen). Uses IntersectionObserver only; no scroll listeners.
 *
 * A section counts as "in view" while it crosses a band just below the sticky
 * header (the top ~40% of the viewport). When several do, the last one in
 * document order wins, which matches the section whose heading was most
 * recently scrolled past.
 */
export default function useActiveSection(ids) {
  const [active, setActive] = useState(null)
  const key = ids.join('|')

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined
    const elements = key
      .split('|')
      .filter(Boolean)
      .map((id) => document.getElementById(id))
      .filter(Boolean)
    if (elements.length === 0) return undefined

    const headerHeight =
      document.querySelector('header')?.getBoundingClientRect().height ?? 0
    const visible = new Set()

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id)
          else visible.delete(entry.target.id)
        }
        let current = null
        for (const el of elements) {
          if (visible.has(el.id)) current = el.id
        }
        setActive(current)
      },
      {
        rootMargin: `-${Math.round(headerHeight) + 1}px 0px -60% 0px`,
        threshold: 0,
      },
    )

    elements.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [key])

  return active
}
