import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'

const routes = [
  { path: '/login', component: () => import('../views/Login.vue') },
  {
    path: '/',
    component: () => import('../views/Layout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/dashboard' },
      { path: 'dashboard',     component: () => import('../views/Dashboard.vue') },
      { path: 'meal-plan',     component: () => import('../views/MealPlan.vue') },
      { path: 'growth',        component: () => import('../views/Growth.vue') },
      { path: 'milk-water',    component: () => import('../views/MilkWater.vue') },
      { path: 'classes',       component: () => import('../views/Classes.vue') },
      { path: 'favorite-foods',component: () => import('../views/FavoriteFoods.vue') },
      { path: 'bowel',         component: () => import('../views/BowelRecord.vue') },
    ]
  },
  { path: '/:pathMatch(.*)*', redirect: '/dashboard' }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return '/login'
  }
  if (to.path === '/login' && auth.isLoggedIn) {
    return '/dashboard'
  }
})

export default router
