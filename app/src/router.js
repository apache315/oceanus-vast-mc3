import { createRouter, createWebHashHistory } from 'vue-router'
import Groups from './views/Groups.vue'
import Nadia from './views/Nadia.vue'
import Pseudonyms from './views/Pseudonyms.vue'
import Rhythms from './views/Rhythms.vue'

export const PAGES = [
  { path: '/ritmi', label: 'Q1 · Ritmi e influenze', component: Rhythms },
  { path: '/gruppi', label: 'Q2 · Gruppi e temi', component: Groups },
  { path: '/pseudonimi', label: 'Q3 · Pseudonimi', component: Pseudonyms },
  { path: '/nadia', label: 'Q4 · Nadia Conti', component: Nadia },
]

export default createRouter({
  history: createWebHashHistory(),
  routes: [{ path: '/', redirect: '/ritmi' }, ...PAGES.map(({ path, component }) => ({ path, component }))],
})
