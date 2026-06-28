import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const TOKEN_KEY = 'baby_mgr_token'
const TOKEN_EXPIRES = 7 * 24 * 60 * 60 * 1000 // 7天

function genToken(username) {
  return btoa(`${username}:${Date.now()}:${Math.random().toString(36).slice(2)}`)
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref(loadToken())

  function loadToken() {
    try {
      const raw = localStorage.getItem(TOKEN_KEY)
      if (!raw) return null
      const { value, expiry } = JSON.parse(raw)
      if (Date.now() > expiry) { localStorage.removeItem(TOKEN_KEY); return null }
      return value
    } catch { return null }
  }

  const isLoggedIn = computed(() => !!token.value)

  function login(username, password) {
    if (username === 'admin' && password === '123456') {
      const t = genToken(username)
      token.value = t
      localStorage.setItem(TOKEN_KEY, JSON.stringify({
        value: t,
        expiry: Date.now() + TOKEN_EXPIRES
      }))
      return true
    }
    return false
  }

  function logout() {
    token.value = null
    localStorage.removeItem(TOKEN_KEY)
  }

  return { token, isLoggedIn, login, logout }
})
