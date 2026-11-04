// Selection rules shared by every view (design §5):
// groups and time FILTER the messages; actor, slot, theme and message only HIGHLIGHT them.
import { timeFormat } from 'd3'

export const dayKey = timeFormat('%Y-%m-%d')

export function filterMessages(messages, actorById, sel) {
  const visible = new Set(sel.groups)
  const inGroup = (id) => visible.has(actorById[id]?.group ?? 'Altri')
  return messages.filter(
    (m) =>
      (inGroup(m.from) || inGroup(m.to)) &&
      (!sel.time || (m.t >= sel.time[0] && m.t < sel.time[1])),
  )
}

export function hasHighlight(sel) {
  return Boolean(sel.actor || sel.slot || sel.theme || sel.message)
}

export function isHighlighted(m, sel) {
  if (sel.actor && m.from !== sel.actor && m.to !== sel.actor) return false
  if (sel.slot && (dayKey(m.t) !== sel.slot.day || m.t.getHours() !== sel.slot.hour)) return false
  if (sel.theme && !m.themes?.includes(sel.theme)) return false
  if (sel.message && m.id !== sel.message) return false
  return true
}
