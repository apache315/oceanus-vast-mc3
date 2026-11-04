<script setup>
import { computed } from 'vue'
import { data } from '../data.js'
import { identityEffects } from '../lib/identity.js'
import { selection, setIdentities } from '../store.js'

const merges = computed(() => Object.entries(selection.identities.merges))
const hypothesis = computed(() => selection.identities.merges[selection.alias] === selection.candidate)
const effects = computed(() => identityEffects(data.value?.messages ?? [], selection.identities))

const setCorrected = (on) => setIdentities({ ...selection.identities, corrected: on })
function toggleHypothesis(on) {
  const m = { ...selection.identities.merges }
  if (on) m[selection.alias] = selection.candidate
  else delete m[selection.alias]
  setIdentities({ ...selection.identities, merges: m })
}
function removeMerge(alias) {
  const m = { ...selection.identities.merges }
  delete m[alias]
  setIdentities({ ...selection.identities, merges: m })
}
</script>

<template>
  <div class="flex flex-col gap-1.5 text-[12.5px]">
    <label class="flex cursor-pointer items-start gap-2">
      <input type="checkbox" class="mt-0.5" :checked="selection.identities.corrected" @change="setCorrected($event.target.checked)" />
      <span>Usa il mittente scritto nel testo <span class="text-muted">(consigliato: «Davis, Mako here» = scrive Mako, anche se la radio
        ha registrato Davis)</span></span>
    </label>
    <label class="flex cursor-pointer items-start gap-2">
      <input type="checkbox" class="mt-0.5" :checked="hypothesis" @change="toggleHypothesis($event.target.checked)" />
      <span>Tratta <b>«{{ selection.alias }}»</b> e <b>{{ selection.candidate }}</b> come la stessa persona
        <span class="text-muted">(ipotesi dell'analista)</span></span>
    </label>
    <ul v-if="merges.length" class="ml-6 text-muted">
      <li v-for="[a, b] in merges" :key="a">
        ipotesi attiva: {{ a }} = {{ b }} <button class="ml-1 hover:text-ink" title="Togli" @click="removeMerge(a)">✕</button>
      </li>
    </ul>
    <div class="mt-1 rounded bg-amber-50 px-2 py-1 text-[12px] leading-snug text-amber-900">
      <p v-if="selection.identities.corrected">
        <b>{{ effects.corrected }} messaggi corretti</b> in tutte le pagine: la radio aveva sbagliato il mittente
        ({{ effects.wrongSender }}) o il destinatario ({{ effects.wrongReceiver }}).
      </p>
      <p v-else>
        Stai vedendo i dati grezzi della radio: <b>{{ effects.corrected }} messaggi</b> hanno mittente o destinatario sbagliato,
        {{ effects.selfLoops }} sembrano mandati a sé stessi (es. Davis → Davis).
      </p>
      <p v-for="m in effects.merges" :key="m.alias">
        Ipotesi: <b>{{ m.n }} messaggi</b> di o a «{{ m.alias }}» ora contano come di {{ m.who }}.
      </p>
    </div>
  </div>
</template>
