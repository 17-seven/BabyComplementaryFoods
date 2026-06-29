<template>
  <div>
    <div class="page-header">
      <h2>医疗儿保</h2>
      <p>管理宝宝的疫苗接种、三个月一次的儿保体检以及发育评估和临床就诊记录</p>
    </div>

    <!-- 顶部Tab导航栏 -->
    <div class="tab-navbar card">
      <button 
        class="tab-nav-btn" 
        :class="{ active: activeTab === 'vaccine' }" 
        @click="activeTab = 'vaccine'"
      >
        💉 疫苗接种规划
      </button>
      <button 
        class="tab-nav-btn" 
        :class="{ active: activeTab === 'healthcare' }" 
        @click="activeTab = 'healthcare'"
      >
        🩺 季度儿保记录
      </button>
      <button 
        class="tab-nav-btn" 
        :class="{ active: activeTab === 'assessment' }" 
        @click="activeTab = 'assessment'"
      >
        🧠 发育评估记录
      </button>
      <button 
        class="tab-nav-btn" 
        :class="{ active: activeTab === 'clinical' }" 
        @click="activeTab = 'clinical'"
      >
        🏥 临床检查记录
      </button>
    </div>

    <!-- Tab 1: 疫苗规划 -->
    <div v-show="activeTab === 'vaccine'">
      <!-- 接种提醒看板 -->
      <div class="card reminder-card">
        <div class="reminder-content" v-if="nextVaccine">
          <span class="bell-icon">🔔</span>
          <div>
            <h4>接种规划提醒（每半个月补一针）</h4>
            <p>
              下一针补种：<strong>{{ nextVaccine.name }} ({{ nextVaccine.dose }})</strong>，预计接种：<strong>{{ nextVaccine.plannedDate }}</strong> 
              （还有 <strong class="highlight">{{ nextVaccine.daysLeft }}</strong> 天）
            </p>
          </div>
        </div>
        <div class="reminder-content" v-else>
          <span class="bell-icon">🎉</span>
          <div>
            <h4>所有需要补种的疫苗均已完成接种！</h4>
          </div>
        </div>
      </div>

      <!-- 补种排班基准日期 -->
      <div class="card setting-card" style="margin-top: 16px;">
        <h3 class="section-title">⚙️ 补种规划设定</h3>
        <div class="form-row" style="max-width: 300px;">
          <label>下一针起跑日期（默认今天或最近建议日）</label>
          <input type="date" v-model="catchUpStartDate" @change="saveCatchupSettings" />
        </div>
        <p class="tip-text">系统会自动筛选下方处于「需补种」或「推荐接种」状态的疫苗，并以该起跑日期为基准，每隔15天规划一针。</p>
      </div>

      <!-- 补种接种规划预测表 -->
      <div class="card" style="margin-top: 16px;" v-if="catchUpSchedule.length">
        <h3 class="section-title">📅 待补种疫苗 15 天规划表</h3>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>疫苗名称</th>
                <th>剂次</th>
                <th>状态</th>
                <th>规划补种时间</th>
                <th>剩余天数</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(v, idx) in catchUpSchedule" :key="idx" class="upcoming-item">
                <td data-label="疫苗名称"><strong>{{ v.name }}</strong></td>
                <td data-label="剂次">{{ v.dose }}</td>
                <td data-label="状态">
                  <span class="tag tag-orange">{{ v.status }}</span>
                </td>
                <td data-label="规划补种时间">{{ v.plannedDate }}</td>
                <td data-label="剩余天数" :style="{ color: v.daysLeft <= 3 ? '#e53e3e' : 'inherit', fontWeight: 'bold' }">
                  {{ v.daysLeft === 0 ? '今天/已到期' : v.daysLeft + ' 天后' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 全部疫苗卡片列表 -->
      <div class="card" style="margin-top: 16px;">
        <h3 class="section-title">📋 宝宝入学查证疫苗列表</h3>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>疫苗分类</th>
                <th>剂次</th>
                <th>查验结果</th>
                <th>接种日期</th>
                <th>状态更新</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(v, index) in vaccineList" :key="index" :class="{ completed: v.status === '已接种' }">
                <td data-label="疫苗分类"><strong>{{ v.name }}</strong></td>
                <td data-label="剂次">{{ v.dose }}</td>
                <td data-label="查验结果">
                  <span class="tag" :class="getStatusClass(v.status)">
                    {{ v.status === '已接种' ? '✓ ' + v.status : v.status }}
                  </span>
                </td>
                <td data-label="接种日期">{{ v.actualDate || '-' }}</td>
                <td data-label="状态更新">
                  <select v-model="v.status" @change="handleStatusChange(v, index)" class="status-select">
                    <option>已接种</option>
                    <option>需补种</option>
                    <option>推荐接种</option>
                    <option>未到时间</option>
                  </select>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Tab 2: 季度儿保 -->
    <div v-show="activeTab === 'healthcare'">
      <!-- 最新儿保基础信息 -->
      <div class="two-col">
        <div class="card latest-info-card">
          <h3 class="section-title">👶 最新基础发育指标</h3>
          <div v-if="latestHealthcare" class="metrics-grid">
            <div class="metric-box">
              <span class="metric-val">{{ latestHealthcare.height }} <small>cm</small></span>
              <span class="metric-label">身高</span>
            </div>
            <div class="metric-box">
              <span class="metric-val">{{ latestHealthcare.weight }} <small>kg</small></span>
              <span class="metric-label">体重</span>
            </div>
            <div class="metric-box">
              <span class="metric-val">{{ latestHealthcare.headCircumference }} <small>cm</small></span>
              <span class="metric-label">头围</span>
            </div>
            <div class="metric-box full-width">
              <span class="metric-label">最近测量时间：{{ latestHealthcare.date }}</span>
            </div>
          </div>
          <div v-else class="empty">暂无基础指标，请添加儿保记录</div>
        </div>

        <div class="card reminder-card flex-center">
          <div class="checkup-countdown" v-if="nextCheckupDays !== null">
            <h4>📋 儿保规划提醒（三个月一次）</h4>
            <div class="days-circle">
              <span class="days-num">{{ nextCheckupDays }}</span>
              <span class="days-unit">天后</span>
            </div>
            <p class="tip-text" style="margin-top: 8px;">建议下次儿保：{{ nextCheckupDate }}</p>
          </div>
          <div class="checkup-countdown" v-else>
            <h4>📋 儿保规划提醒</h4>
            <p class="tip-text">录入一次儿保后，系统将自动规划下一次儿保倒计时。</p>
          </div>
        </div>
      </div>

      <!-- 添加儿保记录 -->
      <div class="card" style="margin-top: 16px;">
        <h3 class="section-title">➕ 录入儿保数据</h3>
        <div class="checkup-form">
          <div class="form-row">
            <label>儿保日期</label>
            <input type="date" v-model="hcForm.date" />
          </div>
          <div class="form-row">
            <label>身高 (cm)</label>
            <input type="number" step="0.1" v-model="hcForm.height" placeholder="如：74.5" />
          </div>
          <div class="form-row">
            <label>体重 (kg)</label>
            <input type="number" step="0.01" v-model="hcForm.weight" placeholder="如：9.50" />
          </div>
          <div class="form-row">
            <label>头围 (cm)</label>
            <input type="number" step="0.1" v-model="hcForm.headCircumference" placeholder="如：45.0" />
          </div>
          <div class="form-row" style="grid-column: 1 / -1">
            <label>医生诊断与建议</label>
            <input type="text" v-model="hcForm.feedback" placeholder="如：骨骼发育良好，建议多晒太阳" />
          </div>
          <button class="btn btn-primary" style="grid-column: 1 / -1; margin-top: 8px;" @click="addHealthcare">
            保存记录
          </button>
        </div>
      </div>

      <!-- 儿保历史记录 -->
      <div class="card" style="margin-top: 16px;">
        <h3 class="section-title">📋 历史儿保记录</h3>
        <div v-if="healthcares.length" class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>日期</th>
                <th>身高(cm)</th>
                <th>体重(kg)</th>
                <th>头围(cm)</th>
                <th>医生意见</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="h in sortedHealthcares" :key="h.id">
                <td data-label="日期">{{ h.date }}</td>
                <td data-label="身高(cm)">{{ h.height }}</td>
                <td data-label="体重(kg)">{{ h.weight }}</td>
                <td data-label="头围(cm)">{{ h.headCircumference }}</td>
                <td data-label="医生意见">{{ h.feedback || '-' }}</td>
                <td data-label="操作">
                  <button class="btn btn-danger btn-sm" @click="deleteHealthcare(h.id)">删除</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="empty">暂无历史体检记录</div>
      </div>
    </div>

    <!-- Tab 3: 发育评估 -->
    <div v-show="activeTab === 'assessment'">
      <!-- 录入评估结果 -->
      <div class="card">
        <h3 class="section-title">➕ 录入发育评估结果</h3>
        <div class="assessment-form">
          <div class="form-row">
            <label>评估日期</label>
            <input type="date" v-model="asmForm.date" />
          </div>
          <div class="form-row">
            <label>评估名称</label>
            <input type="text" v-model="asmForm.name" placeholder="如：巴方评估" />
          </div>
          <div class="form-row">
            <label>评估人员/医生</label>
            <input type="text" v-model="asmForm.doctor" placeholder="如：毛健" />
          </div>
          <div class="form-row" style="grid-column: 1 / -1">
            <label>评估结论与发现</label>
            <textarea v-model="asmForm.result" rows="2" placeholder="输入孩子具体发育结论，如：大腿后侧发紧，需要家庭干预康复" />
          </div>
          <div class="form-row" style="grid-column: 1 / -1">
            <label>家庭干预及康复指导计划</label>
            <textarea v-model="asmForm.intervention" rows="2" placeholder="输入下一步干预计划，如：去春雨康复做康复训练，揉肚子等" />
          </div>
          <button class="btn btn-primary" style="grid-column: 1 / -1; margin-top: 8px;" @click="addAssessment">
            保存记录
          </button>
        </div>
      </div>

      <!-- 发育评估记录列表 -->
      <div class="card" style="margin-top: 16px;">
        <h3 class="section-title">📋 发育评估历史</h3>
        <div v-if="assessments.length" class="asm-list">
          <div v-for="a in sortedAssessments" :key="a.id" class="asm-card">
            <div class="asm-header">
              <span class="asm-date">{{ a.date }}</span>
              <span class="asm-doctor">评估人：{{ a.doctor }}</span>
            </div>
            <h4 class="asm-title">🧠 {{ a.name }}</h4>
            <div class="asm-section">
              <strong>评估结论：</strong>
              <p>{{ a.result }}</p>
            </div>
            <div class="asm-section" v-if="a.intervention">
              <strong>干预措施：</strong>
              <p>{{ a.intervention }}</p>
            </div>
            <button class="btn-delete" @click="deleteAssessment(a.id)">删除</button>
          </div>
        </div>
        <div v-else class="empty">暂无发育评估记录</div>
      </div>
    </div>

    <!-- Tab 4: 临床检查记录 -->
    <div v-show="activeTab === 'clinical'">
      <!-- 检查日程看板 -->
      <div class="card reminder-card bg-orange" style="margin-bottom: 16px;" v-if="nextAppointment">
        <div class="reminder-content">
          <span class="bell-icon">📅</span>
          <div>
            <h4 style="color:#7b341e">即将到来的就诊检查</h4>
            <p style="color:#9c4221">
              就诊时间：<strong>{{ nextAppointment.date }}</strong> | 项目：<strong>{{ nextAppointment.name }}</strong> 
              （还有 <strong style="color:#e53e3e">{{ nextAppointment.daysLeft }}</strong> 天）
            </p>
          </div>
        </div>
      </div>

      <!-- 添加临床记录 -->
      <div class="card">
        <h3 class="section-title">➕ 录入就诊与临床检查</h3>
        <div class="checkup-form">
          <div class="form-row">
            <label>检查名称</label>
            <input type="text" v-model="cliForm.name" placeholder="如：眼底复查、核磁共振" />
          </div>
          <div class="form-row">
            <label>检查日期</label>
            <input type="date" v-model="cliForm.date" />
          </div>
          <div class="form-row">
            <label>状态</label>
            <select v-model="cliForm.status">
              <option>已完成</option>
              <option>未完成</option>
            </select>
          </div>
          <div class="form-row">
            <label>地点/医生/前言</label>
            <input type="text" v-model="cliForm.desc1" placeholder="如：崔丽红、4诊室" />
          </div>
          <div class="form-row" style="grid-column: 1 / -1">
            <label>检查提示与准备（说明）</label>
            <input type="text" v-model="cliForm.desc2" placeholder="如：提前开好镇静药、剃头..." />
          </div>
          <div class="form-row" style="grid-column: 1 / -1">
            <label>诊断结论/报告细节</label>
            <textarea v-model="cliForm.result" rows="3" placeholder="录入具体的检查细节或脑电图、超声结论..." />
          </div>
          <button class="btn btn-primary" style="grid-column: 1 / -1; margin-top: 8px;" @click="addClinicalLog">
            保存检查记录
          </button>
        </div>
      </div>

      <!-- 临床列表与过滤 -->
      <div class="card" style="margin-top: 16px;">
        <div class="flex-header-row">
          <h3 class="section-title">🏥 临床检查与就诊台账</h3>
          <div class="filter-controls">
            <button 
              class="filter-btn" 
              :class="{ active: cliFilter === 'all' }" 
              @click="cliFilter = 'all'"
            >
              全部
            </button>
            <button 
              class="filter-btn" 
              :class="{ active: cliFilter === 'uncompleted' }" 
              @click="cliFilter = 'uncompleted'"
            >
              未完成 ({{ uncompletedCount }})
            </button>
            <button 
              class="filter-btn" 
              :class="{ active: cliFilter === 'completed' }" 
              @click="cliFilter = 'completed'"
            >
              已完成
            </button>
          </div>
        </div>
        
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>检查名称</th>
                <th>就诊时间</th>
                <th>就诊情况/医生</th>
                <th>检查报告结果</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr 
                v-for="l in filteredClinicalLogs" 
                :key="l.id" 
                :class="{ completed: l.status === '已完成', 'status-danger': l.status === '未完成' }"
              >
                <td data-label="检查名称">
                  <strong>{{ l.name }}</strong>
                  <div class="sub-text-small" v-if="l.desc2">{{ l.desc2 }}</div>
                </td>
                <td data-label="就诊时间">{{ l.date || '待定' }}</td>
                <td data-label="就诊情况/医生">{{ l.desc1 || '-' }}</td>
                <td data-label="检查报告结果" class="report-result-cell">
                  <div class="report-result-text">{{ l.result || '暂无报告' }}</div>
                </td>
                <td data-label="状态">
                  <span class="tag" :class="l.status === '已完成' ? 'tag-green' : 'tag-orange'">
                    {{ l.status }}
                  </span>
                </td>
                <td data-label="操作">
                  <div style="display:flex; gap:6px; justify-content: flex-end;">
                    <button 
                      class="btn btn-sm" 
                      :class="l.status === '已完成' ? 'btn-secondary' : 'btn-success'"
                      @click="toggleClinicalStatus(l)"
                    >
                      {{ l.status === '已完成' ? '撤销' : '完成' }}
                    </button>
                    <button class="btn btn-danger btn-sm" @click="deleteClinicalLog(l.id)">删除</button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { getStorage, setStorage, today } from '../utils/storage.js'
import { 
  defaultVaccinesList, 
  defaultHealthcares, 
  defaultAssessments, 
  defaultClinicalLogs 
} from '../data/healthcare.js'

// 当前活动的 Tab 板块
const activeTab = ref('vaccine')

// ==================== 1. 疫苗记录逻辑 ====================
const vaccineList = ref(getStorage('baby_vaccines_list', defaultVaccinesList))
const catchUpStartDate = ref(getStorage('catchup_start_date', '2026-07-06'))

const catchUpSchedule = computed(() => {
  const due = vaccineList.value.filter(v => v.status === '需补种' || v.status === '推荐接种')
  const base = new Date(catchUpStartDate.value)
  
  return due.map((v, i) => {
    const plannedDate = new Date(base)
    plannedDate.setDate(plannedDate.getDate() + i * 15)
    const plannedStr = plannedDate.toISOString().slice(0, 10)
    const curr = new Date(today())
    const diffTime = plannedDate.getTime() - curr.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    return {
      name: v.name,
      dose: v.dose,
      status: v.status,
      plannedDate: plannedStr,
      daysLeft: diffDays > 0 ? diffDays : 0
    }
  })
})

const nextVaccine = computed(() => {
  if (!catchUpSchedule.value.length) return null
  return catchUpSchedule.value[0]
})

function saveCatchupSettings() {
  setStorage('catchup_start_date', catchUpStartDate.value)
}

function handleStatusChange(v, index) {
  if (v.status === '已接种') {
    const d = prompt('请输入实际接种日期：', today())
    if (d) {
      v.actualDate = d
      const nextDate = new Date(d)
      nextDate.setDate(nextDate.getDate() + 15)
      catchUpStartDate.value = nextDate.toISOString().slice(0, 10)
    } else {
      v.status = '需补种'
      v.actualDate = null
    }
  } else {
    v.actualDate = null
  }
  setStorage('baby_vaccines_list', vaccineList.value)
  setStorage('catchup_start_date', catchUpStartDate.value)
}

function getStatusClass(status) {
  const map = { '已接种': 'tag-green', '需补种': 'tag-red', '推荐接种': 'tag-orange', '未到时间': 'tag-gray' }
  return map[status] || 'tag-gray'
}

// ==================== 2. 季度儿保逻辑 ====================
const healthcares = ref(getStorage('baby_healthcares', defaultHealthcares))
const hcForm = reactive({ date: today(), height: '', weight: '', headCircumference: '', feedback: '' })

const sortedHealthcares = computed(() => [...healthcares.value].sort((a, b) => b.date.localeCompare(a.date)))
const latestHealthcare = computed(() => healthcares.value.length ? sortedHealthcares.value[0] : null)

const nextCheckupDate = computed(() => {
  if (!latestHealthcare.value) return null
  const d = new Date(latestHealthcare.value.date)
  d.setMonth(d.getMonth() + 3)
  return d.toISOString().slice(0, 10)
})

const nextCheckupDays = computed(() => {
  if (!nextCheckupDate.value) return null
  const nextD = new Date(nextCheckupDate.value)
  const curr = new Date(today())
  const diffTime = nextD.getTime() - curr.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays > 0 ? diffDays : 0
})

function addHealthcare() {
  if (!hcForm.date || !hcForm.height || !hcForm.weight || !hcForm.headCircumference) {
    alert('请填写完整的儿保数据！')
    return
  }
  healthcares.value.push({
    id: Date.now(),
    date: hcForm.date,
    height: parseFloat(hcForm.height),
    weight: parseFloat(hcForm.weight),
    headCircumference: parseFloat(hcForm.headCircumference),
    feedback: hcForm.feedback.trim()
  })
  setStorage('baby_healthcares', healthcares.value)
  hcForm.height = ''
  hcForm.weight = ''
  hcForm.headCircumference = ''
  hcForm.feedback = ''
}

function deleteHealthcare(id) {
  if (confirm('确定要删除这条儿保记录吗？')) {
    healthcares.value = healthcares.value.filter(h => h.id !== id)
    setStorage('baby_healthcares', healthcares.value)
  }
}

// ==================== 3. 发育评估逻辑 ====================
const assessments = ref(getStorage('baby_assessments', defaultAssessments))
const asmForm = reactive({ date: today(), name: '巴方评估', doctor: '毛健', result: '', intervention: '' })

const sortedAssessments = computed(() => [...assessments.value].sort((a, b) => b.date.localeCompare(a.date)))

function addAssessment() {
  if (!asmForm.date || !asmForm.name || !asmForm.doctor || !asmForm.result) {
    alert('请填写完整的评估记录！')
    return
  }
  assessments.value.push({
    id: Date.now(),
    date: asmForm.date,
    name: asmForm.name.trim(),
    doctor: asmForm.doctor.trim(),
    result: asmForm.result.trim(),
    intervention: asmForm.intervention.trim()
  })
  setStorage('baby_assessments', assessments.value)
  asmForm.result = ''
  asmForm.intervention = ''
}

function deleteAssessment(id) {
  if (confirm('确认删除此发育评估吗？')) {
    assessments.value = assessments.value.filter(a => a.id !== id)
    setStorage('baby_assessments', assessments.value)
  }
}

// ==================== 4. 临床检查就诊逻辑 ====================

const clinicalLogs = ref(getStorage('baby_clinical_logs', defaultClinicalLogs))
const cliForm = reactive({ name: '', date: today(), status: '已完成', desc1: '', desc2: '', result: '' })
const cliFilter = ref('all')

const uncompletedCount = computed(() => clinicalLogs.value.filter(l => l.status === '未完成').length)

const filteredClinicalLogs = computed(() => {
  let list = [...clinicalLogs.value]
  if (cliFilter.value === 'completed') {
    list = list.filter(l => l.status === '已完成')
  } else if (cliFilter.value === 'uncompleted') {
    list = list.filter(l => l.status === '未完成')
  }
  // 按就诊时间倒序，无日期排最后
  return list.sort((a, b) => {
    if (!a.date) return 1
    if (!b.date) return -1
    return b.date.localeCompare(a.date)
  })
})

const nextAppointment = computed(() => {
  const upcoming = clinicalLogs.value
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

function addClinicalLog() {
  if (!cliForm.name || !cliForm.date) {
    alert('请填写检查项目名称与日期！')
    return
  }
  clinicalLogs.value.push({
    id: Date.now(),
    name: cliForm.name.trim(),
    date: cliForm.date,
    status: cliForm.status,
    desc1: cliForm.desc1.trim(),
    desc2: cliForm.desc2.trim(),
    result: cliForm.result.trim()
  })
  setStorage('baby_clinical_logs', clinicalLogs.value)
  cliForm.name = ''
  cliForm.desc1 = ''
  cliForm.desc2 = ''
  cliForm.result = ''
}

function toggleClinicalStatus(l) {
  l.status = l.status === '已完成' ? '未完成' : '已完成'
  setStorage('baby_clinical_logs', clinicalLogs.value)
}

function deleteClinicalLog(id) {
  if (confirm('确认删除此就诊检查记录吗？')) {
    clinicalLogs.value = clinicalLogs.value.filter(l => l.id !== id)
    setStorage('baby_clinical_logs', clinicalLogs.value)
  }
}
</script>

<style scoped>
.tab-navbar {
  display: flex;
  padding: 8px;
  gap: 8px;
  margin-bottom: 16px;
}
.tab-nav-btn {
  flex: 1;
  padding: 10px;
  border: none;
  background: transparent;
  color: #718096;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border-radius: 8px;
  transition: .15s;
}
.tab-nav-btn:hover {
  background: #f7f9fc;
}
.tab-nav-btn.active {
  background: #ff7043;
  color: #fff;
}
@media (max-width: 600px) {
  .tab-navbar {
    flex-direction: column;
  }
}

.reminder-card {
  background: linear-gradient(135deg, #e6f6ff 0%, #d8f0ff 100%);
  border: 1px solid #cce8ff;
  padding: 16px 20px;
}
.reminder-card.bg-orange {
  background: linear-gradient(135deg, #fffbf0 0%, #fff7e6 100%);
  border: 1px solid #ffe8cc;
}
.reminder-content {
  display: flex;
  align-items: center;
  gap: 16px;
}
.reminder-content h4 {
  font-size: 14px;
  font-weight: 700;
  color: #1a4f76;
}
.reminder-content p {
  font-size: 13px;
  color: #2b6cb0;
  margin-top: 4px;
}
.bell-icon {
  font-size: 28px;
}
.highlight {
  font-size: 16px;
  color: #e53e3e;
}

.setting-card {
  padding: 16px;
}
.tip-text {
  font-size: 12px;
  color: #a0aec0;
  margin-top: 6px;
}

.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}
@media (max-width: 768px) {
  .two-col {
    grid-template-columns: 1fr;
  }
}

.flex-center {
  display: flex;
  justify-content: center;
  align-items: center;
}
.checkup-countdown {
  text-align: center;
}
.checkup-countdown h4 {
  font-size: 14px;
  font-weight: 600;
  color: #4a5568;
  margin-bottom: 10px;
}
.days-circle {
  width: 90px;
  height: 90px;
  border-radius: 50%;
  border: 5px solid #ff7043;
  background: #fff5f2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
}
.days-num {
  font-size: 24px;
  font-weight: 800;
  color: #ff7043;
}
.days-unit {
  font-size: 10px;
  color: #a0aec0;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-top: 10px;
}
.metric-box {
  background: #f7f9fc;
  border-radius: 10px;
  padding: 12px;
  text-align: center;
}
.metric-box.full-width {
  grid-column: 1 / -1;
  font-size: 12px;
  color: #a0aec0;
}
.metric-val {
  font-size: 20px;
  font-weight: 700;
  color: #ff7043;
}
.metric-val small {
  font-size: 12px;
  font-weight: 400;
}
.metric-label {
  font-size: 11px;
  color: #a0aec0;
  display: block;
  margin-top: 4px;
}

.checkup-form, .assessment-form {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
@media (max-width: 768px) {
  .checkup-form, .assessment-form {
    grid-template-columns: 1fr 1fr;
  }
}
@media (max-width: 480px) {
  .checkup-form, .assessment-form {
    grid-template-columns: 1fr;
  }
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
tr.completed td {
  background: #fafbfc;
  color: #a0aec0;
}
tr.upcoming-item td {
  background: #fffdf5;
}
tr.status-danger td[data-label="状态"] .tag {
  background: #fed7d7;
  color: #c53030;
}
.status-select {
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  font-size: 12px;
  outline: none;
}
.sub-text-small {
  font-size: 11px;
  color: #a0aec0;
  margin-top: 2px;
  font-weight: normal;
}
.report-result-cell {
  max-width: 320px;
}
.report-result-text {
  font-size: 12px;
  color: #4a5568;
  white-space: pre-wrap;
  line-height: 1.5;
}

/* 临床过滤控制 */
.flex-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
  flex-wrap: wrap;
  gap: 12px;
}
.filter-controls {
  display: flex;
  gap: 6px;
}
.filter-btn {
  background: #f7f9fc;
  border: 1px solid #e2e8f0;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  color: #718096;
}
.filter-btn.active {
  background: #ff7043;
  color: #fff;
  border-color: #ff7043;
}

/* 发育评估样式 */
.asm-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.asm-card {
  position: relative;
  background: #fdfdfd;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,.02);
}
.asm-header {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #a0aec0;
  margin-bottom: 6px;
}
.asm-date {
  font-weight: 700;
}
.asm-title {
  font-size: 15px;
  font-weight: 700;
  color: #2d3748;
  margin-bottom: 10px;
}
.asm-section {
  font-size: 13px;
  margin-bottom: 6px;
}
.asm-section strong {
  color: #4a5568;
}
.asm-section p {
  color: #718096;
  margin-top: 2px;
}
.btn-delete {
  position: absolute;
  right: 16px;
  top: 16px;
  border: none;
  background: transparent;
  color: #a0aec0;
  font-size: 12px;
  cursor: pointer;
}
.btn-delete:hover {
  color: #e53e3e;
}

/* 自适应卡片模式 */
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
  .report-result-cell {
    max-width: 100%;
  }
}
</style>
