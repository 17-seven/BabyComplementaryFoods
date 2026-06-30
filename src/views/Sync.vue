<template>
  <div class="sync-container">
    <div class="page-header">
      <h2>数据同步与小程序导出</h2>
      <p>在此处您可以查看、修改宝宝的历史数据，并一键生成微信小程序能够识别导入的标准 JSON 数据格式。</p>
    </div>

    <!-- 顶栏状态与说明 -->
    <div class="card header-card">
      <div class="header-card-content">
        <h3>🔄 离线数据同步助手</h3>
        <p>
          系统运行于纯前端离线 LocalStorage。当您在网站上规划了下周辅食，或者记录了就诊、大事记后，可以通过此工具
          <strong>一键同步生成 JSON</strong> 到本地的 <code>docs/db_system_generated</code> 目录中。
          然后在微信小程序中<strong>解锁开发者模式</strong>，即可完美载入并同步宝宝的最新信息！
        </p>
      </div>
    </div>

    <!-- 集合列表 -->
    <div class="collections-grid">
      <div v-for="col in collections" :key="col.key" class="card collection-card">
        <div class="col-main">
          <div class="col-icon">{{ col.icon }}</div>
          <div class="col-info">
            <div class="col-title-row">
              <h4>{{ col.name }}</h4>
              <span class="tag" :class="col.source === 'localStorage' ? 'tag-green' : 'tag-orange'">
                {{ col.source === 'localStorage' ? '用户修改' : '种子数据' }}
              </span>
            </div>
            <p class="col-desc">{{ col.desc }}</p>
            <div class="col-meta">
              <span>云集合名: <code>{{ col.key }}</code></span>
              <span>记录数: <strong class="highlight-count">{{ col.data.length }}</strong> 条</span>
            </div>
          </div>
        </div>
        <div class="col-actions">
          <button class="btn btn-secondary btn-sm" @click="downloadJson(col)">
            📥 下载 JSON
          </button>
        </div>
      </div>
    </div>

    <!-- 底栏操作区 -->
    <div class="card action-card">
      <div class="action-status" v-if="syncStatus.text">
        <span class="status-indicator" :class="syncStatus.type"></span>
        <span class="status-text">{{ syncStatus.text }}</span>
      </div>
      <div class="action-buttons">
        <button class="btn btn-primary btn-large" @click="syncToLocal" :disabled="syncStatus.loading">
          {{ syncStatus.loading ? '正在同步中...' : '⚡ 一键同步生成至 docs/db_system_generated' }}
        </button>
      </div>
    </div>

    <!-- 操作指南 -->
    <div class="card guide-card">
      <h4>💡 微信小程序导入操作指南</h4>
      <ol class="guide-list">
        <li>点击上方 <strong>一键同步生成至 docs/db_system_generated</strong> 按钮。</li>
        <li>系统将在项目目录的 <code>docs/db_system_generated/</code> 下按日期和集合名自动生成对应的 JSON 数据包。</li>
        <li>打开微信开发者工具运行小程序，进入 <strong>“我的”</strong> 页面，连续点击底部的 <strong>“版本号” 10 次</strong> 解锁隐藏的 <strong>🔓 开发者模式</strong>。</li>
        <li>在弹出的开发者控制台内，点击选择文件，从 <code>docs/db_system_generated/</code> 目录内批量选取您刚刚生成的 JSON 文件上传导入。</li>
        <li>数据将完美同步进您的微信小程序 LocalStorage 或绑定的云开发数据库！</li>
      </ol>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { getStorage, today } from '../utils/storage.js'
import { weekPlans } from '../data/mealPlan.js'
import { defaultTimelineEvents } from '../data/timeline.js'
import { 
  defaultVaccinesList, 
  defaultHealthcares, 
  defaultAssessments, 
  defaultClinicalLogs 
} from '../data/healthcare.js'

