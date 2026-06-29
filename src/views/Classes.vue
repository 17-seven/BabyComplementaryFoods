<template>
  <div>
    <div class="page-header">
      <h2>春雨康复课程</h2>
      <p>课时记录 · 余额追踪 · 出勤统计</p>
    </div>

    <!-- 余额卡片 -->
    <div class="top-cards">
      <div class="card balance-card" :class="{ warn: currentBalance < 500, danger: currentBalance < 0 }">
        <div class="bal-label">当前余额</div>
        <div class="bal-val" :style="{ color: currentBalance < 0 ? '#e53e3e' : currentBalance < 500 ? '#dd6b20' : '#38a169' }">
          ¥ {{ currentBalance }}
        </div>
        <div v-if="currentBalance < 500" class="bal-tip">⚠️ 余额不足，请及时充值</div>
      </div>
      <div class="card stat-mini">
        <div class="stat-mini-val">{{ attendedCount }}</div>
        <div class="stat-mini-label">本月上课</div>
      </div>
      <div class="card stat-mini">
        <div class="stat-mini-val">{{ absentCount }}</div>
        <div class="stat-mini-label">本月缺课</div>
      </div>
      <div class="card stat-mini">
        <div class="stat-mini-val">¥{{ monthCost }}</div>
        <div class="stat-mini-label">本月消费</div>
      </div>
    </div>

    <!-- 余额趋势 -->
    <div class="card chart-card">
      <h3 class="section-title">余额趋势</h3>
      <canvas ref="balanceChartRef" height="70"></canvas>
    </div>

    <!-- 添加记录 -->
    <div class="card" style="margin-top:16px;">
      <h3 class="section-title">添加课程记录</h3>
      <div class="add-form">
        <div class="form-row">
          <label>日期</label>
          <input type="date" v-model="form.date" />
        </div>
        <div class="form-row">
          <label>星期</label>
          <input type="text" v-model="form.dayName" placeholder="如：周一" />
        </div>
        <div class="form-row">
          <label>是否上课</label>
          <select v-model="form.attended">
            <option :value="true">上课</option>
            <option :value="false">未上课</option>
          </select>
        </div>
        <div class="form-row" v-if="form.attended">
          <label>老师</label>
          <select v-model="form.teacher">
            <option>春雨老师</option><option>小于老师</option><option>小于老师/春雨老师</option>
          </select>
        </div>
        <div class="form-row" v-if="form.attended">
          <label>课节数</label>
          <select v-model="form.sessions">
            <option :value="1">1节</option><option :value="1.5">1.5节</option><option :value="2">2节</option>
          </select>
        </div>
        <div class="form-row" v-if="form.attended">
          <label>课时费（元）</label>
          <input type="number" v-model="form.cost" min="0" />
        </div>
        <div class="form-row">
          <label>充值（元，没有填0）</label>
          <input type="number" v-model="form.topup" min="0" />
        </div>
        <div class="form-row">
          <label>余额（元）</label>
          <input type="number" v-model="form.balance" />
        </div>
        <div class="form-row">
          <label>备注</label>
          <input type="text" v-model="form.note" placeholder="如：冲1000" />
        </div>
        <button class="btn btn-primary" @click="addRecord">保存</button>
      </div>
    </div>

    <!-- 记录列表 -->
    <div class="card" style="margin-top:16px;">
      <div class="list-header">
        <h3 class="section-title" style="margin:0">历史记录</h3>
        <select v-model="filterMonth" class="month-select">
          <option value="">全部月份</option>
          <option v-for="m in months" :key="m" :value="m">{{ m }}</option>
        </select>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>日期</th><th>星期</th><th>状态</th><th>老师</th>
              <th>课节</th><th>费用</th><th>充值</th><th>余额</th><th>备注</th><th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in filteredRecords" :key="r.date + (r.id||'')" :class="{ absent: !r.attended, negative: r.balance < 0 }">
              <td data-label="日期">{{ r.date }}</td>
              <td data-label="星期">{{ r.dayName }}</td>
              <td data-label="状态"><span class="tag" :class="r.attended ? 'tag-green' : 'tag-red'">{{ r.attended ? '✓ 上课' : '✗ 未去' }}</span></td>
              <td data-label="老师">{{ r.teacher || '-' }}</td>
              <td data-label="课节">{{ r.sessions || '-' }}</td>
              <td data-label="费用">{{ r.cost ? '¥'+r.cost : '-' }}</td>
              <td data-label="充值">{{ r.topup ? '¥'+r.topup : '-' }}</td>
              <td data-label="余额" :style="{ color: r.balance < 0 ? '#e53e3e' : 'inherit', fontWeight: 600 }">¥{{ r.balance }}</td>
              <td data-label="备注" style="max-width:160px;word-break:break-all">{{ r.note }}</td>
              <td data-label="操作">
                <button v-if="r.id" class="btn btn-danger btn-sm" @click="deleteRecord(r.id)">删</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Chart, registerables } from 'chart.js'
