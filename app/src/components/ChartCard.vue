<script setup>
import { resetFilters } from '../store.js'
import { hideTip, showTip } from '../lib/tooltip.js'

const props = defineProps({ title: String, howTo: String, n: { type: Number, default: null } })
const info = (event) => showTip(event, ['Come leggerlo', props.howTo])
</script>

<template>
  <section class="flex min-h-0 flex-col rounded border border-line bg-panel px-3 pt-2 pb-2">
    <header class="mb-1 flex items-center gap-2">
      <h2 class="text-[13px] font-semibold">{{ title }}</h2>
      <span
        v-if="howTo"
        class="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-muted text-[10px] text-muted"
        @mousemove="info"
        @mouseleave="hideTip"
        >i</span
      >
      <div class="ml-auto flex items-center gap-2"><slot name="tools" /></div>
    </header>
    <div v-if="n === 0" class="flex flex-1 flex-col items-center justify-center gap-2 py-6 text-sm text-muted">
      Nessun messaggio nella selezione
      <button class="rounded border border-ink px-2 py-0.5 text-xs text-ink" @click="resetFilters">Azzera filtri</button>
    </div>
    <div v-show="n !== 0" class="relative min-h-0 flex-1"><slot /></div>
  </section>
</template>
