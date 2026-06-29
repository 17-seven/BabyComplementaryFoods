<template>
  <div>
    <div class="page-header">
      <h2>首页概览</h2>
      <p>今日：{{ todayStr }}</p>
    </div>

    <!-- 医疗与接种日程提醒 -->
    <div class="reminder-bar" v-if="nextVaccineNotice || nextCheckupNotice || nextApptNotice">
      <div v-if="nextVaccineNotice" class="reminder-tag info">
        💉 疫苗提醒：下一针补种 <strong>{{ nextVaccineNotice.name }}</strong>，预计在 <strong>{{ nextVaccineNotice.plannedDate }}</strong>（还有 <strong class="notice-days">{{ nextVaccineNotice.daysLeft }}</strong> 天）
      </div>
      <div v-if="nextCheckupNotice" class="reminder-tag success">
        🩺 儿保提醒：下次建议在 <strong>{{ nextCheckupNotice.plannedDate }}</strong>（还有 <strong class="notice-days">{{ nextCheckupNotice.daysLeft }}</strong> 天）
      </div>
      <div v-if="nextApptNotice" class="reminder-tag warning">
        📅 就诊提醒：<strong>{{ nextApptNotice.name }}</strong>，预计于 <strong>{{ nextApptNotice.date }}</strong>（还有 <strong class="notice-days">{{ nextApptNotice.daysLeft }}</strong> 天）
      </div>
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
      <div class="card stat-card" :class="{ 'eyepatch-success': todayEyepatchMins >= 240 }">
        <div class="stat-icon">👁️</div>
        <div class="stat-body">
          <div class="stat-val" :style="{ color: todayEyepatchMins >= 240 ? '#38a169' : '#dd6b20' }">
            {{ todayEyepatchHours }} <small style="font-size:12px;font-weight:normal">小时</small>
          </div>
          <div class="stat-label">今日眼罩 (目标4h)</div>
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

    <!-- 最新大事记 -->
    <div class="card" style="margin-top: 16px;" v-if="latestTimelineEvent">
      <h3 class="section-title">⏳ 最新大事记（{{ latestTimelineEvent.date }}）</h3>
      <div class="latest-event-box">
        <span class="tag tag-orange" style="margin-right: 8px;">{{ latestTimelineEvent.category }}</span>
        <strong>{{ latestTimelineEvent.title }}</strong>
        <p class="latest-event-text">{{ latestTimelineEvent.content }}</p>
      </div>
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

// 今日眼罩佩戴累计分钟数
const todayEyepatchMins = computed(() => {
  const recs = getStorage('eyepatch_records', [])
  return recs.filter(r => r.date === todayDate).reduce((s, r) => s + (r.durationMinutes || 0), 0)
})

// 今日眼罩佩戴累计小时数
const todayEyepatchHours = computed(() => (todayEyepatchMins.value / 60).toFixed(1))

// 下一剂疫苗提示 (获取补种规划中的疫苗与时间)
const nextVaccineNotice = computed(() => {
  const defaultList = [
    { name: '乙肝疫苗', dose: '第3剂', status: '需补种' },
    { name: '脊灰疫苗', dose: '第2剂', status: '需补种' },
    { name: '百白破疫苗', dose: '第2剂', status: '需补种' },
    { name: '麻腮风疫苗', dose: '第1剂', status: '需补种' },
    { name: '乙脑减毒活疫苗', dose: '第1剂', status: '需补种' },
    { name: '水痘疫苗', dose: '第1剂', status: '推荐接种' }
  ]
  const list = getStorage('baby_vaccines_list', defaultList)
  const due = list.filter(v => v.status === '需补种' || v.status === '推荐接种')
  if (!due.length) return null
  
  const baseStr = getStorage('catchup_start_date', '2026-07-06')
  const base = new Date(baseStr)
  
  const plannedDate = base.toISOString().slice(0, 10)
  const diffTime = base.getTime() - new Date().getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  return {
    name: `${due[0].name} (${due[0].dose})`,
    plannedDate,
    daysLeft: diffDays > 0 ? diffDays : 0
  }
})

