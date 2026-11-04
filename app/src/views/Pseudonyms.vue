<script setup>
import { computed } from 'vue'
import Presence, { handoff } from '../charts/Presence.js'
import Attribution, { RIBBON } from '../charts/Attribution.js'
import ChartCard from '../components/ChartCard.vue'
import UnifyPanel from '../components/UnifyPanel.vue'
import { data } from '../data.js'
import { attributionPairs } from '../lib/identity.js'
import { useChart } from '../lib/useChart.js'
import { attributionTitle } from '../lib/titles.js'
import { openPanel, selection } from '../store.js'

const d = data.value
// read on the exported messages (radio metadata + text): it is what justifies the correction
const pairs = attributionPairs(d.messages)
const nPairs = pairs.reduce((s, p) => s + p.n, 0)
const nRecipient = pairs.reduce((s, p) => s + p.kinds.scambio + p.kinds['auto-anello'], 0)
const aliases = d.actors.filter((a) => a.alias).map((a) => a.id)
const people = d.actors.filter((a) => !a.alias && a.type === 'Person').map((a) => a.id)
// the conclusion of the bars, in words (it changes with the alias and the candidate)
const verdict = computed(() => {
  const a = `«${selection.alias}»`
  const b = selection.candidate
  const ab = handoff([selection.alias, b], d.messages)
  const ba = handoff([b, selection.alias], d.messages)
  if (ab.lastA == null) return `${a} non invia messaggi`
  if (ab.firstB == null) return `${b} non invia messaggi`
  if (ab.stops) return `${a} smette di scrivere ${ab.lastA === ab.firstB ? 'il giorno in cui' : 'prima che'} cominci ${b}`
  if (ba.stops) return `${b} smette di scrivere ${ba.lastA === ba.firstB ? 'il giorno in cui' : 'prima che'} cominci ${a}`
  return `${a} e ${b} scrivono negli stessi giorni (${ab.shared.length} in comune)`
})

const attribution = Attribution()
  .actorById(d.actorById)
  .relations(d.relations)
  .on('pair', (p) => openPanel(`registrato ${p.radioFrom}, scritto da ${p.from}`, p.ids))
  .on('name', (n) => (selection.actor = n))
const attributionEl = useChart(attribution, (chart) => {
  chart.highlight(selection.actor)
  return pairs
})

const presence = Presence()
  .actorById(d.actorById)
  .on('day', (b) => openPanel(`${b.name} · ${b.day} ottobre: messaggi inviati`, b.ids))
const presenceEl = useChart(presence, () => ({ names: [selection.alias, selection.candidate], messages: d.messages }))
</script>

<template>
  <div class="flex flex-col gap-2">
    <p class="shrink-0 text-[13px] text-[#1f3a5f]">
      <b>Domanda 3 della challenge: chi si nasconde dietro gli pseudonimi?</b>
    </p>
    <div class="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] gap-2.5">
      <ChartCard
        :title="attributionTitle(nPairs, nRecipient)"
        :how-to="`La radio registra un mittente, il testo dice chi scrive davvero («Davis, Mako here» = scrive Mako). A sinistra il mittente registrato dalla radio, a destra quello scritto nel testo; spessore = numero di messaggi. Grigio = errore della radio (ha messo il destinatario al posto del mittente): non è uno pseudonimo. Giallo = indizio: la firma non si spiega con un errore, e la nota dice cosa può voler dire. Clic su un nastro per leggere i messaggi.`"
      >
        <template #tools>
          <span class="flex items-center gap-1 text-[11px] text-muted"><i class="inline-block h-1 w-4" :style="{ background: RIBBON.errore }" />errore radio</span>
          <span class="flex items-center gap-1 text-[11px] text-muted"><i class="inline-block h-1 w-4" :style="{ background: RIBBON['da verificare'] }" />indizio</span>
        </template>
        <div ref="attributionEl" class="absolute inset-0" />
      </ChartCard>
      <div class="grid min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-2.5">
        <ChartCard
          :title="verdict"
          how-to="Messaggi inviati ogni giorno dall'alias (sopra) e dal candidato (sotto), sulla stessa scala; in grigio i giorni in cui scrivono tutti e due. Se un nome smette di scrivere quando l'altro comincia, è un indizio (non una prova) che siano la stessa persona. Clic su una barra per leggere i messaggi di quel giorno."
        >
          <template #tools>
            <select v-model="selection.alias" class="rounded border border-line px-1 py-0.5 text-xs" title="alias">
              <option v-for="a in aliases" :key="a" :value="a">{{ a }}</option>
            </select>
            <span class="text-xs text-muted">e</span>
            <select v-model="selection.candidate" class="rounded border border-line px-1 py-0.5 text-xs" title="candidato">
              <option v-for="p in people" :key="p" :value="p">{{ p }}</option>
            </select>
          </template>
          <div ref="presenceEl" class="absolute inset-0" />
        </ChartCard>
        <ChartCard title="Applica le correzioni a tutte le pagine">
          <UnifyPanel />
        </ChartCard>
      </div>
    </div>
  </div>
</template>
