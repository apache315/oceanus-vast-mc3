// "A activates X": A writes to X and, within the window, X writes to someone other than A (first such message).
// Computed in the browser on the effective messages, so the unification of page 3 changes it.
export function chainsFor(x, messages, windowMin = 15) {
  const win = windowMin * 60000
  const sorted = [...messages].sort((a, b) => a.t - b.t)
  const out = []
  for (const m1 of sorted) {
    if (m1.to !== x && m1.from !== x) continue
    const b = m1.to
    const m2 = sorted.find((m) => m.t > m1.t && m.t - m1.t <= win && m.from === b && m.to !== m1.from)
    if (m2 && (b === x || m1.from === x)) out.push({ a: m1.from, b, c: m2.to, m1: m1.id, m2: m2.id })
  }
  return out
}
