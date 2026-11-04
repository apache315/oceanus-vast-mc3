// One shared state for the four pages (design v4 §2, §4).
import { reactive } from 'vue'
import { resolveName } from './lib/identity.js'
import { GROUPS } from './lib/palette.js'

const filters = () => ({ groups: [...GROUPS], period: 'all', theme: null })

const initial = () => ({
  ...filters(),
  actor: null,
  message: null,
  edgeType: 'messaggi', // page 2: messaggi | menzioni | relazioni
  alias: 'Boss', // page 3: alias under examination
  candidate: 'Nadia Conti',
  identities: { corrected: true, merges: {} }, // page 3: real senders from the text + alias hypotheses, applied to every page
  panel: null, // { title, ids } shown in the message panel
})

export const selection = reactive(initial())

export function resetSelection() {
  Object.assign(selection, initial())
}

export function resetFilters() {
  Object.assign(selection, filters())
}

// Toggle: selecting the current value again clears it.
export function toggle(key, value) {
  selection[key] = selection[key] === value ? null : value
}

export function openPanel(title, ids) {
  selection.panel = { title, ids }
}

export function closePanel() {
  selection.panel = null
}

// Opening the app with a state already applied (report screenshots, shareable links), e.g.
// #/ritmi?actor=Remora&period=W1&theme=permessi&groups=Alias&edge=relazioni&alias=Boss&cand=Nadia%20Conti&raw=1&merge=Boss:Nadia%20Conti
export function applyQuery(q) {
  if (q.actor) selection.actor = q.actor
  if (q.period) selection.period = q.period
  if (q.theme) selection.theme = q.theme
  if (q.groups) selection.groups = q.groups.split(',')
  if (q.edge) selection.edgeType = q.edge
  if (q.alias) selection.alias = q.alias
  if (q.cand) selection.candidate = q.cand
  if (q.raw === '1' || q.merge) {
    const merges = Object.fromEntries((q.merge ? q.merge.split(',') : []).map((p) => p.split(':')))
    setIdentities({ corrected: q.raw !== '1', merges })
  }
}

// Changing the identities (page 3) also moves the selected actor to its real identity.
export function setIdentities(identities) {
  selection.identities = identities
  selection.actor = resolveName(selection.actor, identities)
}
