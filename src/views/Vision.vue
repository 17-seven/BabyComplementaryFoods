<template>
  <div>
    <div class="page-header">
      <h2>视力矫正</h2>
      <p>记录眼罩佩戴时长，监督宝宝完成每日4小时矫正目标</p>
    </div>

    <!-- 治疗阶段倒计时卡片 -->
    <div class="card countdown-card">
      <div class="countdown-header">
        <h3 class="card-title">👁️ 视力矫正进程</h3>
        <span class="tag tag-orange">目标：每天 4 小时</span>
      </div>
      <div class="countdown-grid">
        <div class="countdown-item">
          <span class="count-num">{{ daysPassed }}</span>
          <span class="count-label">已坚持天数</span>
        </div>
        <div class="countdown-item">
          <span class="count-num">{{ daysRemaining }}</span>
          <span class="count-label">距离复查剩余天数</span>
        </div>
        <div class="countdown-item full-width-mobile">
          <div class="progress-bar-label">
            <span>矫正总进度</span>
            <span>{{ overallProgress }}%</span>
          </div>
          <div class="progress-bar-wrap">
            <div class="progress-bar-fill" :style="{ width: overallProgress + '%' }"></div>
          </div>
          <div class="progress-bar-dates">
            <span>起始：2026-06-17</span>
            <span>复查：2026-09-17</span>
          </div>
        </div>
      </div>
    </div>

    <div class="two-col" style="margin-top: 16px;">
      <!-- 今日佩戴状况 -->
      <div class="card status-card">
        <h3 class="section-title">🕒 今日打卡状况</h3>
        <div class="today-hours-wrap">
          <div class="today-hours-circle" :class="{ success: todayTotalMinutes >= 240 }">
            <span class="hour-val">{{ todayTotalHours }} <small>小时</small></span>
            <span class="hour-target">目标 4 小时</span>
          </div>
          <div class="today-status-text">
            <span class="tag" :class="todayTotalMinutes >= 240 ? 'tag-green' : todayTotalMinutes > 0 ? 'tag-orange' : 'tag-gray'">
              {{ todayTotalMinutes >= 240 ? '今日已达标 🎉' : todayTotalMinutes > 0 ? '进行中，加油！' : '今日暂无记录' }}
            </span>
            <p v-if="todayTotalMinutes < 240 && todayTotalMinutes > 0" class="sub-text">
              还需佩戴 {{ formatMinutes(240 - todayTotalMinutes) }}
            </p>
          </div>
        </div>
      </div>

      <!-- 添加记录表单 -->
      <div class="card">
        <h3 class="section-title">➕ 录入眼罩时间</h3>
        <div class="add-form">
          <div class="form-row">
            <label>日期</label>
            <input type="date" v-model="form.date" :max="today()" />
          </div>
          <div class="form-row">
            <label>开始时间</label>
            <input type="time" v-model="form.startTime" />
          </div>
          <div class="form-row">
            <label>结束时间</label>
            <input type="time" v-model="form.endTime" />
          </div>
          <div class="form-row" style="grid-column: 1 / -1">
            <label>备注</label>
            <input type="text" v-model="form.note" placeholder="如：看绘本时戴、宝宝有点抗拒" />
          </div>
          <button class="btn btn-primary" style="grid-column: 1 / -1" @click="addRecord">保存记录</button>
        </div>
      </div>
    </div>

    <!-- 近30天趋势图表 -->
    <div class="card chart-card">
      <h3 class="section-title">📈 佩戴时间趋势（近30天）</h3>
      <canvas ref="trendChartRef" height="80"></canvas>
    </div>

    <!-- 历史记录 -->
    <div class="card" style="margin-top: 16px;">
      <h3 class="section-title">📝 历史记录</h3>
      <div v-if="records.length" class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>日期</th>
              <th>佩戴时段</th>
              <th>佩戴时长</th>
              <th>备注</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in sortedRecords" :key="r.id">
              <td data-label="日期">{{ r.date }}</td>
              <td data-label="佩戴时段">{{ r.startTime }} - {{ r.endTime }}</td>
              <td data-label="佩戴时长">{{ formatMinutes(r.durationMinutes) }}</td>
              <td data-label="备注">{{ r.note || '-' }}</td>
              <td data-label="操作">
                <button class="btn btn-danger btn-sm" @click="deleteRecord(r.id)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="empty">暂无戴眼罩记录，快去录入第一条吧 👁️</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import { Chart, registerables } from 'chart.js'
import { getStorage, setStorage, today } from '../utils/storage.js'

Chart.register(...registerables)

// 本地存储数组初始化
const records = ref(getStorage('eyepatch_records', []))

// 阶段计算数据
const startDate = new Date('2026-06-17')
const checkupDate = new Date('2026-09-17')

// 已坚持天数
const daysPassed = computed(() => {
  const diffTime = new Date().getTime() - startDate.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays > 0 ? diffDays : 0
})

// 距离复查剩余天数
const daysRemaining = computed(() => {
  const diffTime = checkupDate.getTime() - new Date().getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays > 0 ? diffDays : 0
})

// 总体治疗阶段进度（百分比）
const overallProgress = computed(() => {
  const total = checkupDate.getTime() - startDate.getTime()
  const passed = new Date().getTime() - startDate.getTime()
  if (passed <= 0) return 0
  if (passed >= total) return 100
  return Math.round((passed / total) * 100)
})

// 今日佩戴累计
const todayRecords = computed(() => records.value.filter(r => r.date === today()))
const todayTotalMinutes = computed(() => todayRecords.value.reduce((s, r) => s + r.durationMinutes, 0))
const todayTotalHours = computed(() => (todayTotalMinutes.value / 60).toFixed(1))

