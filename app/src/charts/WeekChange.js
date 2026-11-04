// What changes between week 1 (1–7 Oct) and week 2 (8–14 Oct)? (Q1) One dumbbell per theme and per group:
// light dot = W1, dark dot = W2 (same hue, ordered weeks, design-rules), common scale inside each section,
// rows sorted by change. Position on a common scale is the course's rule for showing a change (ch. 5).
import * as d3 from 'd3'
import { groupColor, groupText } from '../lib/palette.js'
import { hideTip, showTip } from '../lib/tooltip.js'

export const WEEK_COLORS = { W1: '#b4a7d6', W2: '#51127c' }
const week = (t) => (t.getDate() < 8 ? 'W1' : 'W2')

export default function WeekChange() {
  let width = 400
  let height = 400
  let topics = []
  let groups = []
  let actorById = {}
  let selectedTheme = null
  const margin = { top: 30, right: 62, bottom: 6, left: 150 } // right: room for «+55 msg»
  const dispatch = d3.dispatch('theme', 'group')

  function count(messages, keyOf, names, kind) {
    const c = new Map(names.map((n) => [n, { W1: 0, W2: 0 }]))
    for (const m of messages) for (const k of keyOf(m)) c.get(k) && c.get(k)[week(m.t)]++
    return names.map((name) => ({ kind, name, w1: c.get(name).W1, w2: c.get(name).W2 }))
      .sort((a, b) => b.w2 - b.w1 - (a.w2 - a.w1) || d3.ascending(a.name, b.name))
  }

  function chart(selection) {
    selection.each(function (messages) {
      const themes = count(messages, (m) => m.themes, topics, 'tema')
      const grps = count(messages, (m) => [actorById[m.from]?.group ?? 'Altri'], groups, 'gruppo')
        .filter((r) => r.w1 + r.w2 > 0)
      const svg = d3.select(this).selectAll('svg').data([null]).join('svg').attr('class', 'chart')
        .attr('width', width).attr('height', height)
      const innerW = width - margin.left - margin.right
      const rowH = Math.min(22, (height - margin.top - margin.bottom - 26 - 28) / Math.max(1, themes.length + grps.length))
      const sections = [
        { title: 'Temi (messaggi che ne parlano)', rows: themes, y0: 0 },
        { title: 'Gruppi (messaggi inviati)', rows: grps, y0: themes.length * rowH + 26 },
      ]

      // legend: W1 → W2
      const leg = svg.selectAll('g.legend').data([null]).join('g').attr('class', 'legend').attr('transform', `translate(${margin.left},12)`)
      leg.selectAll('circle').data(['W1', 'W2']).join('circle').attr('cx', (w, i) => i * 120).attr('r', 5).attr('fill', (w) => WEEK_COLORS[w])
      leg.selectAll('text').data(['W1 · 1–7 ott', 'W2 · 8–14 ott']).join('text').attr('x', (w, i) => i * 120 + 9)
        .attr('dy', '0.35em').attr('font-size', 11).text((w) => w)

      const g = svg.selectAll('g.plot').data([null]).join('g').attr('class', 'plot')
        .attr('transform', `translate(${margin.left},${margin.top})`)
      const sec = g.selectAll('g.section').data(sections).join('g').attr('class', 'section')
        .attr('transform', (s) => `translate(0,${s.y0})`)
      sec.selectAll('text.title').data((s) => [s.title]).join('text').attr('class', 'title')
        .attr('x', -margin.left + 4).attr('y', 6).attr('font-size', 11).attr('font-weight', 600).attr('fill', '#555').text((t) => t)

      sec.each(function (s) {
        const x = d3.scaleLinear().domain([0, d3.max(s.rows, (r) => Math.max(r.w1, r.w2)) || 1]).range([0, innerW]).nice()
        const rows = d3.select(this).selectAll('g.row').data(s.rows, (r) => r.name).join((enter) => {
          const r = enter.append('g').attr('class', 'row').style('cursor', 'pointer')
          r.append('rect').attr('class', 'hit').attr('fill', 'transparent')
          r.append('text').attr('class', 'name').attr('x', -8).attr('dy', '0.35em').attr('text-anchor', 'end').attr('font-size', 11)
          r.append('line').attr('class', 'link').attr('stroke', '#bbb').attr('stroke-width', 2)
          r.append('circle').attr('class', 'w1').attr('r', 4.5).attr('fill', WEEK_COLORS.W1)
          r.append('circle').attr('class', 'w2').attr('r', 4.5).attr('fill', WEEK_COLORS.W2)
          r.append('text').attr('class', 'delta').attr('dy', '0.35em').attr('font-size', 10.5)
          return r
        })
        rows.attr('transform', (r, i) => `translate(0,${14 + i * rowH + rowH / 2})`)
          .on('click', (event, r) => dispatch.call(r.kind === 'tema' ? 'theme' : 'group', null, r.name))
          .on('mousemove', (event, r) => showTip(event, [r.name, `W1: ${r.w1} · W2: ${r.w2}`, r.kind === 'tema' ? 'clic: seleziona il tema' : 'clic: mostra solo questo gruppo']))
          .on('mouseleave', hideTip)
        rows.select('rect.hit').attr('x', -margin.left).attr('y', -rowH / 2).attr('width', width).attr('height', rowH)
        rows.select('text.name').text((r) => r.name)
          .attr('font-weight', (r) => (r.name === selectedTheme ? 700 : 400))
          .attr('fill', (r) => (r.kind === 'gruppo' ? groupText(r.name) : '#333'))
        rows.select('line.link').attr('x1', (r) => x(r.w1)).attr('x2', (r) => x(r.w2))
        rows.select('circle.w1').attr('cx', (r) => x(r.w1))
        rows.select('circle.w2').attr('cx', (r) => x(r.w2))
        rows.select('text.delta').attr('x', (r) => x(Math.max(r.w1, r.w2)) + 8)
          .text((r) => `${r.w2 - r.w1 > 0 ? '+' : ''}${r.w2 - r.w1} msg`)
          .attr('fill', (r) => (r.w2 === r.w1 ? '#999' : '#333'))
      })
    })
  }

  chart.width = (v) => ((width = v), chart)
  chart.height = (v) => ((height = v), chart)
  chart.topics = (v) => ((topics = v), chart)
  chart.groups = (v) => ((groups = v), chart)
  chart.actorById = (v) => ((actorById = v), chart)
  chart.selectedTheme = (v) => ((selectedTheme = v), chart)
  chart.on = (...args) => (dispatch.on(...args), chart)
  return chart
}