// 默认安全食材种子（用于兜底导出）
const defaultSafeFoods = [
  { "name": "高铁米粉", "category": "主食", "icon": "🥣" },
  { "name": "胚芽米", "category": "主食", "icon": "🌾" },
  { "name": "碎碎面", "category": "主食", "icon": "🍜" },
  { "name": "疙瘩汤（面粉）", "category": "主食", "icon": "🍲" },
  { "name": "蒸糕", "category": "主食", "icon": "🍰" },
  { "name": "小米", "category": "主食", "icon": "🌾" },
  { "name": "米饭", "category": "主食", "icon": "🍚" },
  { "name": "粥", "category": "主食", "icon": "🥣" },
  { "name": "馒头", "category": "主食", "icon": "🥟" },
  { "name": "燕麦米", "category": "主食", "icon": "🌾" },
  { "name": "低筋面粉", "category": "主食", "icon": "🌾" },
  { "name": "山药", "category": "蔬菜", "icon": "🍠" },
  { "name": "红薯", "category": "蔬菜", "icon": "🍠" },
  { "name": "胡萝卜", "category": "蔬菜", "icon": "🥕" },
  { "name": "土豆", "category": "蔬菜", "icon": "🥔" },
  { "name": "莲藕", "category": "蔬菜", "icon": "🧄" },
  { "name": "西葫芦", "category": "蔬菜", "icon": "🥒" },
  { "name": "玉米（脱皮）", "category": "蔬菜", "icon": "🌽" },
  { "name": "秋葵", "category": "蔬菜", "icon": "🥬" },
  { "name": "西兰花", "category": "蔬菜", "icon": "🥦" },
  { "name": "菠菜", "category": "蔬菜", "icon": "🥬" },
  { "name": "油菜", "category": "蔬菜", "icon": "🥬" },
  { "name": "小白菜", "category": "蔬菜", "icon": "🥬" },
  { "name": "奶白菜", "category": "蔬菜", "icon": "🥬" },
  { "name": "上海青", "category": "蔬菜", "icon": "🥬" },
  { "name": "生菜", "category": "蔬菜", "icon": "🥬" },
  { "name": "油麦菜", "category": "蔬菜", "icon": "🥬" },
  { "name": "菜心", "category": "蔬菜", "icon": "🥬" },
  { "name": "西红柿", "category": "蔬菜", "icon": "🍅" },
  { "name": "南瓜", "category": "蔬菜", "icon": "🎃" },
  { "name": "黄瓜", "category": "蔬菜", "icon": "🥒" },
  { "name": "甜椒", "category": "蔬菜", "icon": "🫑" },
  { "name": "茄子（去皮）", "category": "蔬菜", "icon": "🍆" },
  { "name": "香菇", "category": "蔬菜", "icon": "🍄" },
  { "name": "焦山楂", "category": "蔬菜", "icon": "🔴" },
  { "name": "苹果", "category": "水果", "icon": "🍎" },
  { "name": "牛油果", "category": "水果", "icon": "🥑" },
  { "name": "红心火龙果", "category": "水果", "icon": "🍉" },
  { "name": "香蕉", "category": "水果", "icon": "🍌" },
  { "name": "白心火龙果", "category": "水果", "icon": "🍉" },
  { "name": "红枣", "category": "水果", "icon": "枣" },
  { "name": "李子", "category": "水果", "icon": "🍑" },
  { "name": "小蟠桃", "category": "水果", "icon": "🍑" },
  { "name": "猪肉", "category": "动物蛋白", "icon": "🥩" },
  { "name": "牛肉", "category": "动物蛋白", "icon": "🍖" },
  { "name": "鹅肝", "category": "动物蛋白", "icon": "🥩" },
  { "name": "猪肝", "category": "动物蛋白", "icon": "🥩" },
  { "name": "鸡肉", "category": "动物蛋白", "icon": "🍗" },
  { "name": "蛋黄", "category": "动物蛋白", "icon": "🥚" },
  { "name": "蛋清", "category": "动物蛋白", "icon": "🥚" },
  { "name": "鳕鱼", "category": "动物蛋白", "icon": "🐟" },
  { "name": "比目鱼", "category": "动物蛋白", "icon": "🐟" },
  { "name": "黑虎虾", "category": "动物蛋白", "icon": "🦐" },
  { "name": "北极甜虾", "category": "动物蛋白", "icon": "🦐" },
  { "name": "豆腐", "category": "豆类及坚果", "icon": "🥛" },
  { "name": "红豆", "category": "豆类及坚果", "icon": "🫘" },
  { "name": "核桃油", "category": "油脂与调味", "icon": "🍾" },
  { "name": "核桃油（热炒）", "category": "油脂与调味", "icon": "🍾" },
  { "name": "猪油", "category": "油脂与调味", "icon": "🧈" },
  { "name": "酵母", "category": "油脂与调味", "icon": "🧂" },
  { "name": "牛油果油", "category": "油脂与调味", "icon": "🍾" },
  { "name": "黑芝麻", "category": "籽类", "icon": "⚫" }
]

