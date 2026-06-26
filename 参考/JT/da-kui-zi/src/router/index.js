import { createRouter, createWebHistory } from 'vue-router'
import MainSystem from '@/views/MainSystem.vue'

const routes = [
  {
    path: '/',
    name: 'MainSystem',
    component: MainSystem
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router 