// The messages every page works on: the unified ones (page 3) filtered by groups, period and theme.
import { computed } from 'vue'
import { data } from '../data.js'
import { selection } from '../store.js'
import { applyIdentities } from './identity.js'
import { visibleMessages } from './view.js'

export const effectiveMessages = computed(() =>
  data.value ? applyIdentities(data.value.messages, selection.identities) : [],
)
export const shownMessages = computed(() =>
  data.value ? visibleMessages(effectiveMessages.value, data.value.actorById, selection) : [],
)