// 默认待排敏食材种子
const defaultRiskFoods = [
  { "name": "芋头", "category": "蔬菜", "icon": "🍠" },
  { "name": "芦笋", "category": "蔬菜", "icon": "🥬" },
  { "name": "白萝卜", "category": "蔬菜", "icon": "🥬" },
  { "name": "紫薯", "category": "蔬菜", "icon": "🍠" },
  { "name": "芹菜", "category": "蔬菜", "icon": "🥬" },
  { "name": "紫甘蓝", "category": "蔬菜", "icon": "🥬" },
  { "name": "卷心菜", "category": "蔬菜", "icon": "🥬" },
  { "name": "菜花", "category": "蔬菜", "icon": "🥦" },
  { "name": "羽衣甘蓝", "category": "蔬菜", "icon": "🥬" },
  { "name": "大白菜", "category": "蔬菜", "icon": "🥬" },
  { "name": "紫菜", "category": "蔬菜", "icon": "⬛" },
  { "name": "香菜", "category": "蔬菜", "icon": "🌿" },
  { "name": "小葱", "category": "蔬菜", "icon": "🌿" },
  { "name": "冬瓜", "category": "蔬菜", "icon": "🍈" },
  { "name": "丝瓜", "category": "蔬菜", "icon": "🥒" },
  { "name": "苦瓜", "category": "蔬菜", "icon": "🥒" },
  { "name": "荷兰豆", "category": "蔬菜", "icon": "🫛" },
  { "name": "芸豆", "category": "蔬菜", "icon": "🫘" },
  { "name": "豇豆", "category": "蔬菜", "icon": "🫛" },
  { "name": "毛豆", "category": "蔬菜", "icon": "🫛" },
  { "name": "金针菇", "category": "蔬菜", "icon": "🍄" },
  { "name": "平菇", "category": "蔬菜", "icon": "🍄" },
  { "name": "杏鲍菇", "category": "蔬菜", "icon": "🍄" },
  { "name": "口蘑", "category": "蔬菜", "icon": "🍄" },
  { "name": "大蒜", "category": "蔬菜", "icon": "🧄" },
  { "name": "洋葱", "category": "蔬菜", "icon": "🧅" },
  { "name": "木耳", "category": "蔬菜", "icon": "⬛" },
  { "name": "梨", "category": "水果", "icon": "🍐" },
  { "name": "蓝莓", "category": "水果", "icon": "🫐" },
  { "name": "桃（去皮）", "category": "水果", "icon": "🍑" },
  { "name": "杏", "category": "水果", "icon": "🍑" },
  { "name": "草莓（去缔，压碎）", "category": "水果", "icon": "🍓" },
  { "name": "芒果", "category": "水果", "icon": "🥭" },
  { "name": "猕猴桃", "category": "水果", "icon": "🥝" },
  { "name": "柑橘", "category": "水果", "icon": "🍊" },
  { "name": "木瓜", "category": "水果", "icon": "🍈" },
  { "name": "葡萄", "category": "水果", "icon": "🍇" },
  { "name": "樱桃", "category": "水果", "icon": "🍒" },
  { "name": "橙子", "category": "水果", "icon": "🍊" },
  { "name": "柚子", "category": "水果", "icon": "🍊" },
  { "name": "西梅", "category": "水果", "icon": "🍒" },
  { "name": "菠萝（盐水浸泡煮软）", "category": "水果", "icon": "🍍" },
  { "name": "圣女果", "category": "水果", "icon": "🍅" },
  { "name": "柠檬", "category": "水果", "icon": "🍋" },
  { "name": "杨桃", "category": "水果", "icon": "⭐" },
  { "name": "哈密瓜", "category": "水果", "icon": "🍈" },
  { "name": "西瓜", "category": "水果", "icon": "🍉" },
  { "name": "树莓", "category": "水果", "icon": "🍓" },
  { "name": "香瓜", "category": "水果", "icon": "🍈" },
  { "name": "鸡肝", "category": "动物蛋白", "icon": "🥩" },
  { "name": "鸭胸肉", "category": "动物蛋白", "icon": "🥩" },
  { "name": "羊肉", "category": "动物蛋白", "icon": "🍖" },
  { "name": "鹌鹑蛋", "category": "动物蛋白", "icon": "🥚" },
  { "name": "三文鱼", "category": "动物蛋白", "icon": "🐟" },
  { "name": "龙利鱼", "category": "动物蛋白", "icon": "🐟" },
  { "name": "鲈鱼", "category": "动物蛋白", "icon": "🐟" },
  { "name": "带鱼", "category": "动物蛋白", "icon": "🐟" },
  { "name": "黄花鱼", "category": "动物蛋白", "icon": "🐟" },
  { "name": "基围虾", "category": "动物蛋白", "icon": "🦐" },
  { "name": "螃蟹", "category": "动物蛋白", "icon": "🦀" },
  { "name": "扇贝（去壳，去筋煮烂）", "category": "动物蛋白", "icon": "🐚" },
  { "name": "豆浆", "category": "豆类及坚果", "icon": "🥛" },
  { "name": "嫩豆干", "category": "豆类及坚果", "icon": "🟨" },
  { "name": "嫩豆腐", "category": "豆类及坚果", "icon": "🥛" },
  { "name": "腰果粉", "category": "豆类及坚果", "icon": "🥜" },
  { "name": "奶酪", "category": "豆类及坚果", "icon": "🧀" },
  { "name": "豌豆", "category": "豆类及坚果", "icon": "🫛" },
  { "name": "四季豆", "category": "豆类及坚果", "icon": "🫛" },
  { "name": "花生", "category": "豆类及坚果", "icon": "🥜" },
  { "name": "鹰嘴豆", "category": "豆类及坚果", "icon": "🧆" },
  { "name": "黑豆", "category": "豆类及坚果", "icon": "🫘" },
  { "name": "红芸豆", "category": "豆类及坚果", "icon": "🫘" },
  { "name": "无糖酸奶", "category": "奶制品", "icon": "🥣" },
  { "name": "核桃粉（无颗粒）", "category": "奶制品", "icon": "🥜" },
  { "name": "杏仁粉（无颗粒）", "category": "奶制品", "icon": "🥜" },
  { "name": "开心果粉", "category": "奶制品", "icon": "🥜" },
  { "name": "藜麦", "category": "籽类", "icon": "🌾" },
  { "name": "亚麻籽", "category": "籽类", "icon": "🟤" },
  { "name": "白芝麻", "category": "籽类", "icon": "⚪" }
]

