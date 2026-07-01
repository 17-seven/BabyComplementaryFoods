// pages/timeline/index.js
const { getStorage, setStorage, today } = require('../../utils/storage.js');
const { defaultTimelineEvents } = require('../../data/timeline.js');

// 默认分类（去掉"评估/康复"，加"未分类"）
const DEFAULT_CATEGORIES = ['大运动/发育', '辅食/便秘', '疾病用药', '日常医疗', '未分类'];

Page({
  data: {
    events: [],
    filteredEvents: [],

    // 分类管理
    categoryList: [],        // 用户分类列表（不含"全部"）
    categories: [],          // 过滤标签 = ['全部', ...categoryList]
    addCategories: [],       // 新增弹窗用
    activeCategory: '全部',
    searchKeyword: '',

    // 新增事件弹窗
    showModal: false,
    evtDate: '',
    evtCategory: '大运动/发育',
    evtCategoryIndex: 0,
    evtTitle: '',
    evtContent: '',

    // 分类管理弹窗
    showCatModal: false,
    newCatName: ''
  },

  onShow: function () {
    this.setData({ evtDate: today(), animKey: ((this.data.animKey || 0) + 1) % 2 });
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 });
    }
    this.loadCategories();

    // 静默云刷新
    const { syncPull } = require('../../utils/storage.js');
    syncPull('timeline_events', () => {
      this.loadCategories();
    });
  },

  onPullDownRefresh: function () {
    const { syncPull } = require('../../utils/storage.js');
    syncPull('timeline_events', () => {
      this.loadCategories();
      wx.stopPullDownRefresh();
    });
  },

  // 加载分类列表，再加载事件
  loadCategories: function () {
    const catList = getStorage('timeline_categories', DEFAULT_CATEGORIES);
    this.setData({
      categoryList: catList,
      categories: ['全部', ...catList],
      addCategories: catList
    }, () => {
      this.loadEvents();
    });
  },

  loadEvents: function () {
    const list = getStorage('baby_timeline_events', defaultTimelineEvents);
    const sorted = [...list].sort((a, b) => b.date.localeCompare(a.date));
    this.setData({ events: sorted }, () => {
      this.filterEvents();
    });
  },

  selectCategory: function (e) {
    const cat = e.currentTarget.dataset.cat;
    this.setData({ activeCategory: cat }, () => { this.filterEvents(); });
  },

  onSearchInput: function (e) {
    const keyword = e.detail.value.trim().toLowerCase();
    this.setData({ searchKeyword: keyword }, () => { this.filterEvents(); });
  },

  filterEvents: function () {
    let result = this.data.events;
    const cat = this.data.activeCategory;
    const keyword = this.data.searchKeyword;
    if (cat !== '全部') result = result.filter(item => item.category === cat);
    if (keyword) result = result.filter(item =>
      (item.title && item.title.toLowerCase().includes(keyword)) ||
      (item.content && item.content.toLowerCase().includes(keyword))
    );
    this.setData({ filteredEvents: result });
  },

  // ===== 新增事件弹窗 =====
  openAddModal: function () {
    if (!wx.getStorageSync('user_is_logged_in') && !wx.getStorageSync('user_openid')) {
      wx.showModal({
        title: '请先登录', content: '添加大事记需要先登录，以便数据云端同步保存。',
        confirmText: '去登录',
        success: (res) => { if (res.confirm) wx.navigateTo({ url: '/pages/login/index' }); }
      });
      return;
    }
    const firstCat = this.data.addCategories[0] || '未分类';
    const catIdx = this.data.addCategories.indexOf(firstCat);
    this.setData({ 
      showModal: true, 
      evtDate: today(), 
      evtTitle: '', 
      evtContent: '', 
      evtCategory: firstCat,
      evtCategoryIndex: catIdx >= 0 ? catIdx : 0
    });
  },
  closeAddModal: function () { this.setData({ showModal: false }); },

  onCategoryChange: function (e) {
    const idx = parseInt(e.detail.value);
    this.setData({ 
      evtCategory: this.data.addCategories[idx],
      evtCategoryIndex: idx
    });
  },
  onEvtInput: function (e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [field]: e.detail.value });
  },

  saveEvent: function () {
    const t = this.data.evtTitle.trim();
    if (!t) { wx.showToast({ title: '标题不能为空', icon: 'error' }); return; }
    const list = [...this.data.events];
    list.push({ id: Date.now(), date: this.data.evtDate, category: this.data.evtCategory, title: t, content: this.data.evtContent.trim() });
    this.setData({ events: list, showModal: false }, () => {
      setStorage('baby_timeline_events', list);
      this.loadEvents();
      wx.showToast({ title: '记录成功', icon: 'success' });
    });
  },

  deleteEvent: function (e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({ title: '删除事件', content: '确认要删除此条大事记吗？',
      success: (res) => {
        if (res.confirm) {
          const list = this.data.events.filter(item => item.id !== id);
          this.setData({ events: list }, () => {
            setStorage('baby_timeline_events', list);
            this.loadEvents();
          });
        }
      }
    });
  },

  // ===== 分类管理弹窗 =====
  openCatModal: function () { this.setData({ showCatModal: true, newCatName: '' }); },
  closeCatModal: function () { this.setData({ showCatModal: false }); },
  onNewCatInput: function (e) { this.setData({ newCatName: e.detail.value }); },

  addCategory: function () {
    const name = this.data.newCatName.trim();
    if (!name) { wx.showToast({ title: '请输入分类名称', icon: 'error' }); return; }
    const catList = [...this.data.categoryList];
    if (catList.includes(name)) { wx.showToast({ title: '分类已存在', icon: 'none' }); return; }
    catList.push(name);
    wx.setStorageSync('timeline_categories', catList);  // 直接写本地，不触发syncData
    this._syncCategoriesToCloud(catList);               // 单独同步到families文档
    this.setData({ newCatName: '', categoryList: catList, categories: ['全部', ...catList], addCategories: catList });
    wx.showToast({ title: '分类已添加', icon: 'success' });
  },

  deleteCategory: function (e) {
    const name = e.currentTarget.dataset.name;
    if (name === '未分类') { wx.showToast({ title: '"未分类"不可删除', icon: 'none' }); return; }
    wx.showModal({
      title: '删除分类',
      content: `确定删除"${name}"？该分类下的事件将移入"未分类"。`,
      confirmColor: '#e53e3e',
      success: (res) => {
        if (res.confirm) {
          // 把该分类下的事件移入"未分类"（直接写本地，跳过全量云同步避免报错）
          const events = getStorage('baby_timeline_events', []).map(ev =>
            ev.category === name ? { ...ev, category: '未分类' } : ev
          );
          wx.setStorageSync('baby_timeline_events', events);  // 直接写，不触发syncData

          const catList = this.data.categoryList.filter(c => c !== name);
          if (!catList.includes('未分类')) catList.push('未分类');
          wx.setStorageSync('timeline_categories', catList);
          this._syncCategoriesToCloud(catList);               // 同步分类配置到families文档

          const newActive = this.data.activeCategory === name ? '全部' : this.data.activeCategory;
          this.setData({
            categoryList: catList, categories: ['全部', ...catList], addCategories: catList,
            activeCategory: newActive, events
          }, () => { this.filterEvents(); });
          wx.showToast({ title: '已删除，事件已移入未分类', icon: 'success' });
        }
      }
    });
  },

  // 将分类配置同步到 families 文档（无需新建集合）
  _syncCategoriesToCloud: function (catList) {
    const familyId = wx.getStorageSync('user_family_id');
    if (!familyId || !wx.cloud) return;
    wx.cloud.callFunction({
      name: 'updateFamily',
      data: { action: 'update', familyId, data: { timeline_categories: catList } },
      fail: (err) => { console.warn('timeline_categories 同步失败:', err); }
    });
  }
});
