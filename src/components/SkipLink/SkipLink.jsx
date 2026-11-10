import styles from './SkipLink.module.css'

/** First focusable element on the page. Moves focus to <main id="main">. */
export default function SkipLink() {
  function handleClick(event) {
    const main = document.getElementById('main')
    if (!main) return
    event.preventDefault()
    main.focus()
    if (window.location.hash !== '#main') {
      window.history.pushState(null, '', '#main')
    }
  }

  return (
    <a className={styles.skip} href="#main" onClick={handleClick} data-print="hide">
      Skip to content
    </a>
  )
}