const syncStatus = ref({ loading: false, text: '', type: '' })

// 处理辅食周计划转换，把 items 数组转换为小程序需要的 name 字符串
const formattedMealPlans = computed(() => {
  const hasLocal = localStorage.getItem('baby_week_plans') !== null
  const source = getStorage('baby_week_plans', weekPlans)
  const converted = source.map(w => ({
    week: w.week,
    period: w.period,
    note: w.note || '',
    days: w.days.map(d => ({
      date: d.date,
      dayName: d.dayName,
      eggTarget: d.eggTarget,
      meals: d.meals.map(m => ({
        type: m.type,
        name: m.items ? m.items.join('、') : ''
      }))
    }))
  }))
  return { data: converted, source: hasLocal ? 'localStorage' : 'seed' }
})

// 获取大事记
const formattedTimeline = computed(() => {
  const hasLocal = localStorage.getItem('baby_timeline_events') !== null
  const source = getStorage('baby_timeline_events', defaultTimelineEvents)
  return { data: source, source: hasLocal ? 'localStorage' : 'seed' }
})

// 获取疫苗
const formattedVaccines = computed(() => {
  const hasLocal = localStorage.getItem('baby_vaccines_list') !== null
  const source = getStorage('baby_vaccines_list', defaultVaccinesList)
  return { data: source, source: hasLocal ? 'localStorage' : 'seed' }
})

