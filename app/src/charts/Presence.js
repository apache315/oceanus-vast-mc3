// When do the alias and the candidate write? (page 3) Two rows of bars on the same scale: messages sent per day by
// the alias (top) and by the candidate (bottom). If one name stops writing when the other starts, that is a clue
// (not a proof) that they are the same person; the days on which both write are shaded.
import * as d3 from 'd3'
import { groupColor, groupText } from '../lib/palette.js'
import { hideTip, showTip } from '../lib/tooltip.js'

const DAYS = d3.range(1, 15)
const sentDays = (name, messages) => [...new Set(messages.filter((m) => m.from === name).map((m) => m.t.getDate()))].sort((a, b) => a - b)

// does the first name stop writing when the second starts? days are days of October 2040
export function handoff([a, b], messages) {
  const da = sentDays(a, messages)
  const db = sentDays(b, messages)
  const lastA = da.length ? da[da.length - 1] : null
  const firstB = db.length ? db[0] : null
  return { lastA, firstB, shared: da.filter((d) => db.includes(d)), stops: lastA != null && firstB != null && lastA <= firstB }
}

export default function Presence() {
  let width = 400
  let height = 240
  let actorById = {}
  const margin = { top: 4, right: 8, bottom: 22, left: 8 }
  const dispatch = d3.dispatch('day')

  function chart(selection) {
    selection.each(function ({ names, messages }) {
      const svg = d3.select(this).selectAll('svg').data([null]).join('svg').attr('class', 'chart')
        .attr('width', width).attr('height', height)
      const g = svg.selectAll('g.plot').data([null]).join('g').attr('class', 'plot')
        .attr('transform', `translate(${margin.left},${margin.top})`)
      const innerW = width - margin.left - margin.right
      const rowH = (height - margin.top - margin.bottom) / names.length
      const head = 18 // name of the row above its bars
      const bars = names.flatMap((name) => d3.groups(messages.filter((m) => m.from === name), (m) => m.t.getDate())
        .map(([day, v]) => ({ name, day, ids: v.map((m) => m.id) })).sort((p, q) => p.day - q.day))
      const x = d3.scaleBand().domain(DAYS).range([0, innerW]).padding(0.25)
      const y = d3.scaleLinear().domain([0, d3.max(bars, (b) => b.ids.length) || 1]).range([rowH - head - 16, 14]) // room for the count above the tallest bar
      const { shared } = handoff(names, messages)

      const row = g.selectAll('g.row').data(names).join((enter) => {
        const r = enter.append('g').attr('class', 'row')
        r.append('text').attr('class', 'name').attr('y', 12).attr('font-size', 12).attr('font-weight', 600)
        r.append('line').attr('class', 'base').attr('stroke', '#ccc')
        r.append('g').attr('class', 'bands')
        r.append('g').attr('class', 'bars')
        return r
      })
      row.attr('transform', (n, i) => `translate(0,${i * rowH})`)
      row.select('text.name').attr('fill', (n) => groupText(actorById[n]?.group)).text((n) => `messaggi inviati da ${n}`)
      row.select('line.base').attr('x1', 0).attr('x2', innerW).attr('y1', rowH - 16).attr('y2', rowH - 16)
      row.select('g.bands').attr('transform', `translate(0,${head})`).selectAll('rect.shared').data(shared).join('rect').attr('class', 'shared')
        .attr('x', (d) => x(d) - x.step() * x.paddingInner() / 2).attr('width', x.step()).attr('y', 0).attr('height', rowH - head - 16)
        .attr('fill', '#ececec')
      row.select('g.bars').attr('transform', `translate(0,${head})`).selectAll('g.bar')
        .data((n) => bars.filter((b) => b.name === n), (b) => b.day).join((enter) => {
          const b = enter.append('g').attr('class', 'bar').style('cursor', 'pointer')
          b.append('rect')
          b.append('text').attr('text-anchor', 'middle').attr('font-size', 11).attr('fill', '#333')
          return b
        })
        .attr('transform', (b) => `translate(${x(b.day)},0)`)
        .on('click', (event, b) => dispatch.call('day', null, b))
        .on('mousemove', (event, b) => showTip(event, [`${b.name} · ${b.day} ottobre`, `${b.ids.length} messaggi inviati`, 'clic: leggi i messaggi']))
        .on('mouseleave', hideTip)
        .call((b) => b.select('rect').attr('width', x.bandwidth()).attr('y', (d) => y(d.ids.length))
          .attr('height', (d) => y(0) - y(d.ids.length)).attr('fill', (d) => groupColor(actorById[d.name]?.group)))
        .call((b) => b.select('text').attr('x', x.bandwidth() / 2).attr('y', (d) => y(d.ids.length) - 4).text((d) => d.ids.length))
      // days under each row: the two rows are compared day by day
      row.selectAll('text.day').data(DAYS).join('text').attr('class', 'day')
        .attr('x', (d) => x(d) + x.bandwidth() / 2).attr('y', rowH - 3).attr('text-anchor', 'middle')
        .attr('font-size', 10).attr('fill', '#666').text((d) => `${d}/10`)
    })
  }

  chart.width = (v) => ((width = v), chart)
  chart.height = (v) => ((height = v), chart)
  chart.actorById = (v) => ((actorById = v), chart)
  chart.on = (...args) => (dispatch.on(...args), chart)
  return chart
}
