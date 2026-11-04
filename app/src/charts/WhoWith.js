// With whom? (page 4) The people involved in the coded actions, length = number of actions; next to each, what the
// intern's knowledge graph records between the two and with how many supporting messages.
import * as d3 from 'd3'
import { groupColor } from '../lib/palette.js'
import { hideTip, showTip } from '../lib/tooltip.js'

const REL = { Colleagues: 'collega', AccessPermission: 'accesso', Coordinates: 'coordina', Operates: 'opera', Reports: 'riferisce', Suspicious: 'sospetto', Friends: 'amico', Unfriendly: 'ostile', Jurisdiction: 'giurisdizione' }

export default function WhoWith() {
  let width = 420
  let height = 320
  let D = null
  let selected = null
  const margin = { top: 26, right: 8, bottom: 6, left: 130 }
  const dispatch = d3.dispatch('person')

  function chart(selection) {
    selection.each(function ({ actor, marks }) {
      const graphText = (con) => {
        const rels = D.relations.filter((r) => (r.source === actor && r.target === con) || (r.target === actor && r.source === con))
        return rels.length ? rels.map((r) => `${REL[r.type] ?? r.type} (${r.support.length} msg)`).join(', ') : 'nessuna relazione registrata'
      }
      const rows = d3.rollups(marks.filter((a) => a.action !== 'prova contraria' && !a.viaAlias), (v) => v.length, (a) => a.con)
        .map(([con, n]) => ({ con, n, graph: graphText(con) }))
        .sort((a, b) => b.n - a.n || a.con.localeCompare(b.con))
      const svg = d3.select(this).selectAll('svg').data([null]).join('svg').attr('class', 'chart')
        .attr('width', width).attr('height', height)
      const g = svg.selectAll('g.plot').data([null]).join('g').attr('class', 'plot')
        .attr('transform', `translate(${margin.left},${margin.top})`)
      const barW = 70
      g.selectAll('text.head').data([[-margin.left + 4, 'azioni insieme (lette nei messaggi)'], [barW + 26, 'cosa registra il grafo tra i due']])
        .join('text').attr('class', 'head').attr('x', (h) => h[0]).attr('y', -10).attr('font-size', 10.5).attr('font-weight', 600)
        .attr('fill', '#555').text((h) => h[1])
      const x = d3.scaleLinear().domain([0, d3.max(rows, (r) => r.n) || 1]).range([0, barW])
      const y = d3.scaleBand().domain(rows.map((r) => r.con)).range([0, Math.min(height - margin.top - margin.bottom, rows.length * 22)]).padding(0.22)
      const row = g.selectAll('g.row').data(rows, (r) => r.con).join((enter) => {
        const r = enter.append('g').attr('class', 'row').style('cursor', 'pointer')
        r.append('rect')
        r.append('text').attr('class', 'name').attr('x', -6).attr('dy', '0.35em').attr('text-anchor', 'end').attr('font-size', 11)
        r.append('text').attr('class', 'n').attr('dy', '0.35em').attr('font-size', 10.5)
        r.append('text').attr('class', 'graph').attr('x', barW + 26).attr('dy', '0.35em').attr('font-size', 10.5)
        return r
      })
      row.attr('transform', (r) => `translate(0,${y(r.con)})`).attr('opacity', (r) => (!selected || r.con === selected ? 1 : 0.35))
        .on('click', (event, r) => dispatch.call('person', null, r.con))
        .on('mousemove', (event, r) => showTip(event, [r.con, `${r.n} azioni codificate`, `nel grafo: ${r.graph}`, 'clic: evidenzia le sue azioni']))
        .on('mouseleave', hideTip)
      row.select('rect').attr('height', y.bandwidth()).attr('width', (r) => x(r.n)).attr('fill', (r) => groupColor(D.actorById[r.con]?.group))
      row.select('text.name').attr('y', y.bandwidth() / 2).text((r) => r.con)
      row.select('text.n').attr('y', y.bandwidth() / 2).attr('x', (r) => x(r.n) + 4).text((r) => r.n)
      row.select('text.graph').attr('y', y.bandwidth() / 2)
        .attr('fill', (r) => (r.graph.startsWith('nessuna') ? '#8a5a00' : '#555')).text((r) => r.graph)
    })
  }

  chart.width = (v) => ((width = v), chart)
  chart.height = (v) => ((height = v), chart)
  chart.data = (v) => ((D = v), chart)
  chart.selected = (v) => ((selected = v), chart)
  chart.on = (...args) => (dispatch.on(...args), chart)
  return chart
}
