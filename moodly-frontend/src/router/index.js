import { createRouter, createWebHistory } from 'vue-router'
import EmployeeView from '../views/EmployeeView.vue'
import ManagerView from '../views/ManagerView.vue'
import LoginView from '../views/LoginView.vue'
import { isManager } from '../api'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/login', name: 'login', component: LoginView },
    { path: '/', name: 'employee', component: EmployeeView, meta: { requiresAuth: true } },
    {
      path: '/manager',
      name: 'manager',
      component: ManagerView,
      meta: { requiresAuth: true, requiresManager: true }
    }
  ]
})

router.beforeEach((to) => {
  const token = localStorage.getItem('token')

  if (to.meta.requiresAuth && !token) return '/login'
  if (to.meta.requiresManager && !isManager()) return '/'
  if (to.path === '/login' && token) return isManager() ? '/manager' : '/'
})

export default router