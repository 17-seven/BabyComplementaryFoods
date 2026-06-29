<template>
  <div>
    <div class="page-header flex-header">
      <div>
        <h2>宝宝大事记</h2>
        <p>记录宝宝成长发育中的重要时刻、疾病康复及发育评估时间线</p>
      </div>
      <button class="btn btn-primary" @click="showAddDialog = true">➕ 记录新事件</button>
    </div>

    <!-- 检索与过滤条 -->
    <div class="card filter-card">
      <div class="search-bar">
        <input type="text" v-model="searchText" placeholder="输入关键词搜索，如：翻身、便秘、评估、雾化..." />
      </div>
      <div class="category-tags">
        <button 
          class="tag-btn" 
          :class="{ active: selectedCategory === '' }" 
          @click="selectedCategory = ''"
        >
          全部
        </button>
        <button 
          v-for="cat in categories" 
          :key="cat" 
          class="tag-btn" 
          :class="{ active: selectedCategory === cat }"
          @click="selectedCategory = cat"
        >
          {{ cat }}
        </button>
      </div>
    </div>

    <!-- 时间线轴 -->
    <div class="timeline-wrap">
      <div v-if="filteredEvents.length" class="timeline">
        <div v-for="event in filteredEvents" :key="event.id" class="timeline-item">
          <div class="timeline-dot-wrap">
            <div class="timeline-dot" :class="getCategoryClass(event.category)"></div>
          </div>
          <div class="timeline-content card">
            <div class="event-meta">
              <span class="event-date">{{ event.date }}</span>
              <span class="tag" :class="getCategoryTagClass(event.category)">{{ event.category }}</span>
            </div>
            <h4 class="event-title">{{ event.title }}</h4>
            <p class="event-desc">{{ event.content }}</p>
            <button class="btn-delete" @click="deleteEvent(event.id)">删除</button>
          </div>
        </div>
      </div>
      <div v-else class="empty card">未找到匹配的重要记录 ⏳</div>
    </div>

    <!-- 新增大事记弹窗 -->
    <div v-if="showAddDialog" class="modal-mask" @click.self="showAddDialog = false">
      <div class="modal-box card">
        <h3>记录成长大事件</h3>
        <div class="form-row" style="margin-top: 14px;">
          <label>日期</label>
          <input type="date" v-model="form.date" />
        </div>
        <div class="form-row">
          <label>事件类别</label>
          <select v-model="form.category">
            <option v-for="cat in categories" :key="cat">{{ cat }}</option>
          </select>
        </div>
        <div class="form-row">
          <label>事件标题</label>
          <input type="text" v-model="form.title" placeholder="如：第一次翻身、开始吃辅食" />
        </div>
        <div class="form-row">
          <label>详情描述</label>
          <textarea v-model="form.content" rows="3" placeholder="输入事件详细经过、医生嘱托、用药情况或排便状态等..." />
        </div>
        <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px;">
          <button class="btn btn-secondary" @click="showAddDialog = false">取消</button>
          <button class="btn btn-primary" @click="saveEvent">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue'
import { getStorage, setStorage, today } from '../utils/storage.js'
import { defaultTimelineEvents } from '../data/timeline.js'

// 大事记分类
const categories = ['大运动/发育', '辅食/便秘', '评估/康复', '疾病用药', '日常医疗']

const events = ref(getStorage('baby_timeline_events', defaultTimelineEvents))

// 过滤参数
const searchText = ref('')
const selectedCategory = ref('')

const filteredEvents = computed(() => {
  let list = [...events.value]
  if (selectedCategory.value) {
    list = list.filter(e => e.category === selectedCategory.value)
  }
  if (searchText.value.trim()) {
    const text = searchText.value.trim().toLowerCase()
    list = list.filter(e => e.title.toLowerCase().includes(text) || e.content.toLowerCase().includes(text) || e.date.includes(text))
  }
  // 按日期由近到远排序
  return list.sort((a, b) => b.date.localeCompare(a.date))
})

// 添加表单
const showAddDialog = ref(false)
const form = reactive({
  date: today(),
  category: '大运动/发育',
  title: '',
  content: ''
})

