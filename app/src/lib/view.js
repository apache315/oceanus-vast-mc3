// Filters shared by every page: groups, period and theme filter the messages (design v4 §2).
import { dayKey } from './select.js'

const WEEKS = {
  W1: ['2040-10-01T00:00', '2040-10-08T00:00'],
  W2: ['2040-10-08T00:00', '2040-10-15T00:00'],
}

// period: 'all' | 'W1' | 'W2' | 'YYYY-MM-DD'
export function periodRange(period) {
  if (!period || period === 'all') return null
  if (WEEKS[period]) return WEEKS[period].map((t) => new Date(t))
  const start = new Date(`${period}T00:00`)
  return [start, new Date(start.getTime() + 864e5)]
}

export function visibleMessages(messages, actorById, sel) {
  const groups = new Set(sel.groups)
  const inGroup = (id) => groups.has(actorById[id]?.group ?? 'Altri')
  const range = periodRange(sel.period)
  return messages.filter(
    (m) =>
      (inGroup(m.from) || inGroup(m.to)) &&
      (!range || (m.t >= range[0] && m.t < range[1])) &&
      (!sel.theme || m.themes?.includes(sel.theme)),
  )
}

export const countLabel = (n, total) => `${n} messaggi su ${total}`

export { dayKey }
