<script setup>
import { computed } from 'vue'
import { data } from '../data.js'
import { closePanel, selection, toggle } from '../store.js'
import MessageReader from './MessageReader.vue'

const messages = computed(() => {
  const byId = data.value.messageById
  return (selection.panel?.ids ?? []).map((id) => byId[id]).filter(Boolean).sort((a, b) => a.t - b.t)
})
</script>

<template>
  <aside class="flex w-80 shrink-0 flex-col border-l border-line bg-panel">
    <header class="flex items-start gap-2 border-b border-line px-3 py-2">
      <div class="min-w-0 flex-1">
        <h2 class="text-[13px] font-semibold">Messaggi</h2>
        <p class="text-xs text-muted">{{ selection.panel ? `${selection.panel.title} · ${messages.length}` : 'le prove di ciò che clicchi' }}</p>
      </div>
      <button v-if="selection.panel" class="text-muted hover:text-ink" title="Chiudi" @click="closePanel">✕</button>
    </header>
    <div class="relative min-h-0 flex-1 p-2">
      <p v-if="!selection.panel" class="p-3 text-sm text-muted">
        Clicca un elemento di un grafico (un messaggio, un nastro, una relazione, una cella) per leggere qui i messaggi che lo sostengono.
      </p>
      <MessageReader
        v-else
        :messages="messages"
        :theme="selection.theme"
        :selected-id="selection.message"
        @select="(id) => toggle('message', id)"
      />
    </div>
  </aside>
</template>
