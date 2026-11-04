// Who has influence on X? (page 1, Q1c) Three columns: who writes to X shortly before X writes to others
// (left) → X → whom X writes to right after (right). Width = number of chains. A precedence in time, not
// a proof of command: the view says so. Click a name to make it the new centre, a link to read the chains.
import * as d3 from 'd3'
import { groupColor } from '../lib/palette.js'
import { hideTip, showTip } from '../lib/tooltip.js'

export default function Influence() {
  let width = 600
  let height = 300
  let actorById = {}
  let chains = []
  const maxPerSide = 7
  const dispatch = d3.dispatch('focus', 'chains')

  function chart(selection) {
    selection.each(function (focus) {
      const svg = d3.select(this).selectAll('svg').data([null]).join('svg').attr('class', 'chart')
        .attr('width', width).attr('height', height)
      const mine = chains.filter((c) => c.b === focus)
      const side = (key) => d3.rollups(mine, (v) => v, (c) => c[key])
        .map(([id, list]) => ({ id, n: list.length, list }))
        .sort((a, b) => b.n - a.n || a.id.localeCompare(b.id)).slice(0, maxPerSide)
      const left = side('a')
      const right = side('c')
      const side_ = Math.max(120, width * 0.22) // room for the names
      const cx = [side_, width / 2, width - side_]
      const top = 34
      const y = d3.scalePoint().domain(d3.range(maxPerSide)).range([top + 10, height - 12])
      const yc = (height + top) / 2
      const w = d3.scaleLinear().domain([1, d3.max([...left, ...right], (d) => d.n) || 1]).range([1.5, 10])

      svg.selectAll('text.head').data(focus && mine.length ? ['chi la attiva', focus, 'chi attiva lei'] : []).join('text')
        .attr('class', 'head').attr('x', (d, i) => cx[i]).attr('y', 14).attr('text-anchor', 'middle')
        .attr('font-size', 11).attr('font-weight', 600).attr('fill', '#555').text((d) => d)
      svg.selectAll('text.empty').data(focus && !mine.length ? [`Nessuna catena per ${focus}`] : !focus ? ['Scegli un attore in alto o con un clic sulle altre viste'] : [])
        .join('text').attr('class', 'empty').attr('x', width / 2).attr('y', height / 2).attr('text-anchor', 'middle')
        .attr('font-size', 12).attr('fill', '#666').text((d) => d)

      const links = [
        ...left.map((d, i) => ({ id: d.id, side: 'left', n: d.n, list: d.list, x1: cx[0], y1: y(i), x2: cx[1], y2: yc })),
        ...right.map((d, i) => ({ id: d.id, side: 'right', n: d.n, list: d.list, x1: cx[1], y1: yc, x2: cx[2], y2: y(i) })),
      ]
      const link = d3.linkHorizontal().x((p) => p[0]).y((p) => p[1])
      svg.selectAll('path.link').data(mine.length ? links : [], (l) => `${l.side}|${l.id}`).join('path')
        .attr('class', (l) => `link ${l.side}`)
        .attr('d', (l) => link({ source: [l.x1, l.y1], target: [l.x2, l.y2] }))
        .attr('fill', 'none').attr('stroke', '#9a9a9a').attr('stroke-opacity', 0.55).attr('stroke-width', (l) => w(l.n))
        .style('cursor', 'pointer')
        .on('click', (event, l) => dispatch.call('chains', null, l.list, l.side === 'left' ? `${l.id} attiva ${focus}` : `${focus} attiva ${l.id}`))
        .on('mousemove', (event, l) => showTip(event, [l.side === 'left' ? `${l.id} → ${focus} → altri` : `${focus} → ${l.id}`, `${l.n} catene entro 15 minuti`, 'clic: leggi i messaggi']))
        .on('mouseleave', hideTip)

      const nodes = [
        ...left.map((d, i) => ({ ...d, side: 'left', x: cx[0], y: y(i) })),
        ...right.map((d, i) => ({ ...d, side: 'right', x: cx[2], y: y(i) })),
        ...(mine.length ? [{ id: focus, n: mine.length, side: 'centre', x: cx[1], y: yc }] : []),
      ]
      const g = svg.selectAll('g.node').data(nodes, (d) => `${d.side}|${d.id}`).join((enter) => {
        const n = enter.append('g').style('cursor', 'pointer')
        n.append('circle').attr('r', 6)
        n.append('text').attr('dy', '0.35em').attr('font-size', 11)
        return n
      })
      g.attr('class', (d) => `node ${d.side}`).attr('transform', (d) => `translate(${d.x},${d.y})`)
        .on('click', (event, d) => d.side !== 'centre' && dispatch.call('focus', null, d.id))
      g.select('circle').attr('fill', (d) => groupColor(actorById[d.id]?.group)).attr('r', (d) => (d.side === 'centre' ? 8 : 6))
      g.select('text').attr('x', (d) => (d.side === 'left' ? -11 : 11)).attr('text-anchor', (d) => (d.side === 'left' ? 'end' : 'start'))
        .text((d) => `${d.id} (${d.n})`)
    })
  }

  chart.width = (v) => ((width = v), chart)
  chart.height = (v) => ((height = v), chart)
  chart.actorById = (v) => ((actorById = v), chart)
  chart.chains = (v) => ((chains = v), chart)
  chart.on = (...args) => (dispatch.on(...args), chart)
  return chart
}
