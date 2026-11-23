import { useEffect, useRef } from 'react'

/** ↑ ↑ ↓ ↓ ← → ← → B A, as `KeyboardEvent.key` values (letters compared lowercase). */
export const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']

/** Keys typed into these don't count: someone typing "ba" in a field shouldn't flip the theme. */
const EDITABLE = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])'

/**
 * Calls `onCode` each time the Konami code is typed anywhere on the page (SPEC-v6 P-11). A wrong key
 * starts over, except that an extra ↑ keeps the ↑ ↑ already typed, so "↑ ↑ ↑ ↓ ↓ …" still counts.
 */
export default function useKonami(onCode) {
  const callback = useRef(onCode)
  useEffect(() => {
    callback.current = onCode
  })

  useEffect(() => {
    let step = 0
    function onKeyDown(event) {
      if (event.target?.closest?.(EDITABLE) || event.ctrlKey || event.metaKey || event.altKey) return
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key
      if (key === KONAMI[step]) {
        step += 1
        if (step === KONAMI.length) {
          step = 0
          callback.current()
        }
      } else if (key === 'ArrowUp') {
        step = step === 2 ? 2 : 1
      } else {
        step = 0
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
