<template>
  <div>
    <div class="page-header">
      <h2>宝宝课程打卡系统</h2>
      <p>课时记录 · 余额追踪 · 出勤统计 · 多客户支持</p>
    </div>

    <!-- 客户管理与数据备份控制条 -->
    <div class="card header-action-bar">
      <div class="customer-select-area">
        <label class="bar-label">选择客户：</label>
        <select v-model="activeCustomerId" class="select-input">
          <option v-for="c in customers" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
        <button class="btn btn-primary btn-sm" style="padding: 6px 12px;" @click="showAddCustomer = true">➕ 新建客户</button>
        <button v-if="activeCustomerId !== 'spring_rain'" class="btn btn-danger btn-sm" @click="deleteActiveCustomer">🗑️ 删除客户</button>
      </div>
      <div class="data-action-area">
        <input type="file" ref="fileInputRef" style="display:none" accept=".json" @change="handleImport" />
        <button class="btn btn-secondary btn-sm" style="padding: 6px 12px;" @click="triggerImport">📥 导入记录 (JSON)</button>
        <button class="btn btn-secondary btn-sm" style="padding: 6px 12px;" @click="exportJSON">📤 导出备份 (JSON)</button>
      </div>
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
      <h3 class="section-title">添加课程与收支记录</h3>
      <div class="add-form">
        <div class="form-row">
          <label>日期</label>
          <input type="date" v-model="form.date" />
        </div>
        <div class="form-row">
          <label>星期</label>
          <input type="text" v-model="form.dayName" readonly placeholder="自动获取" style="background-color: #f7fafc; color: #718096" />
        </div>
        <div class="form-row">
          <label>出勤状态</label>
          <select v-model="form.attended">
            <option :value="true">上课 (出勤)</option>
            <option :value="false">未上课 (请假/缺席)</option>
          </select>
        </div>
        <div class="form-row" v-if="form.attended">
          <label>上课老师</label>
          <input type="text" v-model="form.teacher" placeholder="如：春雨老师" />
        </div>
        <div class="form-row" v-if="form.attended">
          <label>消耗课节</label>
          <select v-model="form.sessions">
            <option :value="1">1节</option>
            <option :value="1.5">1.5节</option>
            <option :value="2">2节</option>
            <option :value="3">3节</option>
          </select>
        </div>
        <div class="form-row" v-if="form.attended">
          <label>当日扣费（元）</label>
          <input type="number" v-model="form.cost" min="0" />
        </div>
        <div class="form-row">
          <label>当日充值（元，没有填0）</label>
          <input type="number" v-model="form.topup" min="0" />
        </div>
        <div class="form-row">
          <label>最终余额（元，自动预计算）</label>
          <input type="number" v-model="form.balance" placeholder="预计算余额" />
        </div>
        <div class="form-row">
          <label>备注</label>
          <input type="text" v-model="form.note" placeholder="例如：充3000，或缺勤说明" />
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
            <tr v-for="r in filteredRecords" :key="r.id || r.date" :class="{ absent: !r.attended, negative: r.balance < 0 }">
              <td data-label="日期">{{ r.date }}</td>
              <td data-label="星期">{{ r.dayName }}</td>
              <td data-label="状态">
                <span class="tag" :class="r.attended ? 'tag-green' : 'tag-red'">{{ r.attended ? '✓ 上课' : '✗ 未去' }}</span>
              </td>
              <td data-label="老师">{{ r.teacher || '-' }}</td>
              <td data-label="课节">{{ r.sessions || '-' }}</td>
              <td data-label="费用">{{ r.cost ? '¥'+r.cost : '-' }}</td>
              <td data-label="充值">{{ r.topup ? '¥'+r.topup : '-' }}</td>
              <td data-label="余额" :style="{ color: r.balance < 0 ? '#e53e3e' : 'inherit', fontWeight: 600 }">¥{{ r.balance }}</td>
              <td data-label="备注" style="max-width:180px;white-space:normal;word-break:break-all">{{ r.note }}</td>
              <td data-label="操作">
                <button class="btn btn-danger btn-sm" style="padding: 2px 6px;" @click="deleteRecord(r.id)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 新建客户弹窗 -->
    <div v-if="showAddCustomer" class="modal-mask" @click.self="showAddCustomer = false">
      <div class="modal-box card">
        <h3>新增客户档案</h3>
        <div class="form-row" style="margin-top:14px;">
          <label>客户/宝贝姓名</label>
          <input type="text" v-model="newCustomerName" placeholder="例如：李小宝" @keyup.enter="addCustomer" />
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:20px;">
          <button class="btn btn-secondary" @click="showAddCustomer = false">取消</button>
          <button class="btn btn-primary" @click="addCustomer">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { Chart, registerables } from 'chart.js'
