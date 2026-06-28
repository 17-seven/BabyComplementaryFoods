<template>
  <div>
    <div class="page-header">
      <h2>爱吃食物</h2>
      <p>记录宝宝钟爱的辅食和食材，方便每周排餐参考</p>
    </div>

    <!-- 添加 -->
    <div class="card" style="margin-bottom:16px;">
      <h3 class="section-title">添加爱吃食物</h3>
      <div class="add-row">
        <div class="form-row" style="flex:2">
          <label>食物名称</label>
          <input type="text" v-model="form.name" placeholder="如：牛肉土豆胡萝卜饼" />
        </div>
        <div class="form-row">
          <label>分类</label>
          <select v-model="form.category">
            <option>辅食</option><option>水果</option><option>主食</option><option>零食</option><option>其他</option>
          </select>
        </div>
        <div class="form-row" style="flex:2">
          <label>备注</label>
          <input type="text" v-model="form.note" placeholder="如：土豆要多一点才爱吃" />
        </div>
        <div class="form-row" style="align-self:flex-end">
          <label>&nbsp;</label>
          <button class="btn btn-primary" @click="addFood">添加</button>
        </div>
      </div>
    </div>

    <!-- 食物列表 -->
    <div class="food-grid">
      <div v-for="f in foods" :key="f.id" class="card food-card">
        <div class="food-top">
          <span class="tag" :class="catClass(f.category)">{{ f.category }}</span>
          <button class="btn btn-danger btn-sm" @click="deleteFood(f.id)">删除</button>
        </div>
        <div class="food-name">{{ f.name }}</div>
        <div v-if="f.note" class="food-note">💬 {{ f.note }}</div>
        <div class="food-date">添加于 {{ f.addedAt }}</div>
      </div>
    </div>

    <div v-if="!foods.length" class="empty card">暂无记录，添加宝宝爱吃的食物吧 ❤️</div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { seedFavoriteFoods } from '../data/favoriteFoods.js'
import { getStorage, setStorage, today } from '../utils/storage.js'

// 合并种子数据与用户数据（避免重复）
function loadFoods() {
  const userFoods = getStorage('favorite_foods', null)
  if (userFoods === null) {
    // 首次加载：写入种子数据
    setStorage('favorite_foods', seedFavoriteFoods)
    return [...seedFavoriteFoods]
  }
  return userFoods
}

const foods = ref(loadFoods())
const form = reactive({ name: '', category: '辅食', note: '' })

function addFood() {
  if (!form.name.trim()) return
  foods.value.push({ id: Date.now(), name: form.name.trim(), category: form.category, note: form.note.trim(), addedAt: today() })
  setStorage('favorite_foods', foods.value)
  form.name = ''; form.note = ''
}
function deleteFood(id) {
  foods.value = foods.value.filter(f => f.id !== id)
  setStorage('favorite_foods', foods.value)
}

const catMap = { '辅食': 'tag-orange', '水果': 'tag-green', '主食': 'tag-blue', '零食': 'tag-purple', '其他': 'tag-gray' }
function catClass(cat) { return catMap[cat] || 'tag-gray' }
</script>

<style scoped>
.section-title { font-size: 15px; font-weight: 600; margin-bottom: 14px; }
.add-row { display: flex; gap: 12px; flex-wrap: wrap; align-items: flex-start; }
.add-row .form-row { margin-bottom: 0; }

.food-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 14px; }
.food-card { padding: 16px; }
.food-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.food-name { font-size: 16px; font-weight: 600; color: #2d3748; margin-bottom: 6px; }
.food-note { font-size: 13px; color: #744210; background: #fffbf0; padding: 4px 8px; border-radius: 6px; margin-bottom: 8px; }
.food-date { font-size: 11px; color: #a0aec0; }
</style>