// 获取儿保
const formattedHealthcares = computed(() => {
  const hasLocal = localStorage.getItem('baby_healthcares') !== null
  const source = getStorage('baby_healthcares', defaultHealthcares)
  return { data: source, source: hasLocal ? 'localStorage' : 'seed' }
})

// 获取发育评估
const formattedAssessments = computed(() => {
  const hasLocal = localStorage.getItem('baby_assessments') !== null
  const source = getStorage('baby_assessments', defaultAssessments)
  return { data: source, source: hasLocal ? 'localStorage' : 'seed' }
})

// 获取临床就诊
const formattedClinicalLogs = computed(() => {
  const hasLocal = localStorage.getItem('baby_clinical_logs') !== null
  const source = getStorage('baby_clinical_logs', defaultClinicalLogs)
  return { data: source, source: hasLocal ? 'localStorage' : 'seed' }
})

// 获取已排敏食材
const formattedSafeFoods = computed(() => {
  const hasLocal = localStorage.getItem('baby_safe_foods') !== null
  const source = getStorage('baby_safe_foods', defaultSafeFoods)
  return { data: source, source: hasLocal ? 'localStorage' : 'seed' }
})

// 获取待排敏食材
const formattedRiskFoods = computed(() => {
  const hasLocal = localStorage.getItem('baby_risk_foods') !== null
  const source = getStorage('baby_risk_foods', defaultRiskFoods)
  return { data: source, source: hasLocal ? 'localStorage' : 'seed' }
})

// 组合集合元数据
const collections = computed(() => [
  {
    key: 'meal_plans',
    name: '周辅食计划',
    icon: '🍽️',
    desc: '包含每周的膳食表与每日鸡蛋配额，自动按顿进行排餐规则校验。',
    data: formattedMealPlans.value.data,
    source: formattedMealPlans.value.source
  },
  {
    key: 'timeline_events',
    name: '成长大事记',
    icon: '⏳',
    desc: '大事记时间轴记录，包含大运动发育、疾病用药、康复评估历史。',
    data: formattedTimeline.value.data,
    source: formattedTimeline.value.source
  },
  {
    key: 'vaccines',
    name: '疫苗接种',
    icon: '💉',
    desc: '接种疫苗卡表，用于小程序滚动计算和级联打卡补种。',
    data: formattedVaccines.value.data,
    source: formattedVaccines.value.source
  },
  {
    key: 'healthcares',
    name: '季度儿保',
    icon: '🩺',
    desc: '记录历次季度儿保体检中的身长、体重、头围以及医生反馈。',
    data: formattedHealthcares.value.data,
    source: formattedHealthcares.value.source
  },
  {
    key: 'assessments',
    name: '发育评估',
    icon: '📋',
    desc: '归档巴方 Timp、AIMS 以及格里菲斯测评报告与诊断商数。',
    data: formattedAssessments.value.data,
    source: formattedAssessments.value.source
  },
  {
    key: 'clinical_logs',
    name: '临床就诊',
    icon: '📅',
    desc: '多项就诊历史档案，包含门诊科室、复诊时间与用药结论。',
    data: formattedClinicalLogs.value.data,
    source: formattedClinicalLogs.value.source
  },
  {
    key: 'safe_foods',
    name: '已排敏食材',
    icon: '✅',
    desc: '已经完成排敏校验，确定宝宝吃完不会产生红疹或过敏的安全食物池。',
    data: formattedSafeFoods.value.data,
    source: formattedSafeFoods.value.source
  },
  {
    key: 'risk_foods',
    name: '待排敏食材',
    icon: '⚠️',
    desc: '尚未排敏的食物列表，如果放入辅食单中会自动触发警报提示。',
    data: formattedRiskFoods.value.data,
    source: formattedRiskFoods.value.source
  }
])