import { classRecords } from '../data/classes.js'
import { getStorage, setStorage, today } from '../utils/storage.js'

Chart.register(...registerables)

// 多客户状态管理
const customers = ref(getStorage('class_customers', [{ id: 'spring_rain', name: '春雨 (默认)' }]))
const activeCustomerId = ref(getStorage('class_active_customer_id', 'spring_rain'))
const customerRecords = ref([])

const showAddCustomer = ref(false)
const newCustomerName = ref('')
const fileInputRef = ref(null)

// 页面表单数据
const form = ref({ date: today(), dayName: getDayName(today()), attended: true, teacher: '春雨老师', sessions: 2, cost: 240, topup: 0, balance: '', note: '' })

// 载入当前选中客户的打卡明细
function loadActiveCustomerRecords() {
  let records = getStorage(`class_records_${activeCustomerId.value}`, null)
  if (records === null) {
    if (activeCustomerId.value === 'spring_rain') {
      // 默认春雨客户，导入静态种子数据并赋予唯一 ID
      records = classRecords.map((r, idx) => ({ ...r, id: `seed_${idx}` }))
      setStorage(`class_records_spring_rain`, records)
    } else {
      records = []
    }
  }
  customerRecords.value = records.sort((a, b) => a.date.localeCompare(b.date))
}

const currentBalance = computed(() => customerRecords.value.length ? customerRecords.value[customerRecords.value.length - 1].balance : 0)

const thisMonth = today().slice(0, 7)
const attendedCount = computed(() => customerRecords.value.filter(r => r.date.startsWith(thisMonth) && r.attended).length)
const absentCount   = computed(() => customerRecords.value.filter(r => r.date.startsWith(thisMonth) && !r.attended && r.date <= today()).length)
const monthCost     = computed(() => customerRecords.value.filter(r => r.date.startsWith(thisMonth)).reduce((s, r) => s + (r.cost || 0), 0))

const months = computed(() => {
  const set = new Set(customerRecords.value.map(r => r.date.slice(0, 7)))
  return [...set].sort().reverse()
})
const filterMonth = ref('')

const filteredRecords = computed(() => {
  const list = [...customerRecords.value].reverse()
  if (!filterMonth.value) return list
  return list.filter(r => r.date.startsWith(filterMonth.value))
})

// 计算表单预计算余额
const precalculatedBalance = computed(() => {
  const lastBal = customerRecords.value.length ? customerRecords.value[customerRecords.value.length - 1].balance : 0
  return lastBal + (+form.value.topup || 0) - (+form.value.cost || 0)
})

// 监听出勤状态变化自动设定课时和费用默认值
watch(() => form.value.attended, (newAttended) => {
  if (newAttended) {
    form.value.teacher = '春雨老师'
    form.value.sessions = 2
    form.value.cost = 240
  } else {
    form.value.teacher = ''
    form.value.sessions = 0
    form.value.cost = 0
  }
})

// 监听日期变化自动生成星期名称
watch(() => form.value.date, (newDate) => {
  if (newDate) {
    form.value.dayName = getDayName(newDate)
  }
})

// 自动填充预计算余额
watch([customerRecords, () => form.value.topup, () => form.value.cost], () => {
  form.value.balance = precalculatedBalance.value
}, { immediate: true })

