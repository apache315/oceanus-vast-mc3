// What does the person do, and when? (page 4, Q4) Annotated chart. Rows = type of action (analyst's coding of the
// texts) with the counter-evidence at the bottom and, on top, every message by or about the person (grey ticks).
// Filled = written or received by the person, hollow = reported by others, dashed = attributed through an alias
// hypothesis of page 3 (e.g. Boss = Nadia). Colour = group of the counterpart. Short notes on the key evidence.
import * as d3 from 'd3'
import { groupColor } from '../lib/palette.js'
import { clip, hideTip, showTip } from '../lib/tooltip.js'

export const CONTRA = 'prova contraria'

// coded actions of the actor, plus those of the aliases merged into it (viaAlias)
export function actionMarks(actor, merges, D) {
  const aliases = Object.entries(merges).filter(([, who]) => who === actor).map(([a]) => a)
  return D.actions
    .filter((a) => a.actor === actor || aliases.includes(a.actor))
    .map((a) => {
      const m = D.messageById[a.msg]
      const con = a.source === 'diretta' ? (m.from === a.actor ? m.to : m.from) : m.from
      return { ...a, t: m.t, text: m.text, con, viaAlias: a.actor !== actor }
    })
    .sort((a, b) => a.t - b.t)
}

export default function Actions() {
  let width = 900
  let height = 380
  let D = null
  let highlight = null // a counterpart
  const margin = { top: 34, right: 16, bottom: 22, left: 190 }
  const dispatch = d3.dispatch('message')
  const fmt = d3.timeFormat('%a %d %b, %H:%M')

  function chart(selection) {
    selection.each(function ({ actor, messages, merges }) {
      const svg = d3.select(this).selectAll('svg').data([null]).join('svg').attr('class', 'chart')
        .attr('width', width).attr('height', height)
      const g = svg.selectAll('g.plot').data([null]).join('g').attr('class', 'plot')
        .attr('transform', `translate(${margin.left},${margin.top})`)
      const innerW = width - margin.left - margin.right
      const innerH = height - margin.top - margin.bottom
      const marks = actor ? actionMarks(actor, merges, D) : []
      const coded = marks.length > 0
      const lanes = ['tutti i suoi messaggi', ...(coded ? [...D.meta.actionTypes, CONTRA] : [])]
      const x = d3.scaleTime().domain([new Date('2040-10-01T00:00'), new Date('2040-10-15T00:00')]).range([0, innerW])
      const y = d3.scaleBand().domain(lanes).range([0, coded ? innerH : 46]).padding(0.04)

      const mentioned = new Set(D.mentions.filter((m) => m.name === actor).map((m) => m.msg))
      const context = actor ? messages.filter((m) => m.from === actor || m.to === actor || mentioned.has(m.id)) : []

      svg.selectAll('text.note').data([!actor ? 'Scegli un attore in alto.' : coded ? '' : `Nessuna codifica manuale per ${actor}: si vedono solo i suoi messaggi.`])
        .join('text').attr('class', 'note').attr('x', margin.left).attr('y', 14).attr('font-size', 11.5).attr('fill', '#8a5a00').text((d) => d)

      g.selectAll('rect.lane').data(lanes, (l) => l).join('rect').attr('class', 'lane')
        .attr('x', 0).attr('width', innerW).attr('y', (l) => y(l)).attr('height', y.bandwidth())
        .attr('fill', (l) => (l === CONTRA ? '#fbeaea' : l === lanes[0] ? '#f2f2f2' : '#fff')).attr('stroke', '#e6e6e6')
      g.selectAll('text.lane').data(lanes, (l) => l).join('text').attr('class', 'lane')
        .attr('x', -10).attr('y', (l) => y(l) + y.bandwidth() / 2).attr('dy', '0.35em').attr('text-anchor', 'end')
        .attr('font-size', 11.5).attr('font-weight', (l) => (l === CONTRA ? 700 : 400))
        .attr('fill', (l) => (l === CONTRA ? '#8a1f1f' : '#333')).text((l) => l)
      g.selectAll('g.axis').data([null]).join('g').attr('class', 'axis')
        .call(d3.axisTop(x).ticks(d3.timeDay.every(1)).tickFormat(d3.timeFormat('%d')).tickSizeOuter(0))
      const keys = D.meta.keyDates
      g.selectAll('line.key').data(keys).join('line').attr('class', 'key')
        .attr('x1', (k) => x(new Date(k.t))).attr('x2', (k) => x(new Date(k.t))).attr('y1', 0).attr('y2', y.range()[1])
        .attr('stroke', '#888').attr('stroke-dasharray', '4,3')
      g.selectAll('text.key').data(keys).join('text').attr('class', 'key')
        .attr('x', (k, i) => x(new Date(k.t)) + (i % 2 ? 4 : -4)).attr('y', y.range()[1] + 14)
        .attr('text-anchor', (k, i) => (i % 2 ? 'start' : 'end')).attr('font-size', 10.5).attr('fill', '#555').text((k) => k.label)

      g.selectAll('line.context').data(context, (m) => m.id).join('line').attr('class', 'context')
        .attr('x1', (m) => x(m.t)).attr('x2', (m) => x(m.t)).attr('y1', y(lanes[0]) + 5).attr('y2', y(lanes[0]) + y.bandwidth() - 5)
        .attr('stroke', '#8f8f8f').attr('stroke-width', 1.5).style('cursor', 'pointer')
        .on('click', (event, m) => dispatch.call('message', null, m.id))
        .on('mousemove', (event, m) => showTip(event, [`${m.from} → ${m.to}`, fmt(m.t), clip(m.text)]))
        .on('mouseleave', hideTip)

      // actions of the same type on the same day are stacked inside the lane
      const keyOf = (a) => `${a.action}|${d3.timeDay.floor(a.t).getTime()}`
      const nSame = d3.rollup(marks, (v) => v.length, keyOf)
      const k = new Map()
      marks.forEach((a) => {
        a.k = k.get(keyOf(a)) ?? 0
        k.set(keyOf(a), a.k + 1)
      })
      const step = Math.min(12, y.bandwidth() / 3)
      const py = (a) => y(a.action) + y.bandwidth() / 2 + (a.k - (nSame.get(keyOf(a)) - 1) / 2) * step
      const color = (a) => groupColor(D.actorById[a.con]?.group)
      const on = (a) => !highlight || a.con === highlight

      g.selectAll('circle.mark').data(marks, (a) => `${a.msg}|${a.actor}`).join('circle').attr('class', 'mark')
        .attr('cx', (a) => x(a.t)).attr('cy', py).attr('r', 6)
        .attr('fill', (a) => (a.source === 'diretta' ? color(a) : 'white')).attr('stroke', color).attr('stroke-width', 2)
        .attr('stroke-dasharray', (a) => (a.viaAlias ? '3,2' : null)).attr('fill-opacity', (a) => (a.viaAlias ? 0.35 : 1))
        .attr('opacity', (a) => (on(a) ? 1 : 0.2)).style('cursor', 'pointer')
        .on('click', (event, a) => dispatch.call('message', null, a.msg))
        .on('mousemove', (event, a) => showTip(event, [a.summary, `${fmt(a.t)} · con ${a.con} · ${a.source === 'diretta' ? 'messaggio suo' : 'riferito da altri'}${a.viaAlias ? ` · via ipotesi ${a.actor} = ${actor}` : ''}`, clip(a.text)]))
        .on('mouseleave', hideTip)

      const notes = marks.filter((a) => D.meta.storyNotes[a.msg] && !a.viaAlias)
      g.selectAll('text.story').data(notes, (a) => a.msg).join('text').attr('class', 'story')
        .attr('x', (a) => x(a.t) + (x(a.t) > innerW * 0.8 ? -9 : 9)).attr('y', (a) => py(a) - 9)
        .attr('text-anchor', (a) => (x(a.t) > innerW * 0.8 ? 'end' : 'start'))
        .attr('font-size', 10.5).attr('font-style', 'italic').attr('pointer-events', 'none')
        .text((a) => D.meta.storyNotes[a.msg])
    })
  }

  chart.width = (v) => ((width = v), chart)
  chart.height = (v) => ((height = v), chart)
  chart.data = (v) => ((D = v), chart)
  chart.highlight = (v) => ((highlight = v), chart)
  chart.on = (...args) => (dispatch.on(...args), chart)
  return chart
}
