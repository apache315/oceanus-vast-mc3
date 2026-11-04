<script setup>
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import FilterBar from './components/FilterBar.vue'
import MessagePanel from './components/MessagePanel.vue'
import TopBar from './components/TopBar.vue'
import { data, loadData } from './data.js'
import { effectiveMessages, shownMessages } from './lib/messages.js'
import { applyQuery } from './store.js'

const router = useRouter()
const route = useRoute()

onMounted(async () => {
  await router.isReady()
  await loadData()
  applyQuery(route.query)
})
</script>

<template>
  <div class="flex h-full flex-col">
    <TopBar v-if="data" />
    <div v-if="data" class="flex min-h-0 flex-1">
      <div class="flex min-w-0 flex-1 flex-col">
        <FilterBar :n="shownMessages.length" :total="effectiveMessages.length" />
        <!-- keep-alive: the D3 views are not rebuilt when switching page -->
        <router-view v-slot="{ Component }">
          <keep-alive>
            <component :is="Component" class="min-h-0 flex-1 overflow-hidden p-2.5" />
          </keep-alive>
        </router-view>
      </div>
      <MessagePanel />
    </div>
    <p v-else class="p-6 text-sm text-muted">Caricamento dei dati…</p>
  </div>
</template>
