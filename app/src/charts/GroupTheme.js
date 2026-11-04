// What does each group talk about? (page 2, Q2b) Rows = groups, columns = keyword themes ordered by their highest
// share; cell = share of the messages sent by the group that touch the theme (magma, value written). A message can
// touch several themes, so a column does not sum to 100%: the legend under the table says so.
import * as d3 from 'd3'
import { GROUPS, groupColor, groupText, seq } from '../lib/palette.js'
import { hideTip, showTip } from '../lib/tooltip.js'

export default function GroupTheme() {
  let width = 560
  let height = 220
  let actorById = {}
  let topics = []
  let selected = null // { group, theme }
  const margin = { top: 40, right: 6, bottom: 62, left: 136 }
  const dispatch = d3.dispatch('cell')

  function chart(selection) {
    selection.each(function (messages) {
      const groups = GROUPS.filter((g) => messages.some((m) => actorById[m.from]?.group === g))
      const cells = groups.flatMap((group) => {
        const sent = messages.filter((m) => actorById[m.from]?.group === group)
        return topics.map((theme) => {
          const ids = sent.filter((m) => m.themes.includes(theme)).map((m) => m.id)
          return { group, theme, share: sent.length ? ids.length / sent.length : 0, n: sent.length, ids }
        })
      })
      const order = d3.groupSort(cells, (v) => -d3.max(v, (c) => c.share), (c) => c.theme)
      const svg = d3.select(this).selectAll('svg').data([null]).join('svg').attr('class', 'chart')
        .attr('width', width).attr('height', height)
      const g = svg.selectAll('g.plot').data([null]).join('g').attr('class', 'plot')
        .attr('transform', `translate(${margin.left},${margin.top})`)
      const x = d3.scaleBand().domain(groups).range([0, width - margin.left - margin.right]).padding(0.04)
      const y = d3.scaleBand().domain(order).range([0, Math.min(height - margin.top - margin.bottom, order.length * 34)]).padding(0.06)
      const isSel = (c) => selected && c.theme === selected.theme && (!selected.group || c.group === selected.group)

      const cell = g.selectAll('g.cell').data(cells, (c) => `${c.group}|${c.theme}`).join((enter) => {
        const c = enter.append('g').attr('class', 'cell').style('cursor', 'pointer')
        c.append('rect')
        c.append('text').attr('dy', '0.35em').attr('text-anchor', 'middle').attr('font-size', 11)
        return c
      })
      cell.attr('transform', (c) => `translate(${x(c.group)},${y(c.theme)})`)
        .on('click', (event, c) => dispatch.call('cell', null, c))
        .on('mousemove', (event, c) => showTip(event, [`${c.group} · ${c.theme}`, `${c.ids.length} messaggi su ${c.n} inviati dal gruppo`, 'clic: leggi i messaggi']))
        .on('mouseleave', hideTip)
      cell.select('rect').attr('width', x.bandwidth()).attr('height', y.bandwidth())
        .attr('fill', (c) => seq(Math.min(1, c.share / 0.7))).attr('stroke', (c) => (isSel(c) ? '#000' : 'none')).attr('stroke-width', 2)
      cell.select('text').attr('x', x.bandwidth() / 2).attr('y', y.bandwidth() / 2)
        .attr('fill', (c) => (c.share > 0.3 ? '#fff' : '#333')).text((c) => `${Math.round(c.share * 100)}%`)

      g.selectAll('text.row').data(order).join('text').attr('class', 'row')
        .attr('x', -8).attr('y', (t) => y(t) + y.bandwidth() / 2).attr('dy', '0.35em').attr('text-anchor', 'end')
        .attr('font-size', 11).text((t) => t)
      const SHORT = { 'Operazione Nemo Reef': ['Operazione', 'Nemo Reef'], 'Controllo e istituzioni': ['Controllo e', 'istituzioni'] }
      g.selectAll('text.col').data(groups).join('text').attr('class', 'col')
        .attr('x', (gr) => x(gr) + x.bandwidth() / 2).attr('y', -26).attr('text-anchor', 'middle').attr('font-size', 10.5)
        .attr('font-weight', 600).attr('fill', (gr) => groupText(gr))
        .selectAll('tspan').data((gr) => SHORT[gr] ?? [gr]).join('tspan')
        .attr('x', function () { return this.parentNode.getAttribute('x') }).attr('dy', (t, i) => (i ? '1.15em' : 0)).text((t) => t)

      // legend: the colour ramp of the cells (capped at 70%) and what the share means
      const lw = Math.min(180, width - margin.left - margin.right)
      const legend = g.selectAll('g.legend').data([null]).join((enter) => {
        const l = enter.append('g').attr('class', 'legend')
        const grad = l.append('defs').append('linearGradient').attr('id', 'gt-ramp')
        grad.selectAll('stop').data(d3.range(0, 1.01, 0.1)).join('stop')
          .attr('offset', (t) => `${t * 100}%`).attr('stop-color', (t) => seq(t))
        l.append('rect').attr('class', 'ramp').attr('height', 9).attr('fill', 'url(#gt-ramp)')
        l.append('text').attr('class', 'lo').attr('y', 20).attr('font-size', 10.5).text('0%')
        l.append('text').attr('class', 'hi').attr('y', 20).attr('font-size', 10.5).attr('text-anchor', 'end').text('70% o più')
        l.append('text').attr('class', 'what').attr('y', 34).attr('font-size', 10.5).attr('fill', '#555')
          .selectAll('tspan').data(['su 100 messaggi inviati dal gruppo, quanti parlano del tema', '(un messaggio può avere più temi: le colonne non fanno 100)'])
          .join('tspan').attr('x', 0).attr('dy', (t, i) => (i ? '1.25em' : 0)).text((t) => t)
        return l
      })
      legend.attr('transform', `translate(${-margin.left + 8},${y.range()[1] + 10})`)
      legend.select('rect.ramp').attr('x', margin.left - 8).attr('width', lw)
      legend.select('text.lo').attr('x', margin.left - 8)
      legend.select('text.hi').attr('x', margin.left - 8 + lw)
    })
  }

  chart.width = (v) => ((width = v), chart)
  chart.height = (v) => ((height = v), chart)
  chart.actorById = (v) => ((actorById = v), chart)
  chart.topics = (v) => ((topics = v), chart)
  chart.selected = (v) => ((selected = v), chart)
  chart.on = (...args) => (dispatch.on(...args), chart)
  return chart
}
