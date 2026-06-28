<template>
  <div>
    <div class="page-header">
      <h2>首页概览</h2>
      <p>今日：{{ todayStr }}</p>
    </div>

    <!-- 统计卡片 -->
    <div class="stat-grid">
      <div class="card stat-card">
        <div class="stat-icon">🍼</div>
        <div class="stat-body">
          <div class="stat-val">{{ todayMilk }} ml</div>
          <div class="stat-label">今日奶量</div>
        </div>
      </div>
      <div class="card stat-card">
        <div class="stat-icon">💧</div>
        <div class="stat-body">
          <div class="stat-val">{{ todayWater }} ml</div>
          <div class="stat-label">今日水量</div>
        </div>
      </div>
      <div class="card stat-card">
        <div class="stat-icon">⚖️</div>
        <div class="stat-body">
          <div class="stat-val">{{ latestWeight ? latestWeight + ' kg' : '未记录' }}</div>
          <div class="stat-label">最近体重</div>
        </div>
      </div>
      <div class="card stat-card" :class="{ 'low-balance': classBalance < 500 }">
        <div class="stat-icon">🏥</div>
        <div class="stat-body">
          <div class="stat-val" :style="{ color: classBalance < 0 ? '#e53e3e' : classBalance < 500 ? '#dd6b20' : '#38a169' }">
            ¥ {{ classBalance }}
          </div>
          <div class="stat-label">课程余额</div>
        </div>
      </div>
    </div>

    <!-- 今日辅食计划 -->
    <div class="card" style="margin-top:20px;">
      <h3 class="section-title">📋 今日辅食计划</h3>
      <div v-if="todayMeals.length">
        <div v-for="meal in todayMeals" :key="meal.type" class="meal-block">
          <div class="meal-type">{{ meal.type }}</div>
          <div class="meal-items">{{ meal.items.join(' + ') }}</div>
          <div v-if="meal.note" class="meal-note">备注：{{ meal.note }}</div>
        </div>
      </div>
      <div v-else class="empty">今日暂无辅食计划</div>
    </div>

    <!-- 今日排便 -->
    <div class="card" style="margin-top:16px;">
      <h3 class="section-title">📝 今日排便记录</h3>
      <div v-if="todayBowel.length">
        <div v-for="b in todayBowel" :key="b.id" class="bowel-row">
          <span class="tag" :class="bowelTagClass(b.type)">{{ b.type }}</span>
          <span style="margin-left:8px;color:#718096;">{{ b.note }}</span>
        </div>
      </div>
      <div v-else class="empty">今日暂无排便记录</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { getStorage, today } from '../utils/storage.js'
import { classRecords } from '../data/classes.js'
import { weekPlans } from '../data/mealPlan.js'

const todayStr = computed(() => {
  const d = new Date()
  return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日 ${['周日','周一','周二','周三','周四','周五','周六'][d.getDay()]}`
})

const todayDate = today()

// 奶量
const todayMilk = computed(() => {
  const records = getStorage('milk_records', [])
  return records.filter(r => r.date === todayDate).reduce((s, r) => s + (r.amount || 0), 0)
})

// 水量
const todayWater = computed(() => {
  const records = getStorage('water_records', [])
  const rec = records.find(r => r.date === todayDate)
  return rec ? rec.amount : 0
})

// 最新体重
const latestWeight = computed(() => {
  const records = getStorage('growth_records', [])
  if (!records.length) return null
  return records.slice().sort((a, b) => b.date.localeCompare(a.date))[0]?.weight
})

// 课程余额
const classBalance = computed(() => {
  const userRecords = getStorage('class_user_records', [])
  const all = [...classRecords, ...userRecords].sort((a, b) => a.date.localeCompare(b.date))
  if (!all.length) return 0
  return all[all.length - 1].balance
})

// 今日辅食
const todayMeals = computed(() => {
  const notes = getStorage('meal_notes', {})
  for (const plan of weekPlans) {
    const day = plan.days.find(d => d.date === todayDate)
    if (day) {
      return day.meals.map(m => ({
        ...m,
        note: notes[`${todayDate}_${m.type}`] || ''
      }))
    }
  }
  return []
})

// 今日排便
const todayBowel = computed(() => {
  return getStorage('bowel_records', []).filter(r => r.date === todayDate)
})

function bowelTagClass(type) {
  const map = { '正常': 'tag-green', '稀便': 'tag-orange', '干硬': 'tag-red', '酸臭': 'tag-purple', '便秘': 'tag-red' }
  return map[type] || 'tag-gray'
}
</script>

<style scoped>
.stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
@media (max-width: 900px) { .stat-grid { grid-template-columns: repeat(2, 1fr); } }

.stat-card { display: flex; align-items: center; gap: 14px; }
.stat-icon { font-size: 32px; }
.stat-val { font-size: 22px; font-weight: 700; color: #2d3748; }
.stat-label { font-size: 12px; color: #a0aec0; margin-top: 2px; }
.low-balance { border-left: 3px solid #dd6b20; }

.section-title { font-size: 15px; font-weight: 600; margin-bottom: 14px; color: #2d3748; }

.meal-block { padding: 10px 0; border-bottom: 1px solid #f7f7f7; }
.meal-block:last-child { border-bottom: none; }
.meal-type { font-size: 12px; color: #a0aec0; margin-bottom: 4px; }
.meal-items { font-size: 14px; color: #2d3748; }
.meal-note { font-size: 12px; color: #e67e22; margin-top: 4px; }

.bowel-row { display: flex; align-items: center; padding: 6px 0; }
</style>
