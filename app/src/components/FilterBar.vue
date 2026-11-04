<script setup>
import { computed } from 'vue'
import { data } from '../data.js'
import { GROUPS, groupColor } from '../lib/palette.js'
import { countLabel } from '../lib/view.js'
import { resetFilters, selection } from '../store.js'

const props = defineProps({ n: { type: Number, required: true }, total: { type: Number, required: true } })
const topics = computed(() => Object.keys(data.value.meta.topics))
const periods = [['all', '14 giorni'], ['W1', 'settimana 1'], ['W2', 'settimana 2']]
const isDay = computed(() => /^\d{4}-/.test(selection.period))

function toggleGroup(g) {
  selection.groups = selection.groups.includes(g)
    ? selection.groups.filter((x) => x !== g)
    : GROUPS.filter((x) => x === g || selection.groups.includes(x))
}
const chip = (on) => `rounded-full border px-2.5 py-0.5 text-xs ${on ? 'border-ink' : 'border-line text-muted line-through'}`
const btn = (on) => `rounded border px-2 py-0.5 text-xs ${on ? 'border-ink bg-ink text-white' : 'border-line hover:bg-page'}`
</script>

<template>
  <div class="flex shrink-0 flex-wrap items-center gap-x-5 gap-y-1 border-b border-line bg-panel px-4 py-2 text-xs">
    <div class="flex items-center gap-1.5">
      <span class="text-muted">gruppi</span>
      <button v-for="g in GROUPS" :key="g" :class="chip(selection.groups.includes(g))" @click="toggleGroup(g)">
        <span class="mr-1 inline-block h-2 w-2 rounded-full" :style="{ background: groupColor(g) }" />{{ g }}
      </button>
    </div>
    <div class="flex items-center gap-1">
      <span class="text-muted">periodo</span>
      <button v-for="[k, l] in periods" :key="k" :class="btn(selection.period === k)" @click="selection.period = k">{{ l }}</button>
      <button v-if="isDay" :class="btn(true)" title="Torna ai 14 giorni" @click="selection.period = 'all'">{{ selection.period }} ✕</button>
    </div>
    <label class="flex items-center gap-1">
      <span class="text-muted">tema</span>
      <select v-model="selection.theme" class="rounded border border-line px-1 py-0.5">
        <option :value="null">tutti</option>
        <option v-for="t in topics" :key="t" :value="t">{{ t }}</option>
      </select>
    </label>
    <span class="ml-auto font-medium">{{ countLabel(props.n, props.total) }}</span>
    <button class="rounded border border-ink px-2 py-0.5 font-medium hover:bg-page" @click="resetFilters">Azzera filtri</button>
  </div>
</template>
