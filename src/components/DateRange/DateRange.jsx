const DATE_RE = /^\d{4}(-\d{2})?$/
const SEPARATOR = ' – '

function Part({ text, date }) {
  if (date && DATE_RE.test(date)) return <time dateTime={date}>{text}</time>
  return text
}

/** Like Part, but keeps an "Expected " prefix outside the <time> element. */
function EndPart({ text, date }) {
  const prefix = text.startsWith('Expected ') ? 'Expected ' : ''
  return (
    <>
      {prefix}
      <Part text={text.slice(prefix.length)} date={date} />
    </>
  )
}

/**
 * Renders a backend-formatted date label (e.g. "Jun 2025 – Present" or
 * "Sep 2023 – Expected Jun 2027") and wraps each real date in <time datetime>.
 * The label text itself is never re-formatted here.
 */
export default function DateRange({ label, start, end, className }) {
  if (!label) return null
  const parts = label.split(SEPARATOR)
  if (parts.length === 1) {
    // One date only: either start === end, or start is missing (e.g. "Expected Jun 2028").
    const date = start && DATE_RE.test(start) ? start : end
    return (
      <span className={className}>
        <EndPart text={parts[0]} date={date} />
      </span>
    )
  }
  return (
    <span className={className}>
      <Part text={parts[0]} date={start} />
      {SEPARATOR}
      <EndPart text={parts.slice(1).join(SEPARATOR)} date={end} />
    </span>
  )
}
