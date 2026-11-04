// Relations in the graph on X (page 1, Q1c): every relation the intern's knowledge graph records with X, in both
// directions, written as a sentence ("Davis riferisce a Remora"). Length = messages that support the relation
// (light if only one): the graph was built by an intern, support says how much to trust it.
import * as d3 from 'd3'
import { groupColor } from '../lib/palette.js'
import { hideTip, showTip } from '../lib/tooltip.js'

const VERB = {
  Operates: 'opera', Reports: 'riferisce a', Coordinates: 'coordina', Colleagues: 'è collega di', Suspicious: 'sospetta di',
  AccessPermission: 'dà accesso a', Friends: 'è amico di', Unfriendly: 'è ostile a', Jurisdiction: 'ha giurisdizione su',
}

export default function Roles() {
  let width = 400
  let height = 260
  let relations = []
  let actorById = {}
  const margin = { top: 6, right: 6, bottom: 22, left: 6 }
  const barW = 34
  const dispatch = d3.dispatch('relation')

  function chart(selection) {
    selection.each(function (focus) {
      const short = (id) => (actorById[id]?.type === 'Person' && !actorById[id]?.alias ? id.split(' ')[0] : id) // alias in full: «The Middleman»
      const room = Math.floor((width - margin.left - margin.right - barW - 22) / 6) // characters that fit, ~6 px each
      const fitText = (t) => (t.length > room ? t.slice(0, room - 1) + '…' : t)
      const all = relations.filter((r) => r.source === focus || r.target === focus)
        .map((r) => ({
          who: r.source === focus ? r.target : r.source, n: r.support.length, ids: r.support,
          text: `${short(r.source)} ${VERB[r.type] ?? r.type} ${short(r.target)}`,
        }))
        .sort((a, b) => b.n - a.n || a.text.localeCompare(b.text))
      const fit = Math.max(1, Math.floor((height - margin.top - margin.bottom - 14) / 17)) // rows of at least 17 px
      const bars = all.slice(0, fit)
      const svg = d3.select(this).selectAll('svg').data([null]).join('svg').attr('class', 'chart')
        .attr('width', width).attr('height', height)
      svg.selectAll('text.empty').data(!focus ? ['Scegli un attore'] : !bars.length ? ['Nessuna relazione nel grafo'] : []).join('text')
        .attr('class', 'empty').attr('x', width / 2).attr('y', height / 2).attr('text-anchor', 'middle')
        .attr('font-size', 12).attr('fill', '#666').text((d) => d)
      const g = svg.selectAll('g.plot').data([null]).join('g').attr('class', 'plot')
        .attr('transform', `translate(${margin.left},${margin.top})`)
      const x = d3.scaleLinear().domain([0, d3.max(bars, (b) => b.n) || 1]).range([0, barW])
      const y = d3.scaleBand().domain(bars.map((b) => b.text)).range([0, bars.length * 17]).padding(0.2)
      const row = g.selectAll('g.bar').data(bars, (b) => b.text).join((enter) => {
        const r = enter.append('g').attr('class', 'bar').style('cursor', 'pointer')
        r.append('rect')
        r.append('text').attr('class', 'n').attr('dy', '0.35em').attr('font-size', 10.5).attr('fill', '#555')
        r.append('text').attr('class', 'role').attr('x', barW + 22).attr('dy', '0.35em').attr('font-size', 11)
        return r
      })
      row.attr('transform', (b) => `translate(0,${y(b.text)})`)
        .on('click', (event, b) => dispatch.call('relation', null, b))
        .on('mousemove', (event, b) => showTip(event, [b.text, `${b.n} messaggi a sostegno nel grafo`, 'clic: leggi i messaggi']))
        .on('mouseleave', hideTip)
      row.select('rect').attr('height', y.bandwidth()).attr('width', (b) => Math.max(1, x(b.n)))
        .attr('fill', (b) => groupColor(actorById[b.who]?.group)).attr('opacity', (b) => (b.n <= 1 ? 0.4 : 1))
      row.select('text.n').attr('y', y.bandwidth() / 2).attr('x', (b) => x(b.n) + 4).text((b) => b.n)
      row.select('text.role').attr('y', y.bandwidth() / 2).text((b) => fitText(b.text))
      g.selectAll('text.more').data(all.length > bars.length ? [all.length - bars.length] : []).join('text').attr('class', 'more')
        .attr('x', 0).attr('y', y.range()[1] + 14).attr('font-size', 10.5).attr('fill', '#666')
        .text((k) => (k === 1 ? '+ 1 altra relazione (meno sostenuta)' : `+ altre ${k} relazioni (meno sostenute)`))
      svg.selectAll('text.unit').data(bars.length ? ['barra = messaggi a sostegno'] : []).join('text').attr('class', 'unit')
        .attr('x', margin.left).attr('y', height - 6).attr('font-size', 10).attr('fill', '#666').text((d) => d)
    })
  }

  chart.width = (v) => ((width = v), chart)
  chart.height = (v) => ((height = v), chart)
  chart.relations = (v) => ((relations = v), chart)
  chart.actorById = (v) => ((actorById = v), chart)
  chart.on = (...args) => (dispatch.on(...args), chart)
  return chart
}