// 下一局儿保提示
const nextCheckupNotice = computed(() => {
  const defaultHealthcares = [{ date: '2026-06-18' }]
  const hcs = getStorage('baby_healthcares', defaultHealthcares)
  if (!hcs.length) return null
  const sorted = [...hcs].sort((a, b) => b.date.localeCompare(a.date))
  const latest = sorted[0]
  const d = new Date(latest.date)
  d.setMonth(d.getMonth() + 3)
  const plannedDate = d.toISOString().slice(0, 10)
  const diffTime = d.getTime() - new Date().getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return { plannedDate, daysLeft: diffDays > 0 ? diffDays : 0 }
})

// 下一次就诊提醒
const nextApptNotice = computed(() => {
  const defaultClinicalLogs = [
    { id: 24, name: '眼睛复查', date: '2026-09-15', desc1: '四院 崔丽红', desc2: '三个月后散瞳复查', result: '', status: '未完成' }
  ]
  const list = getStorage('baby_clinical_logs', defaultClinicalLogs)
  const upcoming = list
    .filter(l => l.status === '未完成' && l.date && l.date >= today())
    .sort((a, b) => a.date.localeCompare(b.date))
  if (!upcoming.length) return null
  const appt = upcoming[0]
  const d = new Date(appt.date)
  const curr = new Date(today())
  const diffTime = d.getTime() - curr.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return {
    name: appt.name,
    date: appt.date,
    daysLeft: diffDays > 0 ? diffDays : 0
  }
})

// 最新大事记
const latestTimelineEvent = computed(() => {
  const defaultEvents = [{ date: '2026-06-18', category: '日常医疗', title: '斜视遮盖法', content: '开始遵医嘱进行斜视矫正遮盖治疗。第一天遮盖左眼，每天佩戴遮盖眼罩4小时。' }]
  const list = getStorage('baby_timeline_events', defaultEvents)
  if (!list.length) return null
  return [...list].sort((a, b) => b.date.localeCompare(a.date))[0]
})

function bowelTagClass(type) {
  const map = { '正常': 'tag-green', '稀便': 'tag-orange', '干硬': 'tag-red', '酸臭': 'tag-purple', '便秘': 'tag-red' }
  return map[type] || 'tag-gray'
}
</script>

<style scoped>
.stat-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; }
@media (max-width: 1100px) { .stat-grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 768px) { .stat-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 480px) { .stat-grid { grid-template-columns: 1fr; } }

.stat-card { display: flex; align-items: center; gap: 14px; }
.stat-icon { font-size: 32px; }
.stat-val { font-size: 22px; font-weight: 700; color: #2d3748; }
.stat-label { font-size: 12px; color: #a0aec0; margin-top: 2px; }
.low-balance { border-left: 3px solid #dd6b20; }
.eyepatch-success { border-left: 3px solid #38a169; }

.section-title { font-size: 15px; font-weight: 600; margin-bottom: 14px; color: #2d3748; }

.meal-block { padding: 10px 0; border-bottom: 1px solid #f7f7f7; }
.meal-block:last-child { border-bottom: none; }
.meal-type { font-size: 12px; color: #a0aec0; margin-bottom: 4px; }
.meal-items { font-size: 14px; color: #2d3748; }
.meal-note { font-size: 12px; color: #e67e22; margin-top: 4px; }

.bowel-row { display: flex; align-items: center; padding: 6px 0; }

/* 首页提醒栏与大事记 */
.reminder-bar {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}
.reminder-tag {
  display: flex;
  align-items: center;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
}
.reminder-tag.info {
  background: #e6f6ff;
  color: #1a4f76;
  border: 1px solid #cce8ff;
}
.reminder-tag.success {
  background: #f0fff4;
  color: #22543d;
  border: 1px solid #c6f6d5;
}
.reminder-tag.warning {
  background: #fffaf0;
  color: #7b341e;
  border: 1px solid #feebc8;
}
.notice-days {
  color: #e53e3e;
  font-weight: 700;
  font-size: 14px;
}
.latest-event-box {
  background: #f7f9fc;
  padding: 14px;
  border-radius: 8px;
  margin-top: 10px;
}
.latest-event-text {
  font-size: 13px;
  color: #718096;
  margin-top: 8px;
  line-height: 1.5;
}
</style>