import { classRecords } from '../data/classes.js'
import { getStorage, setStorage, today } from '../utils/storage.js'

Chart.register(...registerables)

const userRecords = ref(getStorage('class_user_records', []))

const allRecords = computed(() =>
  [...classRecords, ...userRecords.value].sort((a, b) => a.date.localeCompare(b.date))
)

const currentBalance = computed(() => allRecords.value.length ? allRecords.value[allRecords.value.length - 1].balance : 0)

const thisMonth = today().slice(0, 7)
const attendedCount = computed(() => allRecords.value.filter(r => r.date.startsWith(thisMonth) && r.attended).length)
const absentCount   = computed(() => allRecords.value.filter(r => r.date.startsWith(thisMonth) && !r.attended && r.date <= today()).length)
const monthCost     = computed(() => allRecords.value.filter(r => r.date.startsWith(thisMonth)).reduce((s, r) => s + (r.cost || 0), 0))

const months = computed(() => {
  const set = new Set(allRecords.value.map(r => r.date.slice(0, 7)))
  return [...set].sort().reverse()
})
const filterMonth = ref('')

const filteredRecords = computed(() => {
  const list = [...allRecords.value].reverse()
  if (!filterMonth.value) return list
  return list.filter(r => r.date.startsWith(filterMonth.value))
})

// 表单
const form = ref({ date: today(), dayName: '', attended: true, teacher: '春雨老师', sessions: 2, cost: 240, topup: 0, balance: '', note: '' })

function addRecord() {
  if (!form.value.date || form.value.balance === '') return
  userRecords.value.push({ ...form.value, id: Date.now(), cost: +form.value.cost, topup: +form.value.topup, balance: +form.value.balance, sessions: +form.value.sessions })
  setStorage('class_user_records', userRecords.value)
  form.value = { date: today(), dayName: '', attended: true, teacher: '春雨老师', sessions: 2, cost: 240, topup: 0, balance: '', note: '' }
  updateChart()
}
function deleteRecord(id) {
  userRecords.value = userRecords.value.filter(r => r.id !== id)
  setStorage('class_user_records', userRecords.value)
  updateChart()
}

// 图表
const balanceChartRef = ref(null)
let balanceChart = null

function updateChart() {
  const data = allRecords.value.slice(-60) // 最近60条
  if (balanceChart) {
    balanceChart.data.labels = data.map(r => r.date.slice(5))
    balanceChart.data.datasets[0].data = data.map(r => r.balance)
    balanceChart.update()
  }
}

onMounted(() => {
  const data = allRecords.value.slice(-60)
  balanceChart = new Chart(balanceChartRef.value, {
    type: 'line',
    data: {
      labels: data.map(r => r.date.slice(5)),
      datasets: [{
        data: data.map(r => r.balance),
        borderColor: '#4fc3f7', backgroundColor: '#4fc3f722',
        tension: 0.3, pointRadius: 2, fill: true
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: false } }
    }
  })
})
</script>

<style scoped>
.top-cards { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 14px; margin-bottom: 16px; }
@media (max-width: 900px) { .top-cards { grid-template-columns: 1fr 1fr; } }
@media (max-width: 480px) { .top-cards { grid-template-columns: 1fr; } }

.balance-card { }
.bal-label { font-size: 12px; color: #a0aec0; }
.bal-val { font-size: 32px; font-weight: 700; margin-top: 4px; }
.bal-tip { font-size: 12px; color: #dd6b20; margin-top: 6px; }

.stat-mini { text-align: center; }
.stat-mini-val { font-size: 24px; font-weight: 700; color: #2d3748; }
.stat-mini-label { font-size: 12px; color: #a0aec0; margin-top: 4px; }

.chart-card { }
.chart-card canvas { max-height: 220px !important; }
.section-title { font-size: 15px; font-weight: 600; margin-bottom: 14px; }

.add-form { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0 16px; }
@media (max-width: 900px) { .add-form { grid-template-columns: 1fr 1fr; } }
@media (max-width: 550px) { .add-form { grid-template-columns: 1fr; } }
.add-form .btn { grid-column: 1 / -1; }

.list-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.month-select { border: 1.5px solid #e2e8f0; border-radius: 8px; padding: 6px 10px; font-size: 13px; }

.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th, td { padding: 9px 10px; text-align: left; border-bottom: 1px solid #f0f0f0; white-space: nowrap; }
th { color: #a0aec0; font-weight: 500; }
tr.absent td { color: #a0aec0; }
tr.negative td.negative-balance { color: #e53e3e; }

/* 移动端表格卡片化展示 */
@media (max-width: 768px) {
  table, thead, tbody, th, td, tr { display: block; }
  thead { display: none; } /* 移动端隐藏表头 */
  tr { margin-bottom: 12px; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 10px 14px; background: #fff; }
  td { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px dashed #f0f0f0; min-height: 38px; text-align: right; white-space: normal; }
  td:last-child { border-bottom: none; }
  td::before { content: attr(data-label); font-weight: 600; color: #718096; margin-right: 8px; text-align: left; }
}
</style>
