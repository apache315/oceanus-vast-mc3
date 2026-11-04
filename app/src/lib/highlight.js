// Splits a text into plain and matching pieces, so the reader can bold the words of the selected theme
// without building HTML from message text.
export function highlightText(text, regexes) {
  if (!regexes.length) return [{ text, hit: false }]
  const re = new RegExp(regexes.map((r) => `(?:${r.source})`).join('|'), 'gi')
  const parts = []
  let last = 0
  for (const m of text.matchAll(re)) {
    if (!m[0]) continue
    if (m.index > last) parts.push({ text: text.slice(last, m.index), hit: false })
    parts.push({ text: m[0], hit: true })
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push({ text: text.slice(last), hit: false })
  return parts
}
