// Chart titles that state the conclusion (course rule: the title says what to see), computed from the data shown,
// so they stay true when filters, the chosen actor or the alias hypotheses change.
import * as d3 from 'd3'
import { GROUPS } from './palette.js'

const and = (a, b) => `${a} ${/^[eE]/.test(b) ? 'ed' : 'e'} ${b}`
const theDay = (d) => `${[1, 8, 11].includes(d) ? "l'" : 'il '}${d} ottobre`
const week = (t) => (t.getDate() < 8 ? 'w1' : 'w2')
const GROUP_SUBJECT = {
  Alias: 'gli alias', Investigatori: 'gli investigatori', 'Controllo e istituzioni': 'il gruppo Controllo',
  'Operazione Nemo Reef': "l'Operazione Nemo Reef",
}
const GROUP_OBJECT = { ...GROUP_SUBJECT, Altri: 'gli altri' }

export function calendarTitle(messages, keyDates = []) {
  if (!messages.length) return 'Nessun messaggio con questi filtri'
  const [day, n] = d3.greatest(d3.rollups(messages, (v) => v.length, (m) => m.t.getDate()), (d) => d[1])
  const key = keyDates.find((k) => new Date(k.t).getDate() === day)
  return `Il giorno più fitto è ${theDay(day)} (${n} messaggi)${key ? `: ${key.label}` : ''}`
}

export function weekTitle(messages, topics) {
  const delta = topics.map((t) => {
    const c = { w1: 0, w2: 0 }
    messages.forEach((m) => m.themes?.includes(t) && c[week(m.t)]++)
    return { t, d: c.w2 - c.w1 }
  })
  const up = delta.filter((x) => x.d > 0).sort((a, b) => b.d - a.d).slice(0, 2).map((x) => x.t)
  const down = delta.filter((x) => x.d < 0).sort((a, b) => a.d - b.d).slice(0, 2).map((x) => x.t)
  const list = (v) => (v.length === 2 ? and(v[0], v[1]) : v[0])
  if (!up.length && !down.length) return 'Tra settimana 1 e 2 i temi non cambiano'
  return `Nella settimana 2 ${[up.length && `crescono ${list(up)}`, down.length && `calano ${list(down)}`].filter(Boolean).join(', ')}`
}

export function influenceTitle(focus, chains) {
  const by = d3.rollups(chains.filter((c) => c.b === focus), (v) => v.length, (c) => c.a)
  if (!by.length) return `Nessuno attiva ${focus} entro 15 minuti`
  const [who, n] = by.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]
  return `${who} è chi attiva più spesso ${focus} (${n} ${n === 1 ? 'volta' : 'volte'})`
}

export function relationsTitle(focus, relations) {
  const rel = relations.filter((r) => r.source === focus || r.target === focus)
  if (!rel.length) return `Il grafo non registra relazioni con ${focus}`
  const weak = rel.filter((r) => r.support.length <= 1).length
  return `Il grafo registra ${rel.length} relazioni con ${focus}, ${weak} basate su un solo messaggio`
}

export function aliasTalkTitle(messages, actorById) {
  const group = (id) => actorById[id]?.group ?? 'Altri'
  const other = messages.filter((m) => group(m.from) === 'Alias' || group(m.to) === 'Alias')
    .map((m) => (group(m.from) === 'Alias' ? group(m.to) : group(m.from)))
  if (!other.length) return 'Chi parla con chi'
  const [g, n] = d3.greatest(d3.rollups(other, (v) => v.length, (x) => x), (d) => d[1])
  return `Gli alias parlano soprattutto ${g === 'Alias' ? 'tra loro' : `con ${GROUP_OBJECT[g]}`} (${Math.round((100 * n) / other.length)}% dei loro messaggi)`
}

// for each group, the theme where its share exceeds most the mean of the other groups; the two clearest groups
export function groupThemeTitle(messages, actorById, topics) {
  const groups = GROUPS.filter((g) => g !== 'Altri' && messages.some((m) => actorById[m.from]?.group === g))
  const share = (g, t) => {
    const sent = messages.filter((m) => actorById[m.from]?.group === g)
    return sent.length ? sent.filter((m) => m.themes?.includes(t)).length / sent.length : 0
  }
  const best = groups.map((g) => {
    const scored = topics.map((t) => ({ t, gap: share(g, t) - d3.mean(groups.filter((o) => o !== g), (o) => share(o, t)) }))
    return { g, ...d3.greatest(scored, (s) => s.gap) }
  }).filter((b) => b.gap > 0).sort((a, b) => b.gap - a.gap).slice(0, 2)
  if (!best.length || groups.length < 2) return 'Di cosa parla ogni gruppo'
  const [a, b] = best
  const subj = (g) => GROUP_SUBJECT[g] ?? g
  const verb = (g) => (subj(g).startsWith('gli ') ? 'parlano' : 'parla')
  const first = `${subj(a.g)[0].toUpperCase()}${subj(a.g).slice(1)} ${verb(a.g)} più degli altri di ${a.t}`
  return b ? `${first}; ${subj(b.g)} ${verb(b.g)} più di ${b.t}` : first
}

export function attributionTitle(n, recipient) {
  const clues = n - recipient
  return `${recipient} firme diverse su ${n} sono errori della radio, non pseudonimi; ${clues} ${clues === 1 ? 'è un indizio' : 'sono indizi'}`
}

export function actionsTitle(actor, marks) {
  const own = marks.filter((a) => !a.viaAlias)
  if (!own.length) return `${actor}: nessuna azione codificata, solo i messaggi`
  const contra = own.filter((a) => a.action === 'prova contraria').length
  return `${actor}: ${own.length - contra} azioni sospette lette nei messaggi, ${contra} ${contra === 1 ? 'prova contraria' : 'prove contrarie'}`
}

export function whoWithTitle(marks, relations, actor) {
  const people = [...new Set(marks.filter((a) => a.action !== 'prova contraria' && !a.viaAlias).map((a) => a.con))]
  if (!people.length) return 'Con chi'
  const linked = (p) => relations.some((r) => (r.source === actor && r.target === p) || (r.target === actor && r.source === p))
  const none = people.filter((p) => !linked(p)).length
  return none ? `Con ${none} delle ${people.length} persone con cui agisce, il grafo non registra nessuna relazione`
    : `Il grafo registra una relazione con tutte le ${people.length} persone con cui agisce`
}
