<template>
  <div>
    <div class="page-header">
      <h2>排便记录</h2>
      <p>观察排便次数及状态，及时发现消化异常</p>
    </div>

    <!-- 录入 -->
    <div class="card">
      <h3 class="section-title">添加记录</h3>
      <div class="add-form">
        <div class="form-row">
          <label>日期</label>
          <input type="date" v-model="form.date" :max="today()" />
        </div>
        <div class="form-row">
          <label>时间（可选）</label>
          <input type="time" v-model="form.time" />
        </div>
        <div class="form-row">
          <label>性状</label>
          <select v-model="form.type">
            <option>正常</option>
            <option>稀便</option>
            <option>干硬</option>
            <option>便秘</option>
            <option>酸臭</option>
            <option>消化不良</option>
            <option>无排便</option>
          </select>
        </div>
        <div class="form-row">
          <label>颜色</label>
          <select v-model="form.color">
            <option>黄色</option><option>黄绿色</option><option>深绿色</option>
            <option>棕色</option><option>黑色</option><option>白色</option>
          </select>
        </div>
        <div class="form-row" style="grid-column:1/-1">
          <label>备注（如：有未消化食物颗粒、味道酸）</label>
          <textarea v-model="form.note" rows="2" placeholder="描述便便状态..." />
        </div>
        <div style="grid-column:1/-1">
          <button class="btn btn-primary" @click="addRecord">添加记录</button>
        </div>
      </div>
    </div>

    <!-- 今日统计 -->
    <div class="card today-summary">
      <h3 class="section-title">今日汇总（{{ todayStr }}）</h3>
      <div v-if="todayRecords.length" style="display:flex;gap:16px;flex-wrap:wrap;">
        <div>共排便 <strong>{{ todayRecords.length }}</strong> 次</div>
        <div v-for="r in todayRecords" :key="r.id" style="display:flex;align-items:center;gap:6px;">
          <span class="tag" :class="typeClass(r.type)">{{ r.type }}</span>
          <span style="font-size:12px;color:#718096">{{ r.time || '' }}</span>
        </div>
      </div>
      <div v-else class="empty" style="padding:10px 0">今日暂无排便记录</div>
    </div>

    <!-- 历史 -->
    <div class="card" style="margin-top:16px;">
      <div class="list-header">
        <h3 class="section-title" style="margin:0">历史记录</h3>
        <input type="month" v-model="filterMonth" class="month-input" />
      </div>
      <div v-if="filteredRecords.length" class="table-wrap">
        <table>
          <thead>
            <tr><th>日期</th><th>时间</th><th>性状</th><th>颜色</th><th>备注</th><th>操作</th></tr>
          </thead>
          <tbody>
            <tr v-for="r in filteredRecords" :key="r.id">
              <td data-label="日期">{{ r.date }}</td>
              <td data-label="时间">{{ r.time || '-' }}</td>
              <td data-label="性状"><span class="tag" :class="typeClass(r.type)">{{ r.type }}</span></td>
              <td data-label="颜色">{{ r.color }}</td>
              <td data-label="备注">{{ r.note }}</td>
              <td data-label="操作"><button class="btn btn-danger btn-sm" @click="deleteRecord(r.id)">删除</button></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="empty">{{ filterMonth ? '该月暂无记录' : '暂无记录' }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { getStorage, setStorage, today } from '../utils/storage.js'

const records = ref(getStorage('bowel_records', []))

const form = reactive({ date: today(), time: '', type: '正常', color: '黄色', note: '' })

const todayStr = today()

const todayRecords = computed(() =>
  records.value.filter(r => r.date === today()).sort((a, b) => (a.time || '').localeCompare(b.time || ''))
)

const filterMonth = ref(today().slice(0, 7))
const filteredRecords = computed(() => {
  const list = [...records.value].sort((a, b) => b.date.localeCompare(a.date) || b.time?.localeCompare(a.time || '') || 0)
  if (!filterMonth.value) return list
  return list.filter(r => r.date.startsWith(filterMonth.value))
})

function addRecord() {
  records.value.push({ id: Date.now(), date: form.date, time: form.time, type: form.type, color: form.color, note: form.note })
  setStorage('bowel_records', records.value)
  form.time = ''; form.note = ''
}
function deleteRecord(id) {
  records.value = records.value.filter(r => r.id !== id)
  setStorage('bowel_records', records.value)
}

const typeMap = { '正常': 'tag-green', '稀便': 'tag-orange', '干硬': 'tag-red', '便秘': 'tag-red', '酸臭': 'tag-purple', '消化不良': 'tag-purple', '无排便': 'tag-gray' }
function typeClass(t) { return typeMap[t] || 'tag-gray' }
</script>

<style scoped>
.section-title { font-size: 15px; font-weight: 600; margin-bottom: 14px; }
.add-form { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0 16px; }
@media (max-width: 700px) { .add-form { grid-template-columns: 1fr 1fr; } }
@media (max-width: 480px) { .add-form { grid-template-columns: 1fr; } }
.today-summary { margin-top: 16px; }
.list-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.month-input { border: 1.5px solid #e2e8f0; border-radius: 8px; padding: 6px 10px; font-size: 13px; }
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th, td { padding: 9px 10px; text-align: left; border-bottom: 1px solid #f0f0f0; }
th { color: #a0aec0; font-weight: 500; }

/* 移动端表格卡片化展示 */
@media (max-width: 600px) {
  table, thead, tbody, th, td, tr { display: block; }
  thead { display: none; } /* 移动端隐藏表头 */
  tr { margin-bottom: 12px; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 10px 14px; background: #fff; }
  td { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px dashed #f0f0f0; min-height: 38px; text-align: right; }
  td:last-child { border-bottom: none; }
  td::before { content: attr(data-label); font-weight: 600; color: #718096; margin-right: 8px; text-align: left; }
}
</style>
