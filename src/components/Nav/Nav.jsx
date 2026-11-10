import { useEffect, useRef, useState } from 'react'
import Icon from '../Icon/Icon.jsx'
import { scrollToSection } from './scrollToSection.js'
import styles from './Nav.module.css'

const LIST_ID = 'primary-nav-list'

/**
 * Primary navigation. One list of section links:
 * - >= 768px: shown inline in the header;
 * - < 768px: hidden behind a "Menu" disclosure button (not a modal: no focus
 *   trap). Esc closes and returns focus to the button; clicking a link or
 *   anywhere outside closes it.
 */
export default function Nav({ sections, activeId }) {
  const [open, setOpen] = useState(false)
  const navRef = useRef(null)
  const buttonRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined

    function onKeyDown(event) {
      if (event.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    function onPointerDown(event) {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [open])

  function handleLinkClick(event, id) {
    setOpen(false)
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    if (scrollToSection(id)) event.preventDefault()
  }

  if (!sections || sections.length === 0) return null

  return (
    <nav aria-label="Primary" className={styles.nav} ref={navRef} data-print="hide">
      <button
        ref={buttonRef}
        type="button"
        className={styles.menuButton}
        aria-expanded={open}
        aria-controls={LIST_ID}
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name={open ? 'close' : 'menu'} />
        <span>Menu</span>
      </button>

      <ul id={LIST_ID} className={open ? `${styles.list} ${styles.open}` : styles.list}>
        {sections.map((section) => {
          const isActive = section.id === activeId
          return (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className={styles.link}
                aria-current={isActive ? 'location' : undefined}
                onClick={(event) => handleLinkClick(event, section.id)}
              >
                {section.label}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
