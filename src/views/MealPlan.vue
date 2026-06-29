<template>
  <div>
    <div class="page-header flex-header">
      <div style="display: flex; flex-direction: column; gap: 4px;">
        <h2>辅食计划</h2>
        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 4px;">
          <select v-model="currentWeekIndex" class="week-select">
            <option v-for="(wp, idx) in allWeekPlans" :key="wp.week" :value="idx">
              {{ wp.week }} ({{ wp.period }})
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
          class="day-tab" :class="{ active: selectedDate === day.date }"
          @click="selectedDate = day.date"
        >
          <div class="day-name">{{ day.dayName }}</div>
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
        <div v-for="day in plan.days" :key="day.date" class="weekly-day-card card">
          <div class="weekly-day-header">
            <span class="weekly-day-title">{{ day.dayName }}（{{ day.date.slice(5) }}）</span>
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
          <textarea v-model="noteDialog.text" rows="3" placeholder="输入备注..." />
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
          <button class="btn btn-secondary" @click="noteDialog.show = false">取消</button>
          <button class="btn btn-primary" @click="saveNote">保存</button>
        </div>
      </div>
    </div>

    <!-- 编辑菜品弹窗 -->
    <div v-if="mealDialog.show" class="modal-mask" @click.self="mealDialog.show = false">
      <div class="modal-box card">
        <h3>编辑 {{ mealDialog.date }} ({{ mealDialog.mealType }})</h3>
        
        <div class="form-row" style="margin-top:14px;">
          <label>鸡蛋目标 (当天)</label>
          <select v-model="mealDialog.eggTarget" style="width: 100%;">
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
  
  for (let i = 1; i <= 7; i++) {
    const nextDate = new Date(lastDate.getTime() + i * 24 * 60 * 60 * 1000)
    const y = nextDate.getFullYear()
    let m = nextDate.getMonth() + 1
    let d = nextDate.getDate()
    if (m < 10) m = '0' + m
    if (d < 10) d = '0' + d
    
    const dateStr = `${y}-${m}-${d}`
    nextDays.push({
      date: dateStr,
      dayName: weekDaysNames[i - 1],
      eggTarget: 1,
      meals: [
        { type: '午餐', items: [] },
        { type: '晚餐', items: [] }
      ]
    })
  }

  const nextWeekNum = list.length + 1
  const startPeriod = nextDays[0].date.slice(5).replace('-', '.')
  const endPeriod = nextDays[6].date.slice(5).replace('-', '.')
  
  const newWeekObj = {
    week: `第 ${nextWeekNum} 周辅食计划`,
    period: `${startPeriod} - ${endPeriod}`,
    note: '待填写备忘',
    days: nextDays
  }

  list.push(newWeekObj)
  saveToStorage()
  currentWeekIndex.value = list.length - 1
  selectedDate.value = nextDays[0].date
}

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
      if (m.items && m.items.some(item => item.includes('青菜') || item.includes('绿叶菜') || item.includes('菠菜') || item.includes('西兰花') || item.includes('小白菜') || item.includes('油菜'))) {
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
  color: #ff7043;
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
.day-tab:hover { border-color: #ff7043; }
.day-tab.active { border-color: #ff7043; background: #fff5f2; }
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
  background: #ff7043; color: #fff;
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
  background: #ff7043;
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
  border-color: #ff7043;
}
</style>
