// Who really sent the message? (page 3, original view) Left: the sender recorded by the radio. Right: the sender
// read in the opening formula of the text ("Davis, Mako here" = Mako writes to Davis). One ribbon per pair,
// width = messages. Dark = a metadata error (the radio recorded the recipient as sender, or a self-loop);
// yellow = a different name for other reasons, to be checked by the analyst. The right names follow the mean position
// of their registered senders (barycentre), so the ribbons cross less; the ribbon under the mouse comes forward.
import * as d3 from 'd3'
import { DIM, groupColor } from '../lib/palette.js'
import { hideTip, showTip } from '../lib/tooltip.js'

export const RIBBON = { errore: '#4d4d4d', 'da verificare': '#c9a227' }
export const ribbonType = (p) => (p.check || p.kinds.altro > p.n / 2 ? 'da verificare' : 'errore')

// crossings between ribbons, weighted by their messages (a crossing of two thick ribbons costs more)
export function weightedCrossings(pairs, leftIndex, rightIndex) {
  let c = 0
  for (const a of pairs) for (const b of pairs) {
    if (leftIndex(a.radioFrom) < leftIndex(b.radioFrom) && rightIndex(a.from) > rightIndex(b.from)) c += a.n * b.n
  }
  return c
}

// after the barycentre, swap neighbours on the right while that removes crossings
function untangle(right, pairs, yl) {
  let order = right
  const cost = (o) => weightedCrossings(pairs, yl, (id) => o.findIndex((d) => d.id === id))
  for (let improved = true; improved;) {
    improved = false
    for (let i = 0; i < order.length - 1; i++) {
      const t = [...order]
      ;[t[i], t[i + 1]] = [t[i + 1], t[i]]
      if (cost(t) < cost(order)) {
        order = t
        improved = true
      }
    }
  }
  return order
}

