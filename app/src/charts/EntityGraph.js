// Who talks to whom (page 2, Q2): the 40 actors on fixed positions (group-in-a-box layout computed in Python,
// so positions never jump), colour = group, shape = type, area = messages. Three edge types on the same
// positions: messages exchanged, mentions in the text, relations of the knowledge graph (width = support).
import * as d3 from 'd3'
import { DIM, groupColor, typeSymbol } from '../lib/palette.js'
import { hideTip, showTip } from '../lib/tooltip.js'

const key = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`)

// edges = [{a, b, n, ids}] for an edge type
export function graphEdges(edgeType, messages, D) {
  const acc = new Map()
  const add = (a, b, ids) => {
    if (!a || !b || a === b) return
    const k = key(a, b)
    const e = acc.get(k) ?? { a: k.split('|')[0], b: k.split('|')[1], n: 0, ids: [] }
    e.n += ids.length || 1
    e.ids.push(...ids)
    acc.set(k, e)
  }
  if (edgeType === 'messaggi') messages.forEach((m) => add(m.from, m.to, [m.id]))
  if (edgeType === 'menzioni') {
    const byId = new Map(messages.map((m) => [m.id, m]))
    D.mentions.forEach((x) => byId.has(x.msg) && add(byId.get(x.msg).from, x.name, [x.msg]))
  }
  if (edgeType === 'relazioni') {
    const ids = new Set(messages.map((m) => m.id))
    D.relations.forEach((r) => add(r.source, r.target, r.support.filter((s) => ids.has(s))))
  }
  return [...acc.values()]
}

// Labels that do not overlap: items in priority order ({id, x, y, r, text}); each label tries above, below, right,
// left and the four corners of its node and is hidden if all collide with a node or a label already placed (the
// name stays in the tooltip).
// Returns id → {shown, dx, dy, anchor, x0, x1, y0, y1} (dx, dy relative to the node, for the text baseline).
export function placeLabels(items, width, height) {
  const CH = 5.7 // px per character at 10.5 px
  const placed = items.map((it) => ({ id: it.id, x0: it.x - it.r, x1: it.x + it.r, y0: it.y - it.r, y1: it.y + it.r }))
  const out = new Map()
  for (const it of items) {
    const w = it.text.length * CH
    const tries = [
      { dx: 0, dy: -it.r - 3, anchor: 'middle', x0: -w / 2, y0: -it.r - 13 },
      { dx: 0, dy: it.r + 11, anchor: 'middle', x0: -w / 2, y0: it.r + 1 },
      { dx: it.r + 4, dy: 3.5, anchor: 'start', x0: it.r + 4, y0: -6 },
      { dx: -it.r - 4, dy: 3.5, anchor: 'end', x0: -it.r - 4 - w, y0: -6 },
      { dx: it.r, dy: -it.r - 1, anchor: 'start', x0: it.r, y0: -it.r - 11 },
      { dx: -it.r, dy: -it.r - 1, anchor: 'end', x0: -it.r - w, y0: -it.r - 11 },
      { dx: it.r, dy: it.r + 9, anchor: 'start', x0: it.r, y0: it.r - 1 },
      { dx: -it.r, dy: it.r + 9, anchor: 'end', x0: -it.r - w, y0: it.r - 1 },
    ].map((t) => ({ ...t, x0: it.x + t.x0, x1: it.x + t.x0 + w, y0: it.y + t.y0, y1: it.y + t.y0 + 12 }))
    const ok = tries.find((t) => t.x0 >= 0 && t.x1 <= width && t.y0 >= 0 && t.y1 <= height &&
      placed.every((q) => q.id === it.id || t.x1 <= q.x0 || q.x1 <= t.x0 || t.y1 <= q.y0 || q.y1 <= t.y0))
    if (ok) placed.push(ok)
    out.set(it.id, ok ? { shown: true, ...ok } : { shown: false })
  }
  return out
}

export default function EntityGraph() {
  let width = 700
  let height = 500
  let D = null
  let selected = null
  let theme = null
  const pad = 46
  const dispatch = d3.dispatch('actor', 'edge')
  let zoomT = d3.zoomIdentity

  function chart(selection) {
    selection.each(function ({ messages, edgeType }) {
      const svg = d3.select(this).selectAll('svg').data([null]).join('svg').attr('class', 'chart')
        .attr('width', width).attr('height', height)
      const root = svg.selectAll('g.zoom').data([null]).join('g').attr('class', 'zoom').attr('transform', zoomT)
      svg.call(d3.zoom().scaleExtent([0.7, 4]).on('zoom', (e) => {
        zoomT = e.transform
        root.attr('transform', zoomT)
      }))

      const counts = d3.rollup(messages.flatMap((m) => [m.from, m.to]), (v) => v.length, (x) => x)
      const nodes = D.actors.filter((a) => counts.has(a.id) && D.layout[a.id])
      const present = new Set(nodes.map((n) => n.id))
      // stretch the layout to the whole area (positions are relative, the groups stay apart)
      const xs = d3.extent(nodes, (n) => D.layout[n.id][0])
      const ys = d3.extent(nodes, (n) => D.layout[n.id][1])
      const sx = d3.scaleLinear().domain(xs).range([pad + 30, width - pad - 30])
      const sy = d3.scaleLinear().domain(ys).range([height - pad + 10, pad])
      const px = (id) => sx(D.layout[id][0])
      const py = (id) => sy(D.layout[id][1])
      const edges = graphEdges(edgeType, theme ? messages.filter((m) => m.themes?.includes(theme)) : messages, D)
        .filter((e) => present.has(e.a) && present.has(e.b))
      const w = d3.scaleSqrt().domain([1, d3.max(edges, (e) => e.n) || 1]).range([0.6, 7])
      const r = d3.scaleSqrt().domain([0, d3.max(nodes, (n) => counts.get(n.id)) || 1]).range([20, 380])
      const near = new Set(selected ? edges.filter((e) => e.a === selected || e.b === selected).flatMap((e) => [e.a, e.b]) : [])
      const onNode = (id) => !selected || id === selected || near.has(id)
      const onEdge = (e) => !selected || e.a === selected || e.b === selected
      const sameGroup = (e) => D.actorById[e.a]?.group === D.actorById[e.b]?.group
      const label = { messaggi: 'messaggi tra i due', menzioni: 'menzioni nel testo', relazioni: 'messaggi a sostegno della relazione' }[edgeType]

      root.selectAll('line.edge').data(edges, (e) => `${e.a}|${e.b}`).join('line').attr('class', 'edge')
        .attr('x1', (e) => px(e.a)).attr('y1', (e) => py(e.a)).attr('x2', (e) => px(e.b)).attr('y2', (e) => py(e.b))
        .attr('stroke', edgeType === 'relazioni' ? '#7a6a9a' : '#8c8c8c').attr('stroke-width', (e) => w(e.n))
        // edges across groups are lighter, so the blocks read first; a selection shows all its edges in full
        .attr('stroke-opacity', (e) => (!onEdge(e) ? 0.06 : selected || sameGroup(e) ? 0.45 : 0.18)).attr('pointer-events', 'none')
      // thin edges are hard to hit: a wide transparent line on top takes the mouse
      root.selectAll('line.hit').data(edges, (e) => `${e.a}|${e.b}`).join('line').attr('class', 'hit')
        .attr('x1', (e) => px(e.a)).attr('y1', (e) => py(e.a)).attr('x2', (e) => px(e.b)).attr('y2', (e) => py(e.b))
        .attr('stroke', 'transparent').attr('stroke-width', (e) => Math.max(8, w(e.n))).style('cursor', 'pointer')
        .on('click', (event, e) => dispatch.call('edge', null, e))
        .on('mousemove', (event, e) => showTip(event, [`${e.a} — ${e.b}`, `${e.n} ${label}`, 'clic: leggi i messaggi']))
        .on('mouseleave', hideTip)

      const g = root.selectAll('g.node').data(nodes, (n) => n.id).join((enter) => {
        const n = enter.append('g').attr('class', 'node').style('cursor', 'pointer')
        n.append('path').attr('stroke', '#fff').attr('stroke-width', 1)
        return n
      })
      g.attr('transform', (n) => `translate(${px(n.id)},${py(n.id)})`).attr('opacity', (n) => (onNode(n.id) ? 1 : DIM))
        .on('click', (event, n) => dispatch.call('actor', null, n.id))
        .on('mousemove', (event, n) => showTip(event, [n.id, `${n.group} · ${counts.get(n.id)} messaggi`, 'clic: seleziona']))
        .on('mouseleave', hideTip)
      g.select('path').attr('d', (n) => d3.symbol(typeSymbol(n.type), r(counts.get(n.id)))())
        .attr('fill', (n) => groupColor(n.group))
        .attr('stroke', (n) => (n.id === selected ? '#000' : '#fff')).attr('stroke-width', (n) => (n.id === selected ? 2 : 1))
      const radius = (n) => Math.sqrt(r(counts.get(n.id))) / 1.6
      const order = [...nodes].sort((a, b) => (b.id === selected) - (a.id === selected) || counts.get(b.id) - counts.get(a.id))
      const labels = placeLabels(order.map((n) => ({ id: n.id, x: px(n.id), y: py(n.id), r: radius(n), text: n.id })), width, height)
      // labels in their own layer above all the nodes, so no node covers a name
      root.selectAll('g.labels').data([null]).join('g').attr('class', 'labels').raise()
        .selectAll('text').data(nodes, (n) => n.id).join('text').attr('font-size', 10.5).attr('pointer-events', 'none')
        .text((n) => n.id).attr('font-weight', (n) => (n.id === selected ? 700 : 400))
        .attr('opacity', (n) => (onNode(n.id) ? 1 : DIM))
        .attr('display', (n) => (labels.get(n.id).shown ? null : 'none'))
        .attr('x', (n) => px(n.id) + (labels.get(n.id).dx ?? 0)).attr('y', (n) => py(n.id) + (labels.get(n.id).dy ?? 0))
        .attr('text-anchor', (n) => labels.get(n.id).anchor ?? 'middle')
    })
  }

  chart.width = (v) => ((width = v), chart)
  chart.height = (v) => ((height = v), chart)
  chart.data = (v) => ((D = v), chart)
  chart.selected = (v) => ((selected = v), chart)
  chart.theme = (v) => ((theme = v), chart)
  chart.on = (...args) => (dispatch.on(...args), chart)
  return chart
}