function saveEvent() {
  if (!form.title.trim() || !form.content.trim()) {
    alert('请填写完整的标题和描述！')
    return
  }
  events.value.push({
    id: Date.now(),
    date: form.date,
    category: form.category,
    title: form.title.trim(),
    content: form.content.trim()
  })
  setStorage('baby_timeline_events', events.value)
  
  form.title = ''
  form.content = ''
  showAddDialog.value = false
}

function deleteEvent(id) {
  if (confirm('确定要删除这条重要大事记吗？')) {
    events.value = events.value.filter(e => e.id !== id)
    setStorage('baby_timeline_events', events.value)
  }
}

function getCategoryClass(cat) {
  const map = {
    '大运动/发育': 'cat-motor',
    '辅食/便秘': 'cat-food',
    '评估/康复': 'cat-rehab',
    '疾病用药': 'cat-sick',
    '日常医疗': 'cat-medical'
  }
  return map[cat] || ''
}

function getCategoryTagClass(cat) {
  const map = {
    '大运动/发育': 'tag-green',
    '辅食/便秘': 'tag-orange',
    '评估/康复': 'tag-purple',
    '疾病用药': 'tag-red',
    '日常医疗': 'tag-blue'
  }
  return map[cat] || 'tag-gray'
}
</script>

<style scoped>
.flex-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  gap: 12px;
}
@media (max-width: 600px) {
  .flex-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .flex-header .btn {
    width: 100%;
  }
}

.filter-card {
  padding: 16px;
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.search-bar input {
  width: 100%;
  padding: 10px 14px;
  border: 1.5px solid #e2e8f0;
  border-radius: 8px;
  outline: none;
  font-size: 14px;
  transition: .2s;
}
.search-bar input:focus {
  border-color: #ff7043;
}
.category-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.tag-btn {
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #718096;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 13px;
  cursor: pointer;
  transition: .2s;
}
.tag-btn:hover, .tag-btn.active {
  border-color: #ff7043;
  color: #ff7043;
  background: #fff5f2;
}

/* 时间线结构 */
.timeline-wrap {
  position: relative;
  padding: 10px 0;
}
.timeline {
  position: relative;
}
/* 中间竖线 */
.timeline::before {
  content: '';
  position: absolute;
  left: 20px;
  top: 0;
  bottom: 0;
  width: 3px;
  background: #e2e8f0;
}

.timeline-item {
  position: relative;
  padding-left: 50px;
  margin-bottom: 20px;
}

.timeline-dot-wrap {
  position: absolute;
  left: 11px;
  top: 14px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}
.timeline-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #cbd5e0;
  border: 2px solid #fff;
  box-shadow: 0 0 0 3px #e2e8f0;
}
.timeline-dot.cat-motor { background: #38a169; box-shadow: 0 0 0 3px #c6f6d5; }
.timeline-dot.cat-food { background: #dd6b20; box-shadow: 0 0 0 3px #feebc8; }
.timeline-dot.cat-rehab { background: #805ad5; box-shadow: 0 0 0 3px #e9d8fd; }
.timeline-dot.cat-sick { background: #e53e3e; box-shadow: 0 0 0 3px #fed7d7; }
.timeline-dot.cat-medical { background: #3182ce; box-shadow: 0 0 0 3px #bee3f8; }

.timeline-content {
  padding: 18px;
  position: relative;
}
.event-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.event-date {
  font-size: 13px;
  font-weight: 700;
  color: #718096;
}
.event-title {
  font-size: 15px;
  font-weight: 700;
  color: #2d3748;
  margin-bottom: 6px;
}
.event-desc {
  font-size: 13px;
  color: #4a5568;
  line-height: 1.6;
  white-space: pre-wrap;
}
.btn-delete {
  position: absolute;
  right: 18px;
  top: 18px;
  border: none;
  background: transparent;
  color: #a0aec0;
  font-size: 12px;
  cursor: pointer;
}
.btn-delete:hover {
  color: #e53e3e;
}

.modal-mask {
  position: fixed; inset: 0; background: rgba(0,0,0,.4);
  display: flex; align-items: center; justify-content: center; z-index: 100;
}
.modal-box { width: 480px; max-width: 90vw; }
</style>
