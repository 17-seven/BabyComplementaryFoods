<template>
  <div class="layout">
    <!-- 侧边栏 -->
    <nav class="sidebar" :class="{ collapsed: sidebarCollapsed }">
      <div class="sidebar-header">
        <span class="logo">🍼</span>
        <span v-if="!sidebarCollapsed" class="brand">宝宝管理</span>
      </div>

      <ul class="nav-list">
        <li v-for="item in navItems" :key="item.path">
          <router-link :to="item.path" class="nav-item" active-class="active">
            <span class="nav-icon">{{ item.icon }}</span>
            <span v-if="!sidebarCollapsed" class="nav-label">{{ item.label }}</span>
          </router-link>
        </li>
      </ul>

      <div class="sidebar-footer">
        <button class="nav-item logout-btn" @click="handleLogout">
          <span class="nav-icon">🚪</span>
          <span v-if="!sidebarCollapsed" class="nav-label">退出登录</span>
        </button>
      </div>
    </nav>

    <!-- 主内容区 -->
    <div class="main">
      <header class="topbar">
        <button class="collapse-btn" @click="sidebarCollapsed = !sidebarCollapsed">☰</button>
        <span class="page-title">{{ currentTitle }}</span>
        <span class="date-display">{{ todayStr }}</span>
      </header>
      <div class="content">
        <router-view />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const sidebarCollapsed = ref(false)

const navItems = [
  { path: '/dashboard',      icon: '📊', label: '首页概览' },
  { path: '/meal-plan',      icon: '🍽️',  label: '辅食计划' },
  { path: '/growth',         icon: '📈', label: '身高体重' },
  { path: '/milk-water',     icon: '🍼', label: '奶量水量' },
  { path: '/classes',        icon: '🏥', label: '春雨课程' },
  { path: '/favorite-foods', icon: '❤️',  label: '爱吃食物' },
  { path: '/bowel',          icon: '📝', label: '排便记录' },
]

const currentTitle = computed(() => navItems.find(n => route.path.startsWith(n.path))?.label || '')

const todayStr = computed(() => {
  const d = new Date()
  return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`
})

function handleLogout() {
  auth.logout()
  router.push('/login')
}
</script>

<style scoped>
.layout { display: flex; min-height: 100vh; }

.sidebar {
  width: 220px; flex-shrink: 0;
  background: #fff; border-right: 1px solid #f0f0f0;
  display: flex; flex-direction: column;
  transition: width .25s;
  position: sticky; top: 0; height: 100vh; overflow: hidden;
}
.sidebar.collapsed { width: 60px; }

.sidebar-header {
  padding: 20px 16px; display: flex; align-items: center; gap: 10px;
  font-weight: 700; font-size: 15px; color: #2d3748;
  border-bottom: 1px solid #f7f7f7;
}
.logo { font-size: 22px; flex-shrink: 0; }

.nav-list { list-style: none; flex: 1; padding: 12px 0; overflow: hidden; }
.nav-list li { margin: 2px 8px; }

.nav-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; border-radius: 10px;
  text-decoration: none; color: #718096; font-size: 14px;
  cursor: pointer; border: none; background: transparent;
  width: 100%; transition: .15s;
}
.nav-item:hover { background: #fff5f2; color: #ff7043; }
.nav-item.active { background: #fff5f2; color: #ff7043; font-weight: 600; }
.nav-icon { font-size: 18px; flex-shrink: 0; }
.nav-label { white-space: nowrap; }

.sidebar-footer { padding: 12px 8px; border-top: 1px solid #f7f7f7; }
.logout-btn { color: #a0aec0; }
.logout-btn:hover { background: #fff5f5; color: #e53e3e; }

.main { flex: 1; display: flex; flex-direction: column; min-width: 0; }

.topbar {
  height: 56px; background: #fff; border-bottom: 1px solid #f0f0f0;
  display: flex; align-items: center; padding: 0 20px; gap: 14px;
  position: sticky; top: 0; z-index: 10;
}
.collapse-btn {
  border: none; background: transparent; font-size: 18px;
  cursor: pointer; color: #718096; padding: 4px;
}
.page-title { font-weight: 600; font-size: 16px; flex: 1; }
.date-display { color: #a0aec0; font-size: 13px; }

.content { padding: 24px; flex: 1; }
</style>
