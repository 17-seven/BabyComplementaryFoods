<template>
  <div>
    <div class="page-header">
      <h2>奶量 / 水量</h2>
      <p>记录每日摄入，观察喂养趋势</p>
    </div>

    <div class="two-col">
      <!-- 奶量 -->
      <div class="card">
        <h3 class="section-title">🍼 今日奶量</h3>
        <div class="big-num">{{ todayMilkTotal }} <small>ml</small></div>

        <div style="margin-top:14px;">
          <div class="form-row">
            <label>日期</label>
            <input type="date" v-model="milkForm.date" :max="today()" />
          </div>
          <div class="form-row">
            <label>奶量（ml）</label>
            <input type="number" v-model="milkForm.amount" min="0" max="500" step="5" placeholder="如：180" />
          </div>
          <div class="form-row">
            <label>备注</label>
            <input type="text" v-model="milkForm.note" placeholder="如：加了乳果糖15ml" />
          </div>
          <button class="btn btn-primary" style="width:100%" @click="addMilk">添加一次喂奶</button>
        </div>

        <div v-if="todayMilkList.length" style="margin-top:16px;">
          <div class="record-item" v-for="r in todayMilkList" :key="r.id">
            <span>{{ r.date }} · {{ r.amount }} ml</span>
            <span v-if="r.note" style="color:#e67e22;font-size:12px;">  {{ r.note }}</span>
            <button class="btn btn-danger btn-sm" @click="deleteMilk(r.id)" style="margin-left:auto">删除</button>
          </div>
        </div>
      </div>

      <!-- 水量 -->
      <div class="card">
        <h3 class="section-title">💧 今日水量</h3>
        <div class="big-num blue">{{ todayWater }} <small>ml</small></div>

        <div style="margin-top:14px;">
          <div class="form-row">
            <label>日期</label>
            <input type="date" v-model="waterForm.date" :max="today()" />
          </div>
          <div class="form-row">
            <label>水量（ml）</label>
            <input type="number" v-model="waterForm.amount" min="0" max="1000" step="10" placeholder="如：200" />
          </div>
          <button class="btn btn-secondary" style="width:100%" @click="saveWater">保存今日水量</button>
        </div>
      </div>
    </div>

    <!-- 奶量趋势 -->
    <div class="card chart-card">
      <h3 class="section-title">奶量趋势（近30天，ml）</h3>
      <canvas ref="milkChartRef" height="80"></canvas>
    </div>

    <!-- 水量趋势 -->
    <div class="card chart-card">
      <h3 class="section-title">水量趋势（近30天，ml）</h3>
      <canvas ref="waterChartRef" height="80"></canvas>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Chart, registerables } from 'chart.js'
import { getStorage, setStorage, today } from '../utils/storage.js'

Chart.register(...registerables)

const milkRecords = ref(getStorage('milk_records', []))
const waterRecords = ref(getStorage('water_records', []))

const milkForm = ref({ date: today(), amount: '', note: '' })
const waterForm = ref({ date: today(), amount: '' })

const todayMilkList = computed(() =>
  milkRecords.value.filter(r => r.date === milkForm.value.date)
)
const todayMilkTotal = computed(() =>
  milkRecords.value.filter(r => r.date === today()).reduce((s, r) => s + (r.amount || 0), 0)
)
const todayWater = computed(() => {
  const rec = waterRecords.value.find(r => r.date === waterForm.value.date)
  return rec ? rec.amount : 0
})

function addMilk() {
  if (!milkForm.value.amount) return
  milkRecords.value.push({ id: Date.now(), date: milkForm.value.date, amount: +milkForm.value.amount, note: milkForm.value.note })
  setStorage('milk_records', milkRecords.value)
  milkForm.value.amount = ''
  milkForm.value.note = ''
  updateCharts()
}
function deleteMilk(id) {
  milkRecords.value = milkRecords.value.filter(r => r.id !== id)
  setStorage('milk_records', milkRecords.value)
  updateCharts()
}
function saveWater() {
  if (!waterForm.value.amount) return
  const idx = waterRecords.value.findIndex(r => r.date === waterForm.value.date)
  if (idx >= 0) waterRecords.value[idx].amount = +waterForm.value.amount
  else waterRecords.value.push({ id: Date.now(), date: waterForm.value.date, amount: +waterForm.value.amount })
  setStorage('water_records', waterRecords.value)
  updateCharts()
}

// 生成最近30天标签
function last30Days() {
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - 29 + i)
    return d.toISOString().slice(0, 10)
  })
}

const milkChartRef = ref(null)
const waterChartRef = ref(null)
let milkChart = null
let waterChart = null

function getMilkByDay(days) {
  return days.map(d => milkRecords.value.filter(r => r.date === d).reduce((s, r) => s + r.amount, 0))
}
function getWaterByDay(days) {
  return days.map(d => (waterRecords.value.find(r => r.date === d)?.amount || 0))
}

function updateCharts() {
  const days = last30Days()
  if (milkChart) { milkChart.data.datasets[0].data = getMilkByDay(days); milkChart.update() }
  if (waterChart) { waterChart.data.datasets[0].data = getWaterByDay(days); waterChart.update() }
}

const chartOpts = { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }

onMounted(() => {
  const days = last30Days()
  const labels = days.map(d => d.slice(5))
  milkChart = new Chart(milkChartRef.value, {
    type: 'bar',
    data: { labels, datasets: [{ data: getMilkByDay(days), backgroundColor: '#6CA84766', borderColor: '#6CA847', borderWidth: 1.5 }] },
    options: chartOpts
  })
  waterChart = new Chart(waterChartRef.value, {
    type: 'bar',
    data: { labels, datasets: [{ data: getWaterByDay(days), backgroundColor: '#4fc3f766', borderColor: '#4fc3f7', borderWidth: 1.5 }] },
    options: chartOpts
  })
})
</script>

<style scoped>
.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
@media (max-width: 700px) { .two-col { grid-template-columns: 1fr; } }
.section-title { font-size: 15px; font-weight: 600; margin-bottom: 14px; }
.big-num { font-size: 40px; font-weight: 700; color: #5A8D3D; }
.big-num.blue { color: #4fc3f7; }
.big-num small { font-size: 16px; font-weight: 400; }
.chart-card { margin-top: 16px; }
.chart-card canvas { max-height: 220px !important; }
.record-item { display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid #f7f7f7; font-size: 13px; }
</style>
