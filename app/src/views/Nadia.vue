<script setup>
import { computed, ref } from 'vue'
import Actions, { actionMarks } from '../charts/Actions.js'
import WhoWith from '../charts/WhoWith.js'
import ChartCard from '../components/ChartCard.vue'
import { data } from '../data.js'
import { shownMessages } from '../lib/messages.js'
import { useChart } from '../lib/useChart.js'
import { actionsTitle, whoWithTitle } from '../lib/titles.js'
import { openPanel, selection } from '../store.js'

const d = data.value
// this page is about Nadia Conti; another actor chosen in the top bar is shown instead
const actor = computed(() => selection.actor ?? 'Nadia Conti')
const person = ref(null)
const marks = computed(() => actionMarks(actor.value, selection.identities.merges, d))
const hypotheses = computed(() => Object.entries(selection.identities.merges).filter(([, w]) => w === actor.value).map(([a]) => a))

const actions = Actions().data(d).on('message', (id) => openPanel('Messaggio', [id]))
const actionsEl = useChart(actions, (chart) => {
  chart.highlight(person.value)
  return { actor: actor.value, messages: shownMessages.value, merges: selection.identities.merges }
})

const who = WhoWith().data(d).on('person', (p) => {
  person.value = person.value === p ? null : p
  if (person.value) openPanel(`Azioni con ${p}`, marks.value.filter((a) => a.con === p).map((a) => a.msg))
})
const whoEl = useChart(who, (chart) => {
  chart.selected(person.value)
  return { actor: actor.value, marks: marks.value }
})
</script>

<template>
  <div class="flex flex-col gap-2">
    <p class="shrink-0 text-[13px] text-[#1f3a5f]">
      <b>Domanda 4 della challenge: Nadia Conti sta facendo qualcosa di illegale?</b>
      <span v-if="hypotheses.length" class="ml-1 rounded bg-amber-100 px-1.5 text-amber-900">
        include le azioni di {{ hypotheses.join(', ') }} (ipotesi della pagina 3, tratteggiate)
      </span>
    </p>
    <div class="grid min-h-0 flex-1 grid-rows-[minmax(0,1.5fr)_minmax(0,1fr)] gap-2.5">
      <ChartCard
        :title="actionsTitle(actor, marks)"
        how-to="Righe = tipo di azione: è una codifica dell'analista fatta leggendo i messaggi, non un dato del grafo. In alto, in grigio, tutti i messaggi scritti, ricevuti o in cui la persona è citata. Pieno = messaggio suo; vuoto = riferito da altri (prova più debole); tratteggiato = attribuito tramite un'ipotesi sugli alias. Colore = gruppo della persona con cui avviene l'azione. In fondo la prova contraria. Clic su un segno per leggere il messaggio."
      >
        <template #tools>
          <span class="flex items-center gap-3 text-[11px] text-muted">
            <span class="flex items-center gap-1"><svg width="12" height="12"><circle cx="6" cy="6" r="4.5" fill="#777" /></svg>messaggio suo</span>
            <span class="flex items-center gap-1"><svg width="12" height="12"><circle cx="6" cy="6" r="4.5" fill="#fff" stroke="#777" stroke-width="1.6" /></svg>riferito da altri</span>
            <span v-if="hypotheses.length" class="flex items-center gap-1"><svg width="12" height="12"><circle cx="6" cy="6" r="4.5" fill="#ddd" stroke="#777" stroke-width="1.6" stroke-dasharray="3,2" /></svg>via ipotesi alias</span>
            <span>colore = gruppo della persona coinvolta</span>
          </span>
        </template>
        <div ref="actionsEl" class="absolute inset-0" />
      </ChartCard>
      <ChartCard
        :title="whoWithTitle(marks, d.relations, actor)"
        how-to="Le persone coinvolte nelle azioni codificate (lunghezza = numero di azioni) e, accanto, cosa registra il grafo dello stagista tra le due persone, con i messaggi a sostegno. In marrone: il grafo non registra nessuna relazione tra i due, anche se i messaggi li mostrano insieme. Clic su una persona per evidenziare le sue azioni e leggerle."
      >
        <div ref="whoEl" class="absolute inset-0" />
      </ChartCard>
    </div>
  </div>
</template>
