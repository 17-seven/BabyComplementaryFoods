<template>
  <div class="login-wrap">
    <div class="login-card">
      <div class="logo">🍼</div>
      <h1>宝宝辅食管理系统</h1>
      <p class="sub">为宝宝的健康成长记录每一天</p>

      <form @submit.prevent="handleLogin">
        <div class="form-row">
          <label>用户名</label>
          <input v-model="username" type="text" placeholder="admin" autocomplete="username" />
        </div>
        <div class="form-row">
          <label>密码</label>
          <input v-model="password" type="password" placeholder="••••••" autocomplete="current-password" />
        </div>
        <p v-if="error" class="error">{{ error }}</p>
        <button type="submit" class="btn btn-primary" style="width:100%;padding:12px;">登 录</button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'

const router = useRouter()
const auth = useAuthStore()
const username = ref('')
const password = ref('')
const error = ref('')

function handleLogin() {
  error.value = ''
  if (!username.value || !password.value) { error.value = '请输入用户名和密码'; return }
  if (auth.login(username.value, password.value)) {
    router.push('/dashboard')
  } else {
    error.value = '用户名或密码错误'
  }
}
</script>

<style scoped>
.login-wrap {
  min-height: 100vh; display: flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #fff0eb 0%, #ffe0d5 100%);
}
.login-card {
  background: #fff; border-radius: 20px; padding: 40px 36px;
  width: 100%; max-width: 360px; box-shadow: 0 8px 32px rgba(255,112,67,.15);
  text-align: center;
  margin: 16px; /* 增加外边距以防边缘紧贴屏幕 */
}
@media (max-width: 480px) {
  .login-card {
    padding: 30px 20px;
  }
}
.logo { font-size: 48px; margin-bottom: 12px; }
h1 { font-size: 20px; font-weight: 700; color: #2d3748; }
.sub { color: #a0aec0; font-size: 13px; margin: 6px 0 28px; }
.error { color: #e53e3e; font-size: 13px; margin: -6px 0 10px; text-align: left; }
.btn-primary { background: #ff7043 !important; color: #fff !important; }
.btn-primary:hover { background: #f4511e !important; }
</style>
