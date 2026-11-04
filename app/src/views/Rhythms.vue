<script setup>
import { computed } from 'vue'
import * as d3 from 'd3'
import Calendar from '../charts/Calendar.js'
import CitedHours, { outsideShare } from '../charts/CitedHours.js'
import Influence from '../charts/Influence.js'
import Roles from '../charts/Roles.js'
import WeekChange from '../charts/WeekChange.js'
import ChartCard from '../components/ChartCard.vue'
import { data } from '../data.js'
import { chainsFor } from '../lib/chains.js'
import { effectiveMessages, shownMessages } from '../lib/messages.js'
import { GROUPS } from '../lib/palette.js'
import { dayKey, periodRange, visibleMessages } from '../lib/view.js'
import { useChart } from '../lib/useChart.js'
import { calendarTitle, influenceTitle, relationsTitle, weekTitle } from '../lib/titles.js'
import { openPanel, selection } from '../store.js'

const d = data.value
const allDays = d3.timeDay.range(new Date('2040-10-01T00:00'), new Date('2040-10-15T00:00')).map(dayKey)
const days = computed(() => {
  const r = periodRange(selection.period)
  return r ? allDays.filter((x) => new Date(`${x}T12:00`) >= r[0] && new Date(`${x}T12:00`) < r[1]) : allDays
})
// influence and relations need an actor: Nadia Conti (the thread of the case) until another one is chosen
const focus = computed(() => selection.actor ?? 'Nadia Conti')
const chains = computed(() => (focus.value ? chainsFor(focus.value, shownMessages.value) : []))
const isActor = (m) => !selection.actor || m.from === selection.actor || m.to === selection.actor

const titles = computed(() => ({
  calendar: calendarTitle(shownMessages.value, d.meta.keyDates),
  week: weekTitle(weekMessages.value, Object.keys(d.meta.topics)),
  influence: influenceTitle(focus.value, chains.value),
  relations: relationsTitle(focus.value, d.relations),
}))

const calendar = Calendar()
  .actorById(d.actorById)
  .on('message', (id) => openPanel('Messaggio', [id]))
  .on('day', (day) => (selection.period = selection.period === day ? 'all' : day))
const calendarEl = useChart(calendar, (chart) => {
  chart.days(days.value).highlight(isActor)
  return shownMessages.value
})

const cited = CitedHours().radioWindow(d.meta.radioWindow)
const citedMessages = computed(() => shownMessages.value.filter(isActor))
const citedEl = useChart(cited, () => citedMessages.value)
const citedTitle = computed(() => {
  const p = outsideShare(citedMessages.value, d.meta.radioWindow)
  if (p == null) return 'Nessun orario citato nei testi'
  return p >= 50 ? `Gli appuntamenti citati nei testi sono fuori dall'orario radio (${p}%)` : `Gli orari citati nei testi cadono soprattutto nell'orario radio (${100 - p}%)`
})

// the week comparison needs both weeks: it ignores the period filter
const weekMessages = computed(() => visibleMessages(effectiveMessages.value, d.actorById, { ...selection, period: 'all' }).filter(isActor))
const change = WeekChange()
  .actorById(d.actorById)
  .topics(Object.keys(d.meta.topics))
  .groups(GROUPS)
  .on('theme', (t) => (selection.theme = selection.theme === t ? null : t))
  .on('group', (g) => (selection.groups = [g]))
const changeEl = useChart(change, (chart) => {
  chart.selectedTheme(selection.theme)
  return weekMessages.value
})

const influence = Influence()
  .actorById(d.actorById)
  .on('focus', (id) => (selection.actor = id))
  .on('chains', (list, label) => openPanel(`${label}: ${list.length} catene`, [...new Set(list.flatMap((c) => [c.m1, c.m2]))]))
const influenceEl = useChart(influence, (chart) => {
  chart.chains(chains.value)
  return focus.value
})

const roles = Roles()
  .relations(d.relations)
  .actorById(d.actorById)
  .on('relation', (b) => openPanel(`${b.text}: messaggi a sostegno`, b.ids))
const rolesEl = useChart(roles, () => focus.value)
</script>

<template>
  <div class="flex flex-col gap-2">
    <p class="shrink-0 text-[13px] text-[#1f3a5f]">
      <b>Domanda 1 della challenge: quali sono i ritmi giornalieri dei messaggi, come cambiano nelle due settimane e chi influenza un attore?</b>
    </p>
    <div class="grid min-h-0 flex-1 grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] grid-rows-[minmax(0,1.75fr)_minmax(0,1fr)] gap-2.5">
      <div class="grid min-h-0 grid-rows-[minmax(0,1fr)_112px] gap-2.5">
        <ChartCard
          :title="titles.calendar"
          how-to="Una riga per giorno, una lineetta per messaggio sull'ora di invio; colore = gruppo di chi scrive (legenda nei filtri in alto), più scuro = più messaggi vicini. Con un attore scelto, i suoi messaggi restano pieni. Clic su un giorno per ingrandirlo, su una lineetta per leggere il messaggio."
          :n="shownMessages.length"
        >
          <div ref="calendarEl" class="absolute inset-0" />
        </ChartCard>
        <ChartCard
          :title="citedTitle"
          how-to="Le ore scritte dentro i messaggi («meet at 0500», «7PM»), da 0 a 24: dicono quando si agisce, non quando si parla. In grigio l'orario in cui si usa la radio (8–15)."
        >
          <div ref="citedEl" class="absolute inset-0" />
        </ChartCard>
      </div>
      <ChartCard
        :title="titles.week"
        how-to="Per ogni tema e ogni gruppo: pallino chiaro = settimana 1 (1–7 ott), scuro = settimana 2 (8–14 ott), sulla stessa scala; ordinati dal maggiore aumento. Con un attore scelto conta solo i suoi messaggi. Temi trovati con parole chiave (approssimazione). Clic su un tema per filtrarlo."
      >
        <div ref="changeEl" class="absolute inset-0" />
      </ChartCard>
      <ChartCard
        :title="titles.influence"
        how-to="A sinistra chi scrive all'attore poco prima che lui scriva ad altri (entro 15 minuti); a destra a chi scrive subito dopo. Spessore = quante volte. È una precedenza nel tempo, non una prova di comando. Si parte da Nadia Conti: scegli un altro attore in alto o clic su un nome per spostare il centro; clic su un collegamento per leggere i messaggi."
      >
        <div ref="influenceEl" class="absolute inset-0" />
      </ChartCard>
      <ChartCard
        :title="titles.relations"
        how-to="Tutte le relazioni che il grafo dello stagista registra con l'attore (chi coordina, chi riferisce, chi sospetta…), scritte come frasi. Barra = quanti messaggi le sostengono, chiara se uno solo. Clic per leggerli."
      >
        <div ref="rolesEl" class="absolute inset-0" />
      </ChartCard>
    </div>
  </div>
</template>