export default function Attribution() {
  let width = 520
  let height = 400
  let actorById = {}
  let relations = []
  let highlight = null // a name: its ribbons stay strong, the others fade
  const margin = { top: 30, right: 150, bottom: 44, left: 150 } // bottom: the explanation of the clues
  const dispatch = d3.dispatch('pair', 'name')

  function chart(selection) {
    selection.each(function (pairs) {
      const svg = d3.select(this).selectAll('svg').data([null]).join('svg').attr('class', 'chart')
        .attr('width', width).attr('height', height)
      const g = svg.selectAll('g.plot').data([null]).join('g').attr('class', 'plot')
        .attr('transform', `translate(${margin.left},${margin.top})`)
      const innerW = width - margin.left - margin.right
      const innerH = height - margin.top - margin.bottom

      const side = (key) => d3.rollups(pairs, (v) => d3.sum(v, (p) => p.n), (p) => p[key])
        .sort((a, b) => b[1] - a[1]).map(([id, n]) => ({ id, n }))
      const left = side('radioFrom')
      const yl = d3.scalePoint().domain(left.map((d) => d.id)).range([0, innerH]).padding(0.5)
      const bary = (id) => {
        const ps = pairs.filter((p) => p.from === id)
        return d3.sum(ps, (p) => p.n * yl(p.radioFrom)) / d3.sum(ps, (p) => p.n)
      }
      const right = untangle(side('from').sort((a, b) => bary(a.id) - bary(b.id) || b.n - a.n), pairs, yl)
      const yr = d3.scalePoint().domain(right.map((d) => d.id)).range([0, innerH]).padding(0.5)
      const w = d3.scaleSqrt().domain([1, d3.max(pairs, (p) => p.n) || 1]).range([1.5, 14])
      const on = (p) => !highlight || p.radioFrom === highlight || p.from === highlight
      const opacity = (p, hover) => (!on(p) ? DIM : !hover ? 0.45 : p === hover ? 0.9 : 0.1)
      const link = d3.linkHorizontal().x((d) => d[0]).y((d) => d[1])
      const describe = (p) => [
        p.kinds.scambio && `${p.kinds.scambio} con mittente e destinatario scambiati`,
        p.kinds['auto-anello'] && `${p.kinds['auto-anello']} registrati come messaggio a sé stesso`,
        p.kinds.altro && `${p.kinds.altro} con un nome diverso: da verificare`,
      ].filter(Boolean).join(' · ')

      svg.selectAll('text.head').data([['mittente registrato dalla radio', margin.left], ['mittente vero (dal testo)', margin.left + innerW]])
        .join('text').attr('class', 'head').attr('x', (d) => d[1]).attr('y', 14).attr('text-anchor', 'middle')
        .attr('font-size', 11).attr('font-weight', 600).attr('fill', '#555').text((d) => d[0])

      g.selectAll('path.ribbon').data(pairs, (p) => `${p.radioFrom}|${p.from}|${p.check}`).join('path').attr('class', 'ribbon')
        .attr('d', (p) => link({ source: [0, yl(p.radioFrom)], target: [innerW, yr(p.from)] }))
        .attr('fill', 'none').attr('stroke', (p) => RIBBON[ribbonType(p)]).attr('stroke-width', (p) => (p.check ? Math.max(3, w(p.n)) : w(p.n)))
        .attr('stroke-opacity', (p) => (p.check && on(p) ? 0.95 : opacity(p))).style('cursor', 'pointer')
        .on('click', (event, p) => dispatch.call('pair', null, p))
        .on('mouseenter', function (event, p) {
          d3.select(this).raise()
          g.selectAll('path.ribbon').attr('stroke-opacity', (q) => (q.check && q !== p && !p.check ? 0.5 : opacity(q, p)))
        })
        .on('mousemove', (event, p) => showTip(event, [`registrato: ${p.radioFrom} · vero: ${p.from}`, `${p.n} messaggi`, describe(p), 'clic: leggi i messaggi']))
        .on('mouseleave', () => {
          hideTip()
          g.selectAll('path.ribbon').attr('stroke-opacity', (q) => (q.check && on(q) ? 0.95 : opacity(q)))
        })

      // the clues (not a radio error) on top: a numbered badge on the ribbon (the midpoint of a horizontal link is
      // the middle of its ends), the explanation under the chart, away from the ribbons
      g.selectAll('path.ribbon').filter((p) => p.check).raise()
      const operates = (a, b) => relations.some((r) => r.type === 'Operates' && r.source === a && r.target === b)
      const clues = pairs.filter((p) => p.check).map((p, i) => ({
        ...p, k: i + 1,
        text: operates(p.radioFrom, p.from) ? `${p.radioFrom} opera la barca ${p.from}: è il capitano, non uno pseudonimo`
          : `la radio di ${p.radioFrom} trasmette un messaggio firmato ${p.from}: stessa persona?`,
      }))
      const badge = g.selectAll('g.badge').data(clues, (c) => `${c.radioFrom}|${c.from}`).join((enter) => {
        const b = enter.append('g').attr('class', 'badge').style('cursor', 'pointer')
        b.append('circle').attr('r', 8).attr('fill', RIBBON['da verificare']).attr('stroke', '#fff').attr('stroke-width', 1.5)
        b.append('text').attr('text-anchor', 'middle').attr('dy', '0.35em').attr('font-size', 10.5).attr('font-weight', 700).attr('fill', '#fff')
        return b
      })
      badge.attr('transform', (c) => `translate(${innerW / 2},${(yl(c.radioFrom) + yr(c.from)) / 2})`)
        .on('click', (event, c) => dispatch.call('pair', null, c))
      badge.select('text').text((c) => c.k)
      svg.selectAll('text.clue').data(clues, (c) => c.k).join('text').attr('class', 'clue')
        .attr('x', 14).attr('y', (c, i) => height - 8 - (clues.length - 1 - i) * 15).attr('font-size', 11).attr('fill', '#5c4700')
        .text((c) => `${'①②③④⑤'[c.k - 1] ?? c.k} ${c.text}`)

      for (const [cls, list, y, anchor, dx] of [['left', left, yl, 'end', -9], ['right', right, yr, 'start', 9]]) {
        const nodes = g.selectAll(`g.node.${cls}`).data(list, (d) => d.id).join((enter) => {
          const n = enter.append('g').attr('class', `node ${cls}`).style('cursor', 'pointer')
          n.append('circle').attr('r', 4.5)
          n.append('text').attr('dy', '0.35em').attr('font-size', 11)
          return n
        })
        nodes.attr('transform', (d) => `translate(${cls === 'left' ? 0 : innerW},${y(d.id)})`)
          .on('click', (event, d) => dispatch.call('name', null, d.id))
        nodes.select('circle').attr('fill', (d) => groupColor(actorById[d.id]?.group))
        nodes.select('text').attr('x', dx).attr('text-anchor', anchor)
          .attr('font-weight', (d) => (d.id === highlight ? 700 : 400)).text((d) => `${d.id} (${d.n})`)
      }
    })
  }

  chart.width = (v) => ((width = v), chart)
  chart.height = (v) => ((height = v), chart)
  chart.actorById = (v) => ((actorById = v), chart)
  chart.relations = (v) => ((relations = v), chart)
  chart.highlight = (v) => ((highlight = v), chart)
  chart.on = (...args) => (dispatch.on(...args), chart)
  return chart
}
