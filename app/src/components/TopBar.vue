<script setup>
import { computed } from 'vue'
import { data } from '../data.js'
import { PAGES } from '../router.js'
import { selection } from '../store.js'

const actors = computed(() => data.value.actors.map((a) => a.id))
const nIdentities = computed(() => Object.keys(selection.identities.merges).length)
const link = 'rounded px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-700 hover:text-white'

function setActor(e) {
  const v = e.target.value.trim()
  if (!v) selection.actor = null
  else if (data.value.actorById[v]) selection.actor = v
}
</script>

<template>
  <nav class="flex h-12 shrink-0 items-center gap-5 bg-slate-900 px-4">
    <span class="text-sm font-semibold tracking-wide text-white">Oceanus · intercettazioni radio</span>
    <div class="flex gap-1">
      <router-link v-for="p in PAGES" :key="p.path" :to="p.path" :class="link" active-class="!bg-slate-700 !text-white">
        {{ p.label }}
      </router-link>
    </div>
    <label class="ml-auto flex items-center gap-2 text-sm text-slate-300">
      attore
      <input
        list="actors"
        :value="selection.actor ?? ''"
        placeholder="cerca un nome…"
        class="w-44 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-white"
        @change="setActor"
      />
      <datalist id="actors"><option v-for="a in actors" :key="a" :value="a" /></datalist>
    </label>
    <router-link
      to="/pseudonimi"
      class="rounded px-2 py-1 text-xs"
      :class="nIdentities || !selection.identities.corrected ? 'bg-amber-200 text-amber-900' : 'text-slate-400'"
      title="Le identità unificate nella pagina Pseudonimi valgono per tutte le pagine"
    >
      {{ selection.identities.corrected ? '' : 'metadati radio originali · ' }}ipotesi sugli alias: {{ nIdentities }}
    </router-link>
  </nav>
</template>
