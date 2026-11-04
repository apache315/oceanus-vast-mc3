<script setup>
import { computed } from 'vue'
import { aliasTalkTitle, groupThemeTitle } from '../lib/titles.js'
import EntityGraph from '../charts/EntityGraph.js'
import GroupTheme from '../charts/GroupTheme.js'
import ChartCard from '../components/ChartCard.vue'
import { data } from '../data.js'
import { effectiveMessages, shownMessages } from '../lib/messages.js'
import { visibleMessages } from '../lib/view.js'
import { useChart } from '../lib/useChart.js'
import { openPanel, selection } from '../store.js'
import * as d3 from 'd3'
import { typeSymbol } from '../lib/palette.js'

const SHAPES = [['Person', 'persona'], ['Vessel', 'barca'], ['Organization', 'organizzazione'], ['Location', 'luogo']].map(
  ([t, label]) => ({ label, d: d3.symbol(typeSymbol(t), 50)() }),
)

const d = data.value
const themeMessages = computed(() => visibleMessages(effectiveMessages.value, d.actorById, { ...selection, theme: null }))
const graphTitle = computed(() => aliasTalkTitle(shownMessages.value, d.actorById))
const themeTitle = computed(() => groupThemeTitle(themeMessages.value, d.actorById, Object.keys(d.meta.topics)))
const EDGE_TYPES = [
  ['messaggi', 'messaggi'],
  ['menzioni', 'menzioni'],
  ['relazioni', 'relazioni'],
]
const btn = (on) => `rounded border px-2 py-0.5 text-xs ${on ? 'border-ink bg-ink text-white' : 'border-line hover:bg-page'}`

const graph = EntityGraph()
  .data(d)
  .on('actor', (id) => (selection.actor = selection.actor === id ? null : id))
  .on('edge', (e) => openPanel(`${e.a} — ${e.b} (${selection.edgeType})`, e.ids))
const graphEl = useChart(graph, (chart) => {
  chart.selected(selection.actor).theme(selection.theme)
  return { messages: shownMessages.value, edgeType: selection.edgeType }
})

const themes = GroupTheme()
  .actorById(d.actorById)
  .topics(Object.keys(d.meta.topics))
  .on('cell', (c) => openPanel(`${c.group} · ${c.theme}`, c.ids))
// the table ignores the theme filter: it is where the themes are compared
const themesEl = useChart(themes, (chart) => {
  chart.selected(selection.theme ? { group: null, theme: selection.theme } : null)
  return themeMessages.value
})
</script>

<template>
  <div class="flex flex-col gap-2">
    <p class="shrink-0 text-[13px] text-[#1f3a5f]">
      <b>Domanda 2 della challenge: quali gruppi di persone e barche esistono, e di cosa parla ciascuno?</b>
    </p>
    <div class="grid min-h-0 flex-1 grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-2.5">
      <ChartCard
        :title="graphTitle"
        how-to="Ogni nodo è un attore: colore = gruppo, forma = tipo (cerchio persona, triangolo barca, quadrato organizzazione, rombo luogo), area = messaggi. Ogni gruppo ha la sua zona; gli archi tra zone sono i ponti. Il tipo di arco cambia la fonte (messaggi scambiati, menzioni nel testo, relazioni del grafo dello stagista) senza spostare i nodi. Con un tema scelto contano solo i messaggi su quel tema. Rotella per ingrandire, clic su un nodo per selezionarlo, su un arco per leggere i messaggi."
        :n="shownMessages.length"
      >
        <template #tools>
          <span class="text-xs text-muted">archi:</span>
          <button v-for="[k, l] in EDGE_TYPES" :key="k" :class="btn(selection.edgeType === k)" @click="selection.edgeType = k">{{ l }}</button>
        </template>
        <div ref="graphEl" class="absolute inset-0" />
        <div class="pointer-events-none absolute bottom-1 left-1 flex gap-3 rounded bg-white/85 px-2 py-0.5 text-[11px] text-muted">
          <span v-for="s in SHAPES" :key="s.label" class="flex items-center gap-1">
            <svg width="12" height="12" viewBox="-6 -6 12 12"><path :d="s.d" fill="#666" /></svg>{{ s.label }}
          </span>
          <span>· area = messaggi · colore = gruppo</span>
        </div>
      </ChartCard>
      <ChartCard
        :title="themeTitle"
        how-to="Quota dei messaggi inviati da ogni gruppo che toccano il tema (temi trovati con parole chiave: approssimazione). Clic su una cella per leggere i messaggi."
        :n="shownMessages.length"
      >
        <div ref="themesEl" class="absolute inset-0" />
      </ChartCard>
    </div>
  </div>
</template>
