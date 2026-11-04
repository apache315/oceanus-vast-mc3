// When do they act? (Q1) Hours written inside the messages ("meet at 0500", "7PM"), 0–23, as bars from zero,
// with the radio window shaded: the radio is used 8–14, the activities it organises happen at dawn and at night.
import * as d3 from 'd3'
import { ACCENT } from '../lib/palette.js'
import { hideTip, showTip } from '../lib/tooltip.js'

const outside = (h, [a, b]) => h < a || h > b

// percentage of the hours cited in the texts that fall outside the radio window (null if none is cited)
export function outsideShare(messages, radioWindow) {
  const hours = messages.flatMap((m) => m.hours ?? [])
  return hours.length ? Math.round((100 * hours.filter((h) => outside(h, radioWindow)).length) / hours.length) : null
}

export default function CitedHours() {
  let width = 300
  let height = 150
  let radioWindow = [8, 14]
  const margin = { top: 8, right: 6, bottom: 32, left: 40 }

  function chart(selection) {
    selection.each(function (messages) {
      const counts = d3.rollup(messages.flatMap((m) => m.hours ?? []), (v) => v.length, (h) => h)
      const bars = d3.range(24).map((hour) => ({ hour, n: counts.get(hour) ?? 0 }))
      const svg = d3.select(this).selectAll('svg').data([null]).join('svg').attr('class', 'chart')
        .attr('width', width).attr('height', height)
      const g = svg.selectAll('g.plot').data([null]).join('g').attr('class', 'plot')
        .attr('transform', `translate(${margin.left},${margin.top})`)
      const innerW = width - margin.left - margin.right
      const innerH = height - margin.top - margin.bottom
      const x = d3.scaleBand().domain(d3.range(24)).range([0, innerW]).padding(0.15)
      const y = d3.scaleLinear().domain([0, d3.max(bars, (b) => b.n) || 1]).range([innerH, 0]).nice()

      g.selectAll('rect.radio').data([radioWindow]).join('rect').attr('class', 'radio')
        .attr('x', (w) => x(w[0])).attr('width', (w) => x(w[1]) + x.bandwidth() - x(w[0]))
        .attr('y', 0).attr('height', innerH).attr('fill', '#efefef')
      g.selectAll('text.radio').data([radioWindow]).join('text').attr('class', 'radio')
        .attr('x', (w) => (x(w[0]) + x(w[1]) + x.bandwidth()) / 2).attr('y', 10).attr('text-anchor', 'middle')
        .attr('font-size', 10).attr('fill', '#555').text('orario radio')
      g.selectAll('rect.bar').data(bars).join('rect').attr('class', 'bar')
        .attr('x', (b) => x(b.hour)).attr('width', x.bandwidth())
        .attr('y', (b) => y(b.n)).attr('height', (b) => innerH - y(b.n)).attr('fill', ACCENT)
        .on('mousemove', (event, b) => showTip(event, [`ore ${b.hour}`, `citata ${b.n} volte nei testi`]))
        .on('mouseleave', hideTip)
      g.selectAll('g.axis').data([null]).join('g').attr('class', 'axis').attr('transform', `translate(0,${innerH})`)
        .call(d3.axisBottom(x).tickValues([0, 4, 8, 12, 16, 20]).tickFormat((h) => `${h}:00`).tickSizeOuter(0))
      g.selectAll('g.yaxis').data([null]).join('g').attr('class', 'axis yaxis')
        .call(d3.axisLeft(y).ticks(3).tickSizeOuter(0))
      svg.selectAll('text.axis-title').data([
        { t: 'ora citata nel testo', x: margin.left + innerW / 2, y: height - 4, r: 0 },
        { t: 'citazioni', x: 11, y: margin.top + innerH / 2, r: -90 },
      ]).join('text').attr('class', 'axis-title').attr('text-anchor', 'middle').attr('font-size', 10.5).attr('fill', '#555')
        .attr('transform', (a) => `translate(${a.x},${a.y}) rotate(${a.r})`).text((a) => a.t)
    })
  }

  chart.width = (v) => ((width = v), chart)
  chart.height = (v) => ((height = v), chart)
  chart.radioWindow = (v) => ((radioWindow = v), chart)
  return chart
}
