import { createRouter, createWebHistory } from 'vue-router'
import type { GameMode } from '../stores/gameStore'
import { h } from 'vue'

// Empty component for routes (App.vue handles rendering)
const EmptyComponent = { render: () => h('div') }

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'random',
      component: EmptyComponent,
      meta: { mode: 'random' as GameMode }
    },
    {
      path: '/daily',
      name: 'daily',
      component: EmptyComponent,
      meta: { mode: 'daily' as GameMode }
    },
    {
      path: '/hex',
      name: 'hex',
      component: EmptyComponent,
      meta: { mode: 'hex' }
    },
    {
      path: '/consequences',
      name: 'consequences',
      component: EmptyComponent,
      meta: { mode: 'consequences' }
    }
  ]
})

export default router