// 浏览器端下载单独的 JSON
function downloadJson(col) {
  const jsonStr = JSON.stringify(col.data, null, 2)
  const blob = new Blob([jsonStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = `${col.key}.json`
  link.click()
  
  URL.revokeObjectURL(url)
}

// 请求本地 Vite 自定义接口，保存文件到指定文件夹
async function syncToLocal() {
  syncStatus.value.loading = true
  syncStatus.value.text = '正在写入本地 docs/db_system_generated 目录...'
  syncStatus.value.type = 'info'

  const dateStr = today() // YYYY-MM-DD
  let successCount = 0
  let errorMsg = ''

  try {
    for (const col of collections.value) {
      const response = await fetch('/api/save-json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: col.key,
          date: dateStr,
          data: col.data
        })
      })

      const resData = await response.json()
      if (response.ok && resData.success) {
        successCount++
      } else {
        throw new Error(resData.error || '写入失败')
      }
    }

    syncStatus.value.loading = false
    syncStatus.value.text = `⚡ 成功！已生成 ${successCount} 个 JSON 文件存放在 docs/db_system_generated 文件夹中！`
    syncStatus.value.type = 'success'
  } catch (error) {
    syncStatus.value.loading = false
    syncStatus.value.text = `❌ 同步失败: ${error.message || '网络请求出错'}`
    syncStatus.value.type = 'danger'
  }
}
</script>

<style scoped>
.sync-container {
  max-width: 1000px;
  margin: 0 auto;
}

.header-card {
  background: linear-gradient(135deg, #eaf2e6 0%, #f4faf2 100%);
  border-left: 5px solid #6CA847;
  padding: 20px;
  margin-bottom: 20px;
}
.header-card-content h3 {
  color: #3d6a24;
  font-size: 16px;
  margin-bottom: 6px;
}
.header-card-content p {
  color: #4a5568;
  line-height: 1.6;
}

.collections-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}
@media (max-width: 768px) {
  .collections-grid {
    grid-template-columns: 1fr;
  }
}

.collection-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 16px;
  background: #fff;
  transition: transform 0.2s, box-shadow 0.2s;
  border: 1px solid #edf2f7;
}
.collection-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0,0,0,0.06);
}

.col-main {
  display: flex;
  gap: 12px;
}
.col-icon {
  font-size: 32px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 50px;
  height: 50px;
  background: #f7fafc;
  border-radius: 12px;
}
.col-info {
  flex: 1;
}
.col-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.col-title-row h4 {
  font-size: 15px;
  font-weight: 700;
  color: #2d3748;
}
.col-desc {
  font-size: 12px;
  color: #718096;
  margin-bottom: 8px;
  line-height: 1.5;
  height: 36px;
  overflow: hidden;
}
.col-meta {
  font-size: 11px;
  color: #a0aec0;
  display: flex;
  justify-content: space-between;
  border-top: 1px dashed #edf2f7;
  padding-top: 6px;
}
.col-meta code {
  color: #4a5568;
  background: #f7fafc;
  padding: 1px 4px;
  border-radius: 4px;
}
.highlight-count {
  color: #5A8D3D;
  font-weight: 700;
}

.col-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 14px;
  border-top: 1px solid #f7fafc;
  padding-top: 10px;
}

.action-card {
  padding: 24px;
  text-align: center;
  background: #fff;
  border: 1px solid #edf2f7;
  margin-bottom: 20px;
}
.action-buttons {
  display: flex;
  justify-content: center;
  gap: 12px;
}
.btn-large {
  padding: 12px 28px;
  font-size: 15px;
  font-weight: 600;
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(255, 112, 67, 0.2);
}
.btn-large:hover {
  transform: translateY(-1px);
}
.action-status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  padding: 8px 16px;
  border-radius: 20px;
  background: #f7fafc;
  font-size: 13px;
  font-weight: 500;
}
.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.status-indicator.info { background: #3182ce; animation: pulse 1.5s infinite; }
.status-indicator.success { background: #38a169; }
.status-indicator.danger { background: #e53e3e; }
.status-text {
  color: #4a5568;
}

.guide-card {
  padding: 20px;
  background: #fff;
  border: 1px solid #edf2f7;
  border-left: 4px solid #4a5568;
}
.guide-card h4 {
  font-size: 14px;
  font-weight: 700;
  color: #2d3748;
  margin-bottom: 12px;
}
.guide-list {
  padding-left: 20px;
  font-size: 13px;
  color: #4a5568;
  line-height: 1.8;
}
.guide-list li {
  margin-bottom: 8px;
}

@keyframes pulse {
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(49, 130, 206, 0.7); }
  70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(49, 130, 206, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(49, 130, 206, 0); }
}
</style>
