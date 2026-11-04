// Loads the precomputed JSON once (scripts/export_app_data.py).
import { shallowRef } from 'vue'

const FILES = ['actors', 'messages', 'message_events', 'relations', 'mentions', 'layout', 'actions', 'meta']

export const data = shallowRef(null)
let pending = null

export function loadData() {
  pending ??= Promise.all(
    FILES.map((f) => fetch(`${import.meta.env.BASE_URL}data/${f}.json`).then((r) => r.json())),
  ).then(([actors, messages, messageEvents, relations, mentions, layout, actions, meta]) => {
    messages.forEach((m) => (m.t = new Date(m.t)))
    const actorById = Object.fromEntries(actors.map((a) => [a.id, a]))
    const messageById = Object.fromEntries(messages.map((m) => [m.id, m]))
    data.value = { actors, actorById, messages, messageById, messageEvents, relations, mentions, layout, actions, meta }
    return data.value
  })
  return pending
}