// 监听客户切换
watch(activeCustomerId, () => {
  setStorage('class_active_customer_id', activeCustomerId.value)
  loadActiveCustomerRecords()
  form.value = { date: today(), dayName: getDayName(today()), attended: true, teacher: '春雨老师', sessions: 2, cost: 240, topup: 0, balance: '', note: '' }
  updateChart()
})

// 获取周名
function getDayName(dateStr) {
  if (!dateStr) return ''
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const date = new Date(dateStr)
  return weekDays[date.getDay()]
}

// 添加客户
function addCustomer() {
  const name = newCustomerName.value.trim()
  if (!name) return
  const id = `customer_${Date.now()}`
  customers.value.push({ id, name })
  setStorage('class_customers', customers.value)
  activeCustomerId.value = id
  newCustomerName.value = ''
  showAddCustomer.value = false
}

// 删除客户
function deleteActiveCustomer() {
  if (activeCustomerId.value === 'spring_rain') {
    alert('默认客户春雨档案无法删除！')
    return
  }
  const activeCustomer = customers.value.find(c => c.id === activeCustomerId.value)
  if (confirm(`确定要彻底删除客户 "${activeCustomer ? activeCustomer.name : ''}" 吗？该客户的全部上课充值与扣费记录都会被清除，此操作不可撤销！`)) {
    localStorage.removeItem(`class_records_${activeCustomerId.value}`)
    customers.value = customers.value.filter(c => c.id !== activeCustomerId.value)
    setStorage('class_customers', customers.value)
    activeCustomerId.value = 'spring_rain'
  }
}

// 增加扣费或充值记录
function addRecord() {
  if (!form.value.date || form.value.balance === '') return
  
  customerRecords.value.push({
    id: Date.now(),
    date: form.value.date,
    dayName: form.value.dayName,
    attended: form.value.attended,
    teacher: form.value.attended ? form.value.teacher : '',
    sessions: form.value.attended ? +form.value.sessions : 0,
    cost: +form.value.cost,
    topup: +form.value.topup,
    balance: +form.value.balance,
    note: form.value.note
  })

  // 按日期排序并保存
  customerRecords.value.sort((a, b) => a.date.localeCompare(b.date))
  setStorage(`class_records_${activeCustomerId.value}`, customerRecords.value)

  // 表单状态重置为今天
  form.value = { date: today(), dayName: getDayName(today()), attended: true, teacher: '春雨老师', sessions: 2, cost: 240, topup: 0, balance: '', note: '' }
  updateChart()
}

// 删除某天记录
function deleteRecord(id) {
  if (!id) return
  if (confirm('确定要删除这条上课记录吗？')) {
    customerRecords.value = customerRecords.value.filter(r => r.id !== id)
    setStorage(`class_records_${activeCustomerId.value}`, customerRecords.value)
    updateChart()
  }
}

// 备份数据导出 (JSON 文件下载)
function exportJSON() {
  const activeCustomer = customers.value.find(c => c.id === activeCustomerId.value)
  const filename = `${activeCustomer ? activeCustomer.name : 'records'}_classes_backup.json`
  const jsonStr = JSON.stringify(customerRecords.value, null, 2)
  const blob = new Blob([jsonStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// 导入 JSON 数据
function triggerImport() {
  fileInputRef.value.click()
}
function handleImport(event) {
  const file = event.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result)
      if (!Array.isArray(data)) {
        alert('导入失败：导入的 JSON 必须是一个数组格式。')
        return
      }
      
      const isValid = data.every(r => r.date && typeof r.attended === 'boolean')
      if (!isValid) {
        alert('导入失败：数据项缺少关键属性 (如 date 或 attended)。')
        return
      }

      // 导入转换并整理
      const importedRecords = data.map((r, idx) => ({
        id: r.id || `imported_${Date.now()}_${idx}`,
        date: r.date,
        dayName: r.dayName || getDayName(r.date),
        attended: r.attended,
        teacher: r.teacher || '',
        sessions: +r.sessions || 0,
        cost: +r.cost || 0,
        topup: +r.topup || 0,
        balance: +r.balance || 0,
        note: r.note || ''
      })).sort((a, b) => a.date.localeCompare(b.date))

      customerRecords.value = importedRecords
      setStorage(`class_records_${activeCustomerId.value}`, customerRecords.value)
      
      alert(`导入成功！成功导入了 ${importedRecords.length} 条上课与收支明细。`)
      updateChart()
    } catch (err) {
      alert(`解析文件失败: ${err.message}`)
    }
  }
  reader.readAsText(file)
  event.target.value = '' // 清理选择器
}

