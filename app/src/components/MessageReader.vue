<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { timeFormat } from 'd3'
import { data } from '../data.js'
import { highlightText } from '../lib/highlight.js'
import { groupColor } from '../lib/palette.js'

const props = defineProps({
  messages: { type: Array, required: true }, // already filtered (and narrowed to the highlight, if any)
  theme: { type: String, default: null },
  selectedId: { type: String, default: null },
  showInferred: { type: Boolean, default: false },
})
const emit = defineEmits(['select'])

const fmt = timeFormat('%a %d %b, %H:%M')
const d = data.value
const colorOf = (id) => groupColor(d.actorById[id]?.group)
const eventsByMsg = Object.groupBy
  ? Object.groupBy(d.messageEvents, (e) => e.msg)
  : d.messageEvents.reduce((acc, e) => ((acc[e.msg] ??= []).push(e), acc), {})
const regexes = computed(() => (props.theme ? [new RegExp(d.meta.topics[props.theme], 'i')] : []))

const list = ref(null)
watch(
  () => props.selectedId,
  async (id) => {
    await nextTick()
    list.value?.querySelector(`[data-id="${id}"]`)?.scrollIntoView({ block: 'nearest' })
  },
)
</script>

<template>
  <div ref="list" class="absolute inset-0 overflow-y-auto pr-1">
    <article
      v-for="m in messages"
      :key="m.id"
      :data-id="m.id"
      class="mb-2 cursor-pointer rounded border p-2 text-xs leading-snug hover:bg-page"
      :class="m.id === selectedId ? 'border-ink border-2' : 'border-line'"
      @click="emit('select', m.id)"
    >
      <header class="mb-1 flex flex-wrap items-center gap-x-1 text-[11px]">
        <span class="inline-block h-2.5 w-2.5 rounded-full" :style="{ background: colorOf(m.from) }" />
        <b>{{ m.from }}</b>
        <span class="text-muted">→</span>
        <span class="inline-block h-2.5 w-2.5 rounded-full" :style="{ background: colorOf(m.to) }" />
        <b>{{ m.to }}</b>
        <span class="ml-auto text-muted">{{ fmt(m.t) }}</span>
      </header>
      <p>
        <template v-for="(p, i) in highlightText(m.text, regexes)" :key="i">
          <b v-if="p.hit" class="bg-amber-100">{{ p.text }}</b><template v-else>{{ p.text }}</template>
        </template>
      </p>
      <p v-if="m.signedAs && m.signedAs !== m.from" class="mt-1 text-[11px] text-muted">
        firmato nel testo come «{{ m.signedAs }}»
      </p>
      <ul v-if="showInferred && eventsByMsg[m.id]" class="mt-1 text-[11px] text-muted italic">
        <li v-for="e in eventsByMsg[m.id]" :key="e.event">
          → evento {{ e.type }} <span v-if="e.inferred">(collegamento inferito)</span>
        </li>
      </ul>
    </article>
  </div>
</template>
