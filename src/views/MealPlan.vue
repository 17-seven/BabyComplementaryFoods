<template>
  <div>
    <div class="page-header flex-header">
      <div style="display: flex; flex-direction: column; gap: 4px;">
        <h2>辅食计划 ({{ formatPeriodToChinese(plan?.period) }})</h2>
        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 4px;">
          <select v-model="currentWeekIndex" class="week-select">
            <option v-for="(wp, idx) in allWeekPlans" :key="wp.week" :value="idx">
              {{ wp.week }} ({{ formatPeriodToChinese(wp.period) }})
            </option>
          </select>
          <button class="btn btn-secondary btn-sm" @click="addNewWeek" style="padding: 6px 12px;">➕ 新增下周计划</button>
        </div>
      </div>
      <button class="btn btn-secondary toggle-view-btn" @click="viewMode = viewMode === 'daily' ? 'weekly' : 'daily'">
        {{ viewMode === 'daily' ? '📅 切换竖排周视图' : '🎯 切换单日视图' }}
      </button>
    </div>

    <!-- 规则校验 & 周统计 -->
    <div class="top-stats-grid">
      <!-- 规则校验 -->
      <div class="card rule-card">
        <h3 class="section-title">⚖️ 规则校验</h3>
        <div class="compliance-banner" :class="allRulesStatus.passed ? 'banner-ok' : 'banner-err'">
          {{ allRulesStatus.message }}
        </div>
        <div class="rule-list">
          <div class="rule-item">
            <span class="rule-name">鱼类频次</span>
            <span class="rule-val">{{ fishCount.count }} 次（{{ fishCount.list.join('、') }}）</span>
            <span class="rule-status tag" :class="fishCount.status ? 'tag-green' : 'tag-red'">
              {{ fishCount.status ? '✅ 达标' : '❌ 未达标' }}
            </span>
          </div>
          <div class="rule-item">
            <span class="rule-name">虾类频次</span>
            <span class="rule-val">{{ shrimpCount.count }} 次（{{ shrimpCount.list.join('、') }}）</span>
            <span class="rule-status tag" :class="shrimpCount.status ? 'tag-green' : 'tag-red'">
              {{ shrimpCount.status ? '✅ 达标' : '❌ 未达标' }}
            </span>
          </div>
          <div class="rule-item">
            <span class="rule-name">鹅肝频次</span>
            <span class="rule-val">{{ liverCount.count }} 次（{{ liverCount.list.join('、') }}）</span>
            <span class="rule-status tag" :class="liverCount.status ? 'tag-green' : 'tag-red'">
              {{ liverCount.status ? '✅ 达标' : '❌ 未达标' }}
            </span>
          </div>
          <div class="rule-item">
            <span class="rule-name">主食（粥）</span>
            <span class="rule-val">{{ porridgeCount.count }} 次（{{ porridgeCount.list.join('、') }}）</span>
            <span class="rule-status tag" :class="porridgeCount.status ? 'tag-green' : 'tag-red'">
              {{ porridgeCount.status ? '✅ 达标' : '❌ 未达标' }}
            </span>
          </div>
          <div class="rule-item">
            <span class="rule-name">主食（粗面）</span>
            <span class="rule-val">{{ noodleCount.count }} 次（{{ noodleCount.list.join('、') }}）</span>
            <span class="rule-status tag" :class="noodleCount.status ? 'tag-green' : 'tag-red'">
              {{ noodleCount.status ? '✅ 达标' : '❌ 未达标' }}
            </span>
          </div>
          <div class="rule-item">
            <span class="rule-name">每日鸡蛋</span>
            <span class="rule-val">{{ eggValidation.text }}</span>
            <span class="rule-status tag" :class="eggValidation.status ? 'tag-green' : 'tag-red'">
              {{ eggValidation.status ? '✅ 达标' : '❌ 未达标' }}
            </span>
          </div>
          <div class="rule-item">
            <span class="rule-name">每餐青菜</span>
            <span class="rule-val">{{ greenVegCount.text }}</span>
            <span class="rule-status tag" :class="greenVegCount.status ? 'tag-green' : 'tag-red'">
              {{ greenVegCount.status ? '✅ 达标' : '❌ 未达标' }}
            </span>
          </div>
        </div>
      </div>

      <!-- 周统计 -->
      <div class="card summary-card">
        <h3 class="section-title">📊 本周食材统计</h3>
        <div class="stats-summary-grid">
          <div class="summary-stat-box">
            <span class="summary-stat-val">{{ weeklyStats.eggs }} 个</span>
            <span class="summary-stat-label">鸡蛋目标</span>
          </div>
          <div class="summary-stat-box">
            <span class="summary-stat-val">{{ weeklyStats.seafood }} 次</span>
            <span class="summary-stat-label">水产品总计</span>
          </div>
          <div class="summary-stat-box">
            <span class="summary-stat-val">{{ weeklyStats.beef }} 次</span>
            <span class="summary-stat-label">牛肉摄入</span>
          </div>
          <div class="summary-stat-box">
            <span class="summary-stat-val">{{ weeklyStats.pork }} 次</span>
            <span class="summary-stat-label">猪肉摄入</span>
          </div>
          <div class="summary-stat-box">
            <span class="summary-stat-val">{{ weeklyStats.liver }} 次</span>
            <span class="summary-stat-label">内脏摄入</span>
          </div>
          <div class="summary-stat-box">
            <span class="summary-stat-val">14 顿</span>
            <span class="summary-stat-label">总餐顿数</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 1. 单日视图模式 -->
    <template v-if="viewMode === 'daily'">
      <!-- 星期选择 -->
      <div class="day-tabs">
        <button
          v-for="day in plan.days" :key="day.date"
          class="day-tab" :class="{ active: selectedDate === day.date, 'day-tab-passed': isPassed(day.date) }"
          @click="selectedDate = day.date"
        >
          <div class="day-name">
            <span v-if="isPassed(day.date)" class="passed-check">✓ </span>
            {{ day.dayName }}
          </div>
          <div class="day-date">{{ day.date.slice(5) }}</div>
          <div class="egg-dot" :style="{ background: day.eggTarget >= 2 ? '#ff7043' : '#fbc02d' }"></div>
        </button>
      </div>

      <!-- 当日详情 -->
      <div v-if="selectedDay" class="day-detail">
        <div class="egg-target card">🥚 今日鸡蛋目标：<strong>{{ selectedDay.eggTarget }} 个</strong></div>

        <div v-for="meal in selectedDay.meals" :key="meal.type" class="meal-card card">
          <div class="meal-header">
            <span class="meal-badge">{{ meal.type }}</span>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-primary btn-sm" @click="openEditMeal(selectedDate, meal.type, meal.items, selectedDay.eggTarget)">
                ✏️ 编辑菜品
              </button>
              <button class="btn btn-secondary btn-sm" @click="openNote(selectedDate, meal.type)">
                {{ noteMap[`${selectedDate}_${meal.type}`] ? '✏️ 编辑备注' : '+ 添加备注' }}
              </button>
            </div>
          </div>

          <div class="items-list">
            <template v-if="meal.items && meal.items.length > 0">
              <span v-for="item in meal.items" :key="item" class="food-chip">{{ item }}</span>
            </template>
            <span v-else style="color:#a0aec0;font-size:13px;">暂无菜品食材，点击编辑菜品录入</span>
          </div>

          <div v-if="noteMap[`${selectedDate}_${meal.type}`]" class="meal-note-display">
            📌 {{ noteMap[`${selectedDate}_${meal.type}`] }}
          </div>
        </div>
      </div>
    </template>

    <!-- 2. 周一到周日竖排周视图模式 -->
    <template v-else>
      <div class="weekly-list">
        <div v-for="day in plan.days" :key="day.date" class="weekly-day-card card" :class="{ 'weekly-day-card-passed': isPassed(day.date) }">
          <div class="weekly-day-header">
            <span class="weekly-day-title">
              <span v-if="isPassed(day.date)" class="passed-check">✓ </span>
              {{ day.dayName }}（{{ day.date.slice(5) }}）
            </span>
            <span class="weekly-egg-target">🥚 鸡蛋目标：<strong>{{ day.eggTarget }} 个</strong></span>
          </div>

          <div class="weekly-meals">
            <div v-for="meal in day.meals" :key="meal.type" class="weekly-meal-row">
              <span class="weekly-badge weekly-meal-badge">{{ meal.type }}</span>
              <div class="weekly-meal-content">
                <div class="weekly-food-chips" v-if="meal.items && meal.items.length > 0">
                  <span v-for="item in meal.items" :key="item" class="weekly-food-chip">{{ item }}</span>
                </div>
                <div v-else style="color:#a0aec0;font-size:12px;">暂无菜品食材</div>
                <div v-if="noteMap[`${day.date}_${meal.type}`]" class="weekly-meal-note">
                  📌 {{ noteMap[`${day.date}_${meal.type}`] }}
                </div>
              </div>
              <div style="display: flex; gap: 4px; align-items: center; flex-shrink: 0;">
                <button class="btn btn-primary btn-sm edit-note-btn" @click="openEditMeal(day.date, meal.type, meal.items, day.eggTarget)" title="编辑菜品">
                  ✏️
                </button>
                <button class="btn btn-secondary btn-sm edit-note-btn" @click="openNote(day.date, meal.type)" title="编辑备注">
                  {{ noteMap[`${day.date}_${meal.type}`] ? '💬' : '+' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- 备注弹窗 -->
    <div v-if="noteDialog.show" class="modal-mask" @click.self="noteDialog.show = false">
      <div class="modal-box card">
        <h3>{{ noteDialog.date }} {{ noteDialog.mealType }} 备注</h3>
        <div class="form-row" style="margin-top:14px;">
          <label>备注内容（如：加了乳果糖15ml，吃了大半碗）</label>
          <textarea v-model="noteDialog.text" :disabled="isPassed(noteDialog.date)" rows="3" placeholder="输入备注..." />
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
          <button class="btn btn-secondary" @click="noteDialog.show = false">取消</button>
          <button class="btn btn-primary" :disabled="isPassed(noteDialog.date)" @click="saveNote">保存</button>
        </div>
      </div>
    </div>

    <!-- 编辑菜品弹窗 -->
    <div v-if="mealDialog.show" class="modal-mask" @click.self="mealDialog.show = false">
      <div class="modal-box card">
        <h3>编辑 {{ mealDialog.date }} ({{ mealDialog.mealType }})</h3>
        
        <div class="form-row" style="margin-top:14px;">
          <label>鸡蛋目标 (当天)</label>
          <select v-model="mealDialog.eggTarget" :disabled="isPassed(mealDialog.date)" style="width: 100%;">
            <option :value="0">0 个</option>
            <option :value="1">1 个</option>
            <option :value="2">2 个</option>
            <option :value="3">3 个</option>
          </select>
        </div>

        <div class="form-row">
          <label>包含食材（使用顿号、逗号、空格或换行分隔，如：猪肉、青菜、小米粥）</label>
          <textarea v-model="mealDialog.itemsText" rows="4" placeholder="输入食材，例如：鳕鱼、南瓜、米饭" />
        </div>

        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px;">
          <button class="btn btn-secondary" @click="mealDialog.show = false">取消</button>
          <button class="btn btn-primary" @click="saveMeal">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { weekPlans } from '../data/mealPlan.js'
import { getStorage, setStorage, today } from '../utils/storage.js'

// 从 LocalStorage 读取全部周计划数据，若不存在则使用 weekPlans 初始化
const allWeekPlans = ref(getStorage('baby_week_plans', weekPlans))
const currentWeekIndex = ref(0)
const plan = computed(() => allWeekPlans.value[currentWeekIndex.value] || allWeekPlans.value[0])

const selectedDate = ref(today() >= plan.value.days[0].date && today() <= plan.value.days[6].date ? today() : plan.value.days[0].date)

const selectedDay = computed(() => plan.value.days.find(d => d.date === selectedDate.value))

const noteMap = reactive(getStorage('meal_notes', {}))

// 视图模式：'daily' 表示单日视图，'weekly' 表示周一至周日竖排周视图
const viewMode = ref('daily')
const isPassed = (dateStr) => dateStr < today()

const noteDialog = reactive({ show: false, date: '', mealType: '', text: '' })

// 编辑菜品弹窗状态
const mealDialog = reactive({ show: false, date: '', mealType: '', itemsText: '', eggTarget: 1 })

function saveToStorage() {
  setStorage('baby_week_plans', allWeekPlans.value)
}

function openEditMeal(date, mealType, currentItems, eggTarget) {
  mealDialog.date = date
  mealDialog.mealType = mealType
  mealDialog.itemsText = currentItems ? currentItems.join('、') : ''
  mealDialog.eggTarget = eggTarget !== undefined ? eggTarget : 1
  mealDialog.show = true
}

function saveMeal() {
  const targetPlan = allWeekPlans.value[currentWeekIndex.value]
  if (!targetPlan) return

  const dayObj = targetPlan.days.find(d => d.date === mealDialog.date)
  if (dayObj) {
    dayObj.eggTarget = parseInt(mealDialog.eggTarget) || 0
    let mealObj = dayObj.meals.find(m => m.type === mealDialog.mealType)
    
    // 以中文顿号、逗号、空格或换行为分隔符
    const items = mealDialog.itemsText
      .replace(/[,，\s、\n]+/g, '、')
      .split('、')
      .map(i => i.trim())
      .filter(i => i.length > 0)
    
    if (mealObj) {
      mealObj.items = items
    } else {
      mealObj = { type: mealDialog.mealType, items }
      dayObj.meals.push(mealObj)
    }
  }
  saveToStorage()
  mealDialog.show = false
}

// 动态创建下周辅食计划
// 格式化日期范围为中文形式
function formatPeriodToChinese(period) {
  if (!period) return ''
  const matches = period.match(/(\d{2})[/\.](\d{2})\s*-\s*(\d{2})[/\.](\d{2})/)
  if (matches) {
    const m1 = parseInt(matches[1])
    const d1 = parseInt(matches[2])
    const m2 = parseInt(matches[3])
    const d2 = parseInt(matches[4])
    return `${m1}月${d1}日到${m2}月${d2}日`
  }
  return period
}

// 动态创建下周辅食计划（依据已排敏食材与排餐频次规则智能生成）
function addNewWeek() {
  const list = allWeekPlans.value
  const lastWeek = list[list.length - 1]
  
  let lastDateStr = '2026-07-05' // 默认底线日期
  if (lastWeek && lastWeek.days && lastWeek.days.length > 0) {
    lastDateStr = lastWeek.days[lastWeek.days.length - 1].date
  }

  const lastDate = new Date(lastDateStr)
  const nextDays = []
  const weekDaysNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

  // 获取本地已排敏食材池（与同步页面数据打通）
  const localSafe = getStorage('baby_safe_foods', [])
  const safeNames = localSafe.map(f => f.name)

  const fishPool = ['鳕鱼', '比目鱼'].filter(f => safeNames.includes(f))
  const shrimpPool = ['黑虎虾', '北极甜虾'].filter(f => safeNames.includes(f))
  const liverPool = ['鹅肝', '猪肝'].filter(f => safeNames.includes(f))
  const vegPool = ['山药', '红薯', '胡萝卜', '土豆', '莲藕', '西葫芦', '南瓜', '西红柿', '黄瓜'].filter(f => safeNames.includes(f))
  const sidePool = ['蒸糕', '小饼', '馒头'].filter(f => safeNames.includes(f))

  const getFish = () => selectIngredient(fishPool, '鳕鱼')
  const getShrimp = () => selectIngredient(shrimpPool, '鲜虾')
  const getLiver = () => selectIngredient(liverPool, '鹅肝')
  const getSide = (type) => {
    if (type === '蒸糕') return selectIngredient(sidePool.filter(s => s.includes('糕')), '蒸糕')
    if (type === '小饼') return selectIngredient(sidePool.filter(s => s.includes('饼')), '小饼')
    if (type === '馒头') return selectIngredient(sidePool.filter(s => s.includes('馒')), '馒头')
    return selectIngredient(sidePool, type)
  }

  function selectIngredient(arr, fallback) {
    if (arr && arr.length > 0) {
      return arr[Math.floor(Math.random() * arr.length)]
    }
    return fallback
  }

  function getUniqueVeg(count, fallbacks) {
    const result = []
    const temp = [...vegPool]
    for (let i = 0; i < count; i++) {
      if (temp.length > 0) {
        const idx = Math.floor(Math.random() * temp.length)
        result.push(temp.splice(idx, 1)[0])
      } else {
        result.push(fallbacks[i % fallbacks.length])
      }
    }
    return result
  }

  // 预生成7天的日期
  const dateObjs = []
  for (let i = 1; i <= 7; i++) {
    const nextDate = new Date(lastDate.getTime() + i * 24 * 60 * 60 * 1000)
    const y = nextDate.getFullYear()
    let m = nextDate.getMonth() + 1
    let d = nextDate.getDate()
    if (m < 10) m = '0' + m
    if (d < 10) d = '0' + d
    dateObjs.push({ dateStr: `${y}-${m}-${d}`, dayName: weekDaysNames[i - 1] })
  }

  // 依据排餐逻辑生成每日菜单，确保符合 14 顿总量、频次以及无相同主蛋白规则
  // 周一 (Mon): 蛋 1. 午餐: 猪肉 烩饭; 晚餐: 牛肉 小米粥 + 鸡蛋羹
  {
    const v = getUniqueVeg(1, ['香菇'])
    const monLunch = [`猪肉`, v[0], `青菜`, `烩饭`].join('')
    const monDinner = [`牛肉`, `青菜`, `小米粥`].join('')
    nextDays.push({
      date: dateObjs[0].dateStr, dayName: dateObjs[0].dayName, eggTarget: 1,
      meals: [
        { type: '午餐', items: [monLunch] },
        { type: '晚餐', items: [monDinner, '鸡蛋羹'] }
      ]
    })
  }

  // 周二 (Tue): 蛋 2. 午餐: 鲜虾 粗面 + 蛋花; 晚餐: 鱼 烩饭 + 蛋饼小块
  {
    const v = getUniqueVeg(2, ['西葫芦', '南瓜'])
    const tueLunch = [v[0], `青菜`, getShrimp(), `粗面（含蛋花）`].join('')
    const tueDinner = [getFish(), v[1], `青菜`, `烩饭`].join('')
    nextDays.push({
      date: dateObjs[1].dateStr, dayName: dateObjs[1].dayName, eggTarget: 2,
      meals: [
        { type: '午餐', items: [tueLunch] },
        { type: '晚餐', items: [tueDinner, '蛋饼小块'] }
      ]
    })
  }

  // 周三 (Wed): 蛋 1. 午餐: 鹅肝 烩饭 + 蒸糕; 晚餐: 牛肉 烩饭
  {
    const v = getUniqueVeg(3, ['胡萝卜', '西红柿', '土豆'])
    const wedLunch = [getLiver(), v[0], `青菜`, `烩饭`].join('')
    const wedDinner = [`牛肉`, v[1], v[2], `青菜`, `烩饭`].join('')
    const sideCake = `${getSide('蒸糕')}（含蛋）`
    nextDays.push({
      date: dateObjs[2].dateStr, dayName: dateObjs[2].dayName, eggTarget: 1,
      meals: [
        { type: '午餐', items: [wedLunch, sideCake] },
        { type: '晚餐', items: [wedDinner] }
      ]
    })
  }

  // 周四 (Thu): 蛋 1. 午餐: 鱼 烩饭; 晚餐: 猪肉 燕麦米粥 + 鸡蛋羹
  {
    const v = getUniqueVeg(1, ['山药'])
    const thuLunch = [getFish(), v[0], `青菜`, `烩饭`].join('')
    const thuDinner = [`猪肉`, `青菜`, `燕麦米粥`].join('')
    nextDays.push({
      date: dateObjs[3].dateStr, dayName: dateObjs[3].dayName, eggTarget: 1,
      meals: [
        { type: '午餐', items: [thuLunch] },
        { type: '晚餐', items: [thuDinner, '鸡蛋羹'] }
      ]
    })
  }

  // 周五 (Fri): 蛋 2. 午餐: 牛肉 烩饭 + 小饼; 晚餐: 鲜虾 粗面 + 蛋花
  {
    const v = getUniqueVeg(2, ['莲藕', '玉米'])
    const friLunch = [`牛肉`, v[0], `青菜`, `烩饭`].join('')
    const friDinner = [v[1], `青菜`, getShrimp(), `粗面（含蛋花）`].join('')
    const sideCookie = `${getSide('小饼')}（含蛋）`
    nextDays.push({
      date: dateObjs[4].dateStr, dayName: dateObjs[4].dayName, eggTarget: 2,
      meals: [
        { type: '午餐', items: [friLunch, sideCookie] },
        { type: '晚餐', items: [friDinner] }
      ]
    })
  }

  // 周六 (Sat): 蛋 1. 午餐: 猪肉 豆腐 烩饭 + 蛋黄小块; 晚餐: 鱼 烩饭
  {
    const v = getUniqueVeg(2, ['红薯', '黄瓜'])
    const satLunch = [`猪肉`, v[0], `豆腐`, `青菜`, `烩饭`].join('')
    const satDinner = [getFish(), v[1], `青菜`, `烩饭`].join('')
    nextDays.push({
      date: dateObjs[5].dateStr, dayName: dateObjs[5].dayName, eggTarget: 1,
      meals: [
        { type: '午餐', items: [satLunch, '蛋黄小块'] },
        { type: '晚餐', items: [satDinner] }
      ]
    })
  }

  // 周日 (Sun): 蛋 1. 午餐: 鲜虾 粗面 + 馒头小块; 晚餐: 鹅肝 烩饭 + 鸡蛋羹
  {
    const v = getUniqueVeg(2, ['胡萝卜', '南瓜'])
    const sunLunch = [v[0], `青菜`, getShrimp(), `粗面`].join('')
    const sunDinner = [getLiver(), v[1], `青菜`, `烩饭`].join('')
    const sideBread = `${getSide('馒头')}小块`
    nextDays.push({
      date: dateObjs[6].dateStr, dayName: dateObjs[6].dayName, eggTarget: 1,
      meals: [
        { type: '午餐', items: [sunLunch, sideBread] },
        { type: '晚餐', items: [sunDinner, '鸡蛋羹'] }
      ]
    })
  }

  let nextWeekName = '2026-W28'
  if (lastWeek && lastWeek.week) {
    const match = lastWeek.week.match(/^(\d{4})-W(\d{1,2})$/)
    if (match) {
      let year = parseInt(match[1])
      let weekNum = parseInt(match[2])
      weekNum++
      if (weekNum > 52) {
        weekNum = 1
        year++
      }
      nextWeekName = `${year}-W${weekNum < 10 ? '0' + weekNum : weekNum}`
    } else {
      nextWeekName = `第 ${list.length + 1} 周辅食计划`
    }
  }
  const startPeriod = nextDays[0].date.slice(5).replace('-', '.')
  const endPeriod = nextDays[6].date.slice(5).replace('-', '.')
  
  const newWeekObj = {
    week: nextWeekName,
    period: `${startPeriod} - ${endPeriod}`,
    note: '系统自动生成排餐',
    days: nextDays
  }

  list.push(newWeekObj)
  saveToStorage()
  currentWeekIndex.value = list.length - 1
  selectedDate.value = nextDays[0].date
}

// 顶部综合规则合规校验计算
const allRulesStatus = computed(() => {
  const errors = []
  if (!fishCount.value.status) errors.push(`鱼类频次不合规（当前 ${fishCount.value.count} 次，目标 2-3 次）`)
  if (!shrimpCount.value.status) errors.push(`虾类频次不合规（当前 ${shrimpCount.value.count} 次，目标 2-3 次）`)
  if (!liverCount.value.status) errors.push(`鹅肝频次不合规（当前 ${liverCount.value.count} 次，目标 2-3 次）`)
  if (!porridgeCount.value.status) errors.push(`粥频次不合规（当前 ${porridgeCount.value.count} 次，目标固定 2 次）`)
  if (!noodleCount.value.status) errors.push(`粗面频次不合规（当前 ${noodleCount.value.count} 次，目标固定 3 次）`)
  if (!eggValidation.value.status) errors.push(`每日鸡蛋配额不合规（应全周每天 1-2 个）`)
  if (!greenVegCount.value.status) errors.push(`绿叶菜覆盖度不合规（应全周每餐 14 顿均含绿叶菜）`)
  
  // 检查拼写命名 (不能含 + 号)
  let hasPlus = false
  plan.value.days.forEach(d => {
    d.meals.forEach(m => {
      if (m.items && m.items.some(item => item.includes('+'))) {
        hasPlus = true
      }
    })
  })
  if (hasPlus) errors.push('菜品命名包含非法字符（禁止使用"+"号拼接，请以"猪肉香菇青菜烩饭"形式命名）')

  // 检查未排敏食材防护
  const defaultRiskNames = ['芋头', '芦笋', '白萝卜', '紫薯', '芹菜', '紫甘蓝', '卷心菜', '菜花', '冬瓜', '丝瓜', '苦瓜', '荷兰豆', '芸豆', '豇豆', '毛豆', '金针菇', '平菇', '杏鲍菇', '口蘑', '大蒜', '洋葱', '木耳', '梨', '蓝莓', '桃', '杏', '草莓', '芒果', '猕猴桃', '西梅', '菠萝', '鸭胸肉', '三文鱼', '龙利鱼', '鲈鱼', '带鱼', '黄花鱼', '基围虾', '螃蟹', '豆腐', '奶酪', '酸奶', '芝麻']
  const localRiskList = getStorage('baby_risk_foods', [])
  const riskNames = localRiskList.length ? localRiskList.map(f => f.name) : defaultRiskNames
  const bannedList = []
  
  plan.value.days.forEach(d => {
    d.meals.forEach(m => {
      if (m.items) {
        m.items.forEach(item => {
          riskNames.forEach(riskName => {
            if (item.includes(riskName)) {
              bannedList.push(`${d.dayName}${m.type}：${item}（含未排敏食材：${riskName}）`)
            }
          })
        })
      }
    })
  })
  if (bannedList.length > 0) {
    errors.push(`检测到引入未排敏的风险食材：${bannedList.join('；')}`)
  }

  if (errors.length === 0) {
    return { passed: true, message: '🎉 恭喜！当前辅食排餐完全符合所有营养频次及违禁排敏规则，全部达标！' }
  } else {
    return { passed: false, message: `⚠️ 警报：当前辅食计划存在以下不合规，请检查调整：\n` + errors.map((e, idx) => `（${idx + 1}）${e}`).join('\n') }
  }
}
)

// 规则校验：鱼类频次
const fishCount = computed(() => {
  let count = 0
  const list = []
  plan.value.days.forEach(d => {
    d.meals.forEach(m => {
      if (m.items && m.items.some(item => item.includes('鱼'))) {
        count++
        list.push(`${d.dayName}${m.type === '午餐' ? '午' : '晚'}`)
      }
    })
  })
  return { count, list, status: count >= 2 && count <= 3 }
})

// 规则校验：虾类频次
const shrimpCount = computed(() => {
  let count = 0
  const list = []
  plan.value.days.forEach(d => {
    d.meals.forEach(m => {
      if (m.items && m.items.some(item => item.includes('虾'))) {
        count++
        list.push(`${d.dayName}${m.type === '午餐' ? '午' : '晚'}`)
      }
    })
  })
  return { count, list, status: count >= 2 && count <= 3 }
})

// 规则校验：鹅肝频次
const liverCount = computed(() => {
  let count = 0
  const list = []
  plan.value.days.forEach(d => {
    d.meals.forEach(m => {
      if (m.items && m.items.some(item => item.includes('鹅肝'))) {
        count++
        list.push(`${d.dayName}${m.type === '午餐' ? '午' : '晚'}`)
      }
    })
  })
  return { count, list, status: count >= 2 && count <= 3 }
})

// 规则校验：主食（粥）
const porridgeCount = computed(() => {
  let count = 0
  const list = []
  plan.value.days.forEach(d => {
    d.meals.forEach(m => {
      if (m.items && m.items.some(item => item.includes('粥'))) {
        count++
        list.push(`${d.dayName}${m.type === '午餐' ? '午' : '晚'}`)
      }
    })
  })
  return { count, list, status: count === 2 }
})

// 规则校验：主食（粗面）
const noodleCount = computed(() => {
  let count = 0
  const list = []
  plan.value.days.forEach(d => {
    d.meals.forEach(m => {
      if (m.items && m.items.some(item => item.includes('面'))) {
        count++
        list.push(`${d.dayName}${m.type === '午餐' ? '午' : '晚'}`)
      }
    })
  })
  return { count, list, status: count === 3 }
})

// 规则校验：每日鸡蛋限制
const eggValidation = computed(() => {
  const status = plan.value.days.every(d => d.eggTarget >= 1 && d.eggTarget <= 2)
  return { status, text: status ? '全 7 天均满足' : '有天数不满足' }
})

// 规则校验：每顿含绿叶菜/青菜
const greenVegCount = computed(() => {
  let okCount = 0
  let totalMeals = 0
  plan.value.days.forEach(d => {
    d.meals.forEach(m => {
      totalMeals++
      if (m.items && m.items.some(item => item.includes('青菜') || item.includes('绿叶菜') || item.includes('菠菜') || item.includes('西兰花') || item.includes('小白菜') || item.includes('油菜') || item.includes('生菜') || item.includes('油麦菜') || item.includes('上海青') || item.includes('菜心') || item.includes('奶白菜'))) {
        okCount++
      }
    })
  })
  return { status: okCount === totalMeals, text: `全周 ${totalMeals} 顿中含 ${okCount} 顿` }
})

// 周统计数据
const weeklyStats = computed(() => {
  let eggs = plan.value.days.reduce((s, d) => s + d.eggTarget, 0)
  let fish = 0
  let shrimp = 0
  let liver = 0
  let pork = 0
  let beef = 0
  
  plan.value.days.forEach(d => {
    d.meals.forEach(m => {
      if (m.items) {
        m.items.forEach(item => {
          if (item.includes('鱼')) fish++
          if (item.includes('虾')) shrimp++
          if (item.includes('鹅肝') || item.includes('猪肝')) liver++
          if (item.includes('猪肉')) pork++
          if (item.includes('牛肉')) beef++
        })
      }
    })
  })
  
  return { eggs, seafood: fish + shrimp, liver, pork, beef }
})

function openNote(date, mealType) {
  noteDialog.date = date
  noteDialog.mealType = mealType
  noteDialog.text = noteMap[`${date}_${mealType}`] || ''
  noteDialog.show = true
}

function saveNote() {
  const key = `${noteDialog.date}_${noteDialog.mealType}`
  if (noteDialog.text.trim()) {
    noteMap[key] = noteDialog.text.trim()
  } else {
    delete noteMap[key]
  }
  setStorage('meal_notes', { ...noteMap })
  noteDialog.show = false
}
</script>

<style scoped>
.flex-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}
.flex-header .btn {
  white-space: nowrap;
}
@media (max-width: 600px) {
  .flex-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  .flex-header .btn {
    width: 100%;
  }
}

.top-stats-grid {
  display: grid;
  grid-template-columns: 3fr 2fr;
  gap: 16px;
  margin-bottom: 20px;
}
@media (max-width: 900px) {
  .top-stats-grid {
    grid-template-columns: 1fr;
  }
}

.rule-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.rule-item {
  display: flex;
  align-items: center;
  font-size: 13px;
  padding: 6px 0;
  border-bottom: 1px dashed #f0f0f0;
}
.rule-item:last-child {
  border-bottom: none;
}
.rule-name {
  font-weight: 600;
  color: #4a5568;
  width: 90px;
  flex-shrink: 0;
}
.rule-val {
  color: #718096;
  flex: 1;
}
.rule-status {
  flex-shrink: 0;
  font-size: 11px;
}

.stats-summary-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  height: calc(100% - 30px);
}
@media (max-width: 480px) {
  .stats-summary-grid {
    grid-template-columns: 1fr;
  }
}
.summary-stat-box {
  background: #f7f9fc;
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
}
.summary-stat-val {
  font-size: 18px;
  font-weight: 700;
  color: #5A8D3D;
}
.summary-stat-label {
  font-size: 11px;
  color: #a0aec0;
  margin-top: 4px;
}

