// Who really sent each message, and which names belong to the same person (page 3), applied to every page.
// from/to are corrected with the opening formula of the text ("Davis, Mako here" = Mako writes to Davis);
// radioFrom/radioTo are the radio metadata, which often record the recipient as the sender.

const kindOf = (m) => (m.radioFrom === m.radioTo ? 'auto-anello' : m.radioFrom === m.to ? 'scambio' : 'altro')

// Messages whose registered sender is not the real one, grouped by (registered → real). The messages that are neither
// a swap nor a self-loop (kind "altro") get a pair of their own, marked check: they are the clues, not radio errors.
export function attributionPairs(messages) {
  const pairs = new Map()
  for (const m of messages) {
    if (m.radioFrom === m.from) continue
    const check = kindOf(m) === 'altro'
    const key = `${m.radioFrom}|${m.from}|${check}`
    if (!pairs.has(key)) {
      pairs.set(key, { radioFrom: m.radioFrom, from: m.from, check, n: 0, ids: [], kinds: { scambio: 0, 'auto-anello': 0, altro: 0 } })
    }
    const p = pairs.get(key)
    p.n += 1
    p.ids.push(m.id)
    p.kinds[kindOf(m)] += 1
  }
  return [...pairs.values()].sort((a, b) => b.n - a.n || a.radioFrom.localeCompare(b.radioFrom))
}

// What the two switches of page 3 do, counted on the exported messages (independent of the current state):
// messages whose sender or receiver is read from the text, how many of them the radio records as sent to oneself,
// and for each alias hypothesis the messages of or to the alias.
export function identityEffects(messages, identities) {
  const fixed = messages.filter((m) => m.radioFrom !== m.from || m.radioTo !== m.to)
  const wrongSender = fixed.filter((m) => m.radioFrom !== m.from).length
  return {
    corrected: fixed.length,
    wrongSender,
    wrongReceiver: fixed.length - wrongSender,
    selfLoops: fixed.filter((m) => m.radioFrom === m.radioTo).length,
    merges: Object.entries(identities.merges ?? {}).map(([alias, who]) => ({
      alias, who, n: messages.filter((m) => m.from === alias || m.to === alias).length,
    })),
  }
}

export function resolveName(name, identities) {
  return name == null ? name : identities.merges?.[name] ?? name
}

// identities = { corrected: boolean (use the text, not the radio metadata), merges: { alias: identity } }
export function applyIdentities(messages, identities) {
  const merges = Object.keys(identities.merges ?? {}).length
  if (identities.corrected && !merges) return messages
  return messages.map((m) => {
    const from = resolveName(identities.corrected ? m.from : m.radioFrom, identities)
    const to = resolveName(identities.corrected ? m.to : m.radioTo, identities)
    if (from === m.from && to === m.to) return m
    return { ...m, from, to, changed: true, selfLoop: from === to }
  })
}
