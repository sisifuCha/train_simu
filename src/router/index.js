import { createRouter, createWebHashHistory } from 'vue-router'
import Dashboard from '../views/Dashboard.vue'
import ReferenceDiagram from '../views/ReferenceDiagram.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/',    component: Dashboard },
    { path: '/ref', component: ReferenceDiagram }
  ]
})

export default router