.day-tabs {
  display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap;
}
.day-tab {
  padding: 10px 14px; border-radius: 10px; border: 1.5px solid #e2e8f0;
  background: #fff; cursor: pointer; text-align: center; min-width: 64px;
  transition: .15s; position: relative;
}
.day-tab:hover { border-color: #6CA847; }
.day-tab.active { border-color: #6CA847; background: #F3F8F0; }
.day-name { font-weight: 600; font-size: 14px; color: #2d3748; }
.day-date { font-size: 11px; color: #a0aec0; margin-top: 2px; }
.egg-dot {
  width: 7px; height: 7px; border-radius: 50%;
  position: absolute; top: 7px; right: 7px;
}

/* 移动端星期切换栏横向滚动 */
@media (max-width: 600px) {
  .day-tabs {
    flex-wrap: nowrap;
    overflow-x: auto;
    padding-bottom: 8px;
    -webkit-overflow-scrolling: touch;
  }
  .day-tab {
    flex-shrink: 0;
  }
  /* 隐藏滚动条但保留滚动功能 */
  .day-tabs::-webkit-scrollbar {
    display: none;
  }
  .day-tabs {
    scrollbar-width: none;
  }
}

.day-detail { display: flex; flex-direction: column; gap: 14px; }

.egg-target { font-size: 14px; color: #4a5568; padding: 12px 16px; }

.meal-card { padding: 16px; }
.meal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.meal-badge {
  background: #6CA847; color: #fff;
  padding: 3px 10px; border-radius: 20px; font-size: 13px; font-weight: 600;
}

.items-list { display: flex; flex-wrap: wrap; gap: 8px; }
.food-chip {
  background: #f7f8fa; border: 1px solid #e2e8f0;
  padding: 4px 10px; border-radius: 20px; font-size: 13px; color: #4a5568;
}

.meal-note-display {
  margin-top: 10px; padding: 8px 12px; background: #fffbf0;
  border-left: 3px solid #fbd38d; border-radius: 6px;
  font-size: 13px; color: #744210;
}

/* 周视图样式 */
.weekly-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.weekly-day-card {
  padding: 16px;
}
.weekly-day-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 12px;
}
.weekly-day-title {
  font-weight: 700;
  font-size: 15px;
  color: #2d3748;
}
.weekly-egg-target {
  font-size: 13px;
  color: #718096;
}
.weekly-meals {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.weekly-meal-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding-bottom: 10px;
  border-bottom: 1px dashed #f0f0f0;
}
.weekly-meal-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}
.weekly-meal-badge {
  background: #6CA847;
  color: #fff;
  padding: 2px 8px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
  margin-top: 2px;
}
.weekly-meal-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.weekly-food-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.weekly-food-chip {
  background: #f7f8fa;
  border: 1px solid #e2e8f0;
  padding: 2px 8px;
  border-radius: 20px;
  font-size: 12px;
  color: #4a5568;
}
.weekly-meal-note {
  font-size: 12px;
  color: #744210;
  background: #fffbf0;
  padding: 4px 8px;
  border-radius: 6px;
  border-left: 3px solid #fbd38d;
}
.edit-note-btn {
  padding: 2px 8px;
  font-size: 12px;
}

.modal-mask {
  position: fixed; inset: 0; background: rgba(0,0,0,.4);
  display: flex; align-items: center; justify-content: center; z-index: 100;
}
.modal-box { width: 420px; max-width: 90vw; }
.modal-box h3 { font-size: 16px; font-weight: 600; }

.week-select {
  padding: 6px 12px;
  border: 1.5px solid #e2e8f0;
  border-radius: 8px;
  font-size: 13px;
  outline: none;
  background: #fff;
  cursor: pointer;
  font-weight: 500;
  color: #2d3748;
  transition: border-color 0.2s;
}
.week-select:focus {
  border-color: #6CA847;
}

/* 规则校验反馈 Banner 样式 */
.compliance-banner {
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 14px;
  line-height: 1.5;
  white-space: pre-wrap;
}
.banner-ok {
  background-color: #f0fdf4;
  color: #166534;
  border: 1px solid #bbf7d0;
}
.banner-err {
  background-color: #fef2f2;
  color: #991b1b;
  border: 1px solid #fca5a5;
}

.day-tab-passed {
  background-color: #f5f7fa !important;
}
.weekly-day-card-passed {
  background-color: #f5f7fa !important;
}
.passed-check {
  color: #38a169;
  font-weight: bold;
}
</style>