// 历史列表排序（日期+开始时间倒序）
const sortedRecords = computed(() =>
  [...records.value].sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime))
)

// 录入表单状态
const form = reactive({
  date: today(),
  startTime: '13:30',
  endTime: '14:30',
  note: ''
})

// 时长转换计算
function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function formatMinutes(mins) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m}分钟`
  if (m === 0) return `${h}小时`
  return `${h}小时${m}分钟`
}

// 新增记录
function addRecord() {
  if (!form.date || !form.startTime || !form.endTime) {
    alert('请填写完整的日期与时间段！')
    return
  }
  const start = timeToMinutes(form.startTime)
  const end = timeToMinutes(form.endTime)
  if (end <= start) {
    alert('结束时间必须晚于开始时间！')
    return
  }

  const duration = end - start
  records.value.push({
    id: Date.now(),
    date: form.date,
    startTime: form.startTime,
    endTime: form.endTime,
    durationMinutes: duration,
    note: form.note.trim()
  })

  setStorage('eyepatch_records', records.value)
  form.note = ''
  updateChart()
}

// 删除记录
function deleteRecord(id) {
  if (confirm('确认删除此佩戴记录吗？')) {
    records.value = records.value.filter(r => r.id !== id)
    setStorage('eyepatch_records', records.value)
    updateChart()
  }
}

// 趋势图表渲染
function last30Days() {
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - 29 + i)
    return d.toISOString().slice(0, 10)
  })
}

const trendChartRef = ref(null)
let trendChart = null

function getChartData(days) {
  const map = {}
  records.value.forEach(r => {
    map[r.date] = (map[r.date] || 0) + r.durationMinutes
  })
  return days.map(d => parseFloat(((map[d] || 0) / 60).toFixed(1)))
}

function updateChart() {
  if (trendChart) {
    const days = last30Days()
    trendChart.data.datasets[0].data = getChartData(days)
    trendChart.update()
  }
}

onMounted(() => {
  const days = last30Days()
  const labels = days.map(d => d.slice(5))
  const data = getChartData(days)

  trendChart = new Chart(trendChartRef.value, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: '实际戴眼罩时间（小时）',
          data,
          borderColor: '#ff7043',
          backgroundColor: '#ff704322',
          tension: 0.3,
          pointRadius: 3,
          fill: true
        },
        {
          label: '目标门槛（4小时）',
          data: Array(30).fill(4),
          borderColor: '#38a169',
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false,
          borderWidth: 1.5
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true, position: 'top' }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 6,
          title: { display: true, text: '小时' }
        }
      }
    }
  })
})
</script>

<style scoped>
.countdown-card {
  background: linear-gradient(135deg, #fffbf0 0%, #fff7e6 100%);
  border: 1px solid #ffe8cc;
}
.countdown-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.card-title {
  font-size: 16px;
  font-weight: 700;
  color: #c05621;
}
.countdown-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 2fr;
  gap: 16px;
}
@media (max-width: 768px) {
  .countdown-grid {
    grid-template-columns: 1fr 1fr;
  }
  .full-width-mobile {
    grid-column: 1 / -1;
  }
}
.countdown-item {
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.count-num {
  font-size: 32px;
  font-weight: 800;
  color: #dd6b20;
}
.count-label {
  font-size: 12px;
  color: #dd6b20;
  margin-top: 4px;
  font-weight: 500;
}

.progress-bar-label {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #744210;
  font-weight: 600;
  margin-bottom: 6px;
}
.progress-bar-wrap {
  height: 8px;
  background: #ffeb3b44;
  border-radius: 4px;
  overflow: hidden;
}
.progress-bar-fill {
  height: 100%;
  background: #dd6b20;
  border-radius: 4px;
}
.progress-bar-dates {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: #a0aec0;
  margin-top: 6px;
}

.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
@media (max-width: 768px) {
  .two-col {
    grid-template-columns: 1fr;
  }
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 14px;
}

.today-hours-wrap {
  display: flex;
  align-items: center;
  gap: 20px;
  justify-content: center;
  padding: 10px 0;
}
.today-hours-circle {
  width: 110px;
  height: 110px;
  border-radius: 50%;
  border: 8px solid #ff980044;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.today-hours-circle.success {
  border-color: #4caf50;
  background: #e8f5e9;
}
.hour-val {
  font-size: 22px;
  font-weight: 800;
  color: #2d3748;
}
.hour-val small {
  font-size: 12px;
  font-weight: 400;
}
.hour-target {
  font-size: 10px;
  color: #a0aec0;
  margin-top: 2px;
}
.today-status-text {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.sub-text {
  font-size: 12px;
  color: #718096;
}

.add-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
@media (max-width: 480px) {
  .add-form {
    grid-template-columns: 1fr;
  }
}

.chart-card {
  margin-top: 16px;
}
.chart-card canvas {
  max-height: 220px !important;
}

.table-wrap {
  overflow-x: auto;
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
th, td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid #f0f0f0;
}
th {
  color: #a0aec0;
  font-weight: 500;
}

/* 移动端表格折叠卡片样式 */
@media (max-width: 600px) {
  table, thead, tbody, th, td, tr {
    display: block;
  }
  thead {
    display: none;
  }
  tr {
    margin-bottom: 12px;
    border: 1.5px solid #e2e8f0;
    border-radius: 12px;
    padding: 10px 14px;
    background: #fff;
  }
  td {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px dashed #f0f0f0;
    min-height: 38px;
    text-align: right;
  }
  td:last-child {
    border-bottom: none;
  }
  td::before {
    content: attr(data-label);
    font-weight: 600;
    color: #718096;
    margin-right: 8px;
    text-align: left;
  }
}
</style>