// 图表渲染
const balanceChartRef = ref(null)
let balanceChart = null

function updateChart() {
  const data = customerRecords.value.slice(-60) // 只取最后60条记录做绘图
  if (balanceChart) {
    balanceChart.data.labels = data.map(r => r.date.slice(5))
    balanceChart.data.datasets[0].data = data.map(r => r.balance)
    balanceChart.update()
  }
}

onMounted(() => {
  loadActiveCustomerRecords()
  const data = customerRecords.value.slice(-60)
  const ctx = balanceChartRef.value.getContext('2d')
  balanceChart = new Chart(ctx, {
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
.header-action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  padding: 16px 20px;
  margin-bottom: 20px;
}
.customer-select-area, .data-action-area {
  display: flex;
  align-items: center;
  gap: 10px;
}
.bar-label {
  font-size: 14px;
  font-weight: 600;
  color: #4a5568;
}
.select-input {
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  padding: 6px 14px;
  font-size: 14px;
  color: #2d3748;
  outline: none;
  background-color: #fff;
  cursor: pointer;
}

.top-cards { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 14px; margin-bottom: 16px; }
@media (max-width: 900px) { .top-cards { grid-template-columns: 1fr 1fr; } }
@media (max-width: 480px) { .top-cards { grid-template-columns: 1fr; } }

.bal-label { font-size: 12px; color: #a0aec0; }
.bal-val { font-size: 32px; font-weight: 700; margin-top: 4px; }
.bal-tip { font-size: 12px; color: #dd6b20; margin-top: 6px; }

.stat-mini { text-align: center; }
.stat-mini-val { font-size: 24px; font-weight: 700; color: #2d3748; }
.stat-mini-label { font-size: 12px; color: #a0aec0; margin-top: 4px; }

.chart-card canvas { max-height: 220px !important; }
.section-title { font-size: 15px; font-weight: 600; margin-bottom: 14px; }

.add-form { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
@media (max-width: 900px) { .add-form { grid-template-columns: 1fr 1fr; } }
@media (max-width: 550px) { .add-form { grid-template-columns: 1fr; } }
.add-form .btn { grid-column: 1 / -1; margin-top: 10px; }

.list-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.month-select { border: 1.5px solid #e2e8f0; border-radius: 8px; padding: 6px 10px; font-size: 13px; cursor: pointer; outline: none; }

.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th, td { padding: 12px 10px; text-align: left; border-bottom: 1px solid #f0f0f0; white-space: nowrap; }
th { color: #a0aec0; font-weight: 600; }
tr.absent td { color: #a0aec0; }

.modal-mask {
  position: fixed;
  top: 0; left: 0; width: 100%; height: 100%;
  background-color: rgba(0,0,0,0.5);
  display: flex; justify-content: center; align-items: center;
  z-index: 1000;
}
.modal-box {
  width: 90%; max-width: 400px;
  background: #fff; border-radius: 16px;
  padding: 24px; box-shadow: 0 10px 25px rgba(0,0,0,0.1);
}

@media (max-width: 768px) {
  table, thead, tbody, th, td, tr { display: block; }
  thead { display: none; }
  tr { margin-bottom: 12px; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 10px 14px; background: #fff; }
  td { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px dashed #f0f0f0; min-height: 38px; text-align: right; white-space: normal; }
  td:last-child { border-bottom: none; }
  td::before { content: attr(data-label); font-weight: 600; color: #718096; margin-right: 8px; text-align: left; }
}
</style>
