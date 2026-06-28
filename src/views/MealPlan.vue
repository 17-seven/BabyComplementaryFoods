<template>
  <div>
    <div class="page-header">
      <h2>辅食计划</h2>
      <p>2026-W27（06/29 - 07/05）｜{{ plan.note }}</p>
    </div>

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
          <button class="btn btn-secondary btn-sm" @click="openNote(meal.type)">
            {{ noteMap[noteKey(meal.type)] ? '✏️ 编辑备注' : '+ 添加备注' }}
          </button>
        </div>

        <div class="items-list">
          <span v-for="item in meal.items" :key="item" class="food-chip">{{ item }}</span>
        </div>

        <div v-if="noteMap[noteKey(meal.type)]" class="meal-note-display">
          📌 {{ noteMap[noteKey(meal.type)] }}
        </div>
      </div>
    </div>

    <!-- 备注弹窗 -->
    <div v-if="noteDialog.show" class="modal-mask" @click.self="noteDialog.show = false">
      <div class="modal-box card">
        <h3>{{ selectedDate }} {{ noteDialog.mealType }} 备注</h3>
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
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { weekPlans } from '../data/mealPlan.js'
import { getStorage, setStorage, today } from '../utils/storage.js'

const plan = weekPlans[0]
const selectedDate = ref(today() >= plan.days[0].date && today() <= plan.days[6].date ? today() : plan.days[0].date)

const selectedDay = computed(() => plan.days.find(d => d.date === selectedDate.value))

const noteMap = reactive(getStorage('meal_notes', {}))

function noteKey(mealType) { return `${selectedDate.value}_${mealType}` }

const noteDialog = reactive({ show: false, mealType: '', text: '' })

function openNote(mealType) {
  noteDialog.mealType = mealType
  noteDialog.text = noteMap[noteKey(mealType)] || ''
  noteDialog.show = true
}

function saveNote() {
  const key = noteKey(noteDialog.mealType)
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

.modal-mask {
  position: fixed; inset: 0; background: rgba(0,0,0,.4);
  display: flex; align-items: center; justify-content: center; z-index: 100;
}
.modal-box { width: 420px; max-width: 90vw; }
.modal-box h3 { font-size: 16px; font-weight: 600; }
</style>
