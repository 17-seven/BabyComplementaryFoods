<template>
  <div>
    <div class="page-header">
      <h2>身高体重</h2>
      <p>记录宝宝生长趋势，定期测量更准确</p>
    </div>

    <div class="two-col">
      <!-- 录入表单 -->
      <div class="card form-card">
        <h3 class="section-title">添加记录</h3>
        <div class="form-row">
          <label>日期</label>
          <input type="date" v-model="form.date" :max="today()" />
        </div>
        <div class="form-row">
          <label>体重（kg）</label>
          <input type="number" v-model="form.weight" step="0.01" min="1" max="30" placeholder="如：8.50" />
        </div>
        <div class="form-row">
          <label>身高（cm）</label>
          <input type="number" v-model="form.height" step="0.1" min="40" max="130" placeholder="如：72.5" />
        </div>
        <div class="form-row">
          <label>备注</label>
          <input type="text" v-model="form.note" placeholder="如：体检测量" />
        </div>
        <button class="btn btn-primary" style="width:100%" @click="addRecord">保存记录</button>
      </div>

      <!-- 最新数据 -->
      <div class="card latest-card">
        <h3 class="section-title">最新数据</h3>
        <div v-if="latestRecord">
          <div class="big-val">{{ latestRecord.weight }} <small>kg</small></div>
          <div class="big-val blue">{{ latestRecord.height }} <small>cm</small></div>
          <div style="color:#a0aec0;font-size:12px;margin-top:8px;">{{ latestRecord.date }}</div>
        </div>
        <div v-else class="empty">暂无数据</div>
      </div>
    </div>

    <!-- 趋势图 -->
    <div class="card chart-card">
      <h3 class="section-title">体重趋势（kg）</h3>
      <canvas ref="weightChartRef" height="80"></canvas>
    </div>
    <div class="card chart-card">
      <h3 class="section-title">身高趋势（cm）</h3>
      <canvas ref="heightChartRef" height="80"></canvas>
    </div>

    <!-- 历史记录 -->
    <div class="card" style="margin-top:16px;">
      <h3 class="section-title">历史记录</h3>
      <div v-if="records.length" class="table-wrap">
        <table>
          <thead><tr><th>日期</th><th>体重(kg)</th><th>身高(cm)</th><th>备注</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="r in sortedRecords" :key="r.id">
              <td data-label="日期">{{ r.date }}</td>
              <td data-label="体重(kg)">{{ r.weight }}</td>
              <td data-label="身高(cm)">{{ r.height }}</td>
              <td data-label="备注">{{ r.note }}</td>
              <td data-label="操作"><button class="btn btn-danger btn-sm" @click="deleteRecord(r.id)">删除</button></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="empty">暂无记录，添加第一条吧 👆</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { Chart, registerables } from 'chart.js'
import { getStorage, setStorage, today } from '../utils/storage.js'

Chart.register(...registerables)

const records = ref(getStorage('growth_records', []))

const form = ref({ date: today(), weight: '', height: '', note: '' })

const sortedRecords = computed(() =>
  [...records.value].sort((a, b) => b.date.localeCompare(a.date))
)
const latestRecord = computed(() =>
  records.value.length ? sortedRecords.value[0] : null
)
const chartData = computed(() =>
  [...records.value].sort((a, b) => a.date.localeCompare(b.date))
)

function addRecord() {
  if (!form.value.date || (!form.value.weight && !form.value.height)) return
  records.value.push({
    id: Date.now(),
    date: form.value.date,
    weight: form.value.weight ? parseFloat(form.value.weight) : null,
    height: form.value.height ? parseFloat(form.value.height) : null,
    note: form.value.note
  })
  setStorage('growth_records', records.value)
  form.value = { date: today(), weight: '', height: '', note: '' }
  updateCharts()
}

function deleteRecord(id) {
  records.value = records.value.filter(r => r.id !== id)
  setStorage('growth_records', records.value)
  updateCharts()
}

const weightChartRef = ref(null)
const heightChartRef = ref(null)
let weightChart = null
let heightChart = null

const chartOpts = {
  responsive: true,
  plugins: { legend: { display: false } },
  scales: { y: { beginAtZero: false } }
}

function buildChart(canvas, label, color, dataArr) {
  return new Chart(canvas, {
    type: 'line',
    data: {
      labels: dataArr.map(r => r.date),
      datasets: [{ label, data: dataArr.map(r => r), parsing: { yAxisKey: label === '体重' ? 'weight' : 'height' }, borderColor: color, backgroundColor: color + '22', tension: 0.4, pointRadius: 4 }]
    },
    options: { ...chartOpts, plugins: { ...chartOpts.plugins, tooltip: { callbacks: { label: ctx => `${ctx.raw[label === '体重' ? 'weight' : 'height']} ${label === '体重' ? 'kg' : 'cm'}` } } } }
  })
}

function updateCharts() {
  const data = chartData.value
  if (weightChart) { weightChart.data.labels = data.map(r => r.date); weightChart.data.datasets[0].data = data; weightChart.update() }
  if (heightChart) { heightChart.data.labels = data.map(r => r.date); heightChart.data.datasets[0].data = data; heightChart.update() }
}

onMounted(() => {
  const data = chartData.value
  weightChart = buildChart(weightChartRef.value, '体重', '#ff7043', data)
  heightChart  = buildChart(heightChartRef.value,  '身高', '#4fc3f7', data)
})
</script>

<style scoped>
.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
@media (max-width: 700px) { .two-col { grid-template-columns: 1fr; } }

.section-title { font-size: 15px; font-weight: 600; margin-bottom: 14px; }
.form-card { }
.latest-card { display: flex; flex-direction: column; justify-content: center; }
.big-val { font-size: 36px; font-weight: 700; color: #ff7043; }
.big-val.blue { color: #4fc3f7; }
.big-val small { font-size: 16px; font-weight: 400; }

.chart-card { margin-top: 16px; }
.chart-card canvas { max-height: 220px !important; }

.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 14px; }
th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #f0f0f0; }
th { color: #a0aec0; font-weight: 500; font-size: 13px; }

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
