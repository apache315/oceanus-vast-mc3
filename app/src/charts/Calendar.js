// When do they talk? (page 1) Rows = days, x = 8–15 (no message falls outside), one tick per message,
// colour = group of the sender. Messages of the same pair in the same minute are offset by 2 px.
import * as d3 from 'd3'
import { DIM, groupColor } from '../lib/palette.js'
import { dayKey } from '../lib/view.js'
import { clip, hideTip, showTip } from '../lib/tooltip.js'

export default function Calendar() {
  let width = 600
  let height = 300
  let actorById = {}
  let days = []
  let hours = [8, 15]
  let highlight = () => true
  const margin = { top: 20, right: 10, bottom: 18, left: 54 }
  const dispatch = d3.dispatch('message', 'day')
  const fmtDay = d3.timeFormat('%a %d')
  const fmt = d3.timeFormat('%a %d %b, %H:%M')

  function chart(selection) {
    selection.each(function (messages) {
      const svg = d3.select(this).selectAll('svg').data([null]).join('svg').attr('class', 'chart')
        .attr('width', width).attr('height', height)
      const g = svg.selectAll('g.plot').data([null]).join('g').attr('class', 'plot')
        .attr('transform', `translate(${margin.left},${margin.top})`)
      const innerW = width - margin.left - margin.right
      const innerH = height - margin.top - margin.bottom
      const x = d3.scaleLinear().domain(hours).range([0, innerW])
      const y = d3.scaleBand().domain(days).range([0, innerH]).padding(0.18)
      const seen = new Map()
      const offset = new Map(messages.map((m) => {
        const key = `${m.from}|${m.to}|${Math.floor(m.t / 60000)}`
        const k = seen.get(key) ?? 0
        seen.set(key, k + 1)
        return [m.id, k * 2]
      }))
      const xm = (m) => x(m.t.getHours() + m.t.getMinutes() / 60) + offset.get(m.id)

      g.selectAll('g.axis').data([null]).join('g').attr('class', 'axis')
        .call(d3.axisTop(x).ticks(hours[1] - hours[0]).tickFormat((h) => `${h}:00`).tickSizeOuter(0))
      g.selectAll('line.grid').data(d3.range(hours[0], hours[1] + 1)).join('line').attr('class', 'grid')
        .attr('x1', x).attr('x2', x).attr('y1', 0).attr('y2', innerH).attr('stroke', '#eee')
      g.selectAll('text.day').data(days).join('text').attr('class', 'day')
        .attr('x', -6).attr('y', (d) => y(d) + y.bandwidth() / 2).attr('dy', '0.35em').attr('text-anchor', 'end')
        .attr('font-size', 11).style('cursor', 'pointer').text((d) => fmtDay(new Date(`${d}T00:00`)))
        .on('click', (event, d) => dispatch.call('day', null, d))
      g.selectAll('line.msg').data(messages, (m) => m.id).join('line').attr('class', 'msg')
        .attr('x1', xm).attr('x2', xm)
        .attr('y1', (m) => y(dayKey(m.t)) ?? -100).attr('y2', (m) => (y(dayKey(m.t)) ?? -100) + y.bandwidth())
        .attr('stroke', (m) => groupColor(actorById[m.from]?.group)).attr('stroke-width', 2)
        .attr('opacity', (m) => (highlight(m) ? 0.65 : DIM)).style('cursor', 'pointer')
        .on('click', (event, m) => dispatch.call('message', null, m.id))
        .on('mousemove', (event, m) => showTip(event, [`${m.from} → ${m.to}`, fmt(m.t), clip(m.text)]))
        .on('mouseleave', hideTip)
      svg.selectAll('text.note').data([null]).join('text').attr('class', 'note')
        .attr('x', margin.left).attr('y', height - 3).attr('font-size', 10.5).attr('fill', '#666').attr('font-style', 'italic')
        .text(`Nessun messaggio prima delle ${hours[0]} o dopo le ${hours[1]}: l'asse mostra solo la fascia in cui si usa la radio.`)
    })
  }

  chart.width = (v) => ((width = v), chart)
  chart.height = (v) => ((height = v), chart)
  chart.actorById = (v) => ((actorById = v), chart)
  chart.days = (v) => ((days = v), chart)
  chart.hours = (v) => ((hours = v), chart)
  chart.highlight = (f) => ((highlight = f), chart)
  chart.on = (...args) => (dispatch.on(...args), chart)
  return chart
}
