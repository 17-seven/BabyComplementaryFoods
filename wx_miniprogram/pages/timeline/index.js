// pages/timeline/index.js
const { getStorage, setStorage, today } = require('../../utils/storage.js');
const { defaultTimelineEvents } = require('../../data/timeline.js');

Page({
  data: {
    events: [],
    filteredEvents: [],
    
    // 过滤与搜索条件
    categories: ['全部', '大运动/发育', '辅食/便秘', '评估/康复', '疾病用药', '日常医疗'],
    activeCategory: '全部',
    searchKeyword: '',

    // 录入新事件弹窗及字段
    showModal: false,
    evtDate: '',
    evtCategory: '大运动/发育',
    evtTitle: '',
    evtContent: ''
  },

  onShow: function () {
    this.setData({
      evtDate: today()
    });
    this.loadEvents();
  },

  loadEvents: function () {
    const list = getStorage('baby_timeline_events', defaultTimelineEvents);
    // 按日期倒序排列
    const sorted = [...list].sort((a, b) => b.date.localeCompare(a.date));
    this.setData({
      events: sorted
    }, () => {
      this.filterEvents();
    });
  },

  // 类别点击
  selectCategory: function (e) {
    const cat = e.currentTarget.dataset.cat;
    this.setData({ activeCategory: cat }, () => {
      this.filterEvents();
    });
  },

  // 搜索关键字输入
  onSearchInput: function (e) {
    const keyword = e.detail.value.trim().toLowerCase();
    this.setData({ searchKeyword: keyword }, () => {
      this.filterEvents();
    });
  },

  // 组合过滤与搜索规则
  filterEvents: function () {
    let result = this.data.events;
    const cat = this.data.activeCategory;
    const keyword = this.data.searchKeyword;

    // 1. 分类筛选
    if (cat !== '全部') {
      result = result.filter(item => item.category === cat);
    }

    // 2. 关键字筛选
    if (keyword) {
      result = result.filter(item => 
        (item.title && item.title.toLowerCase().includes(keyword)) ||
        (item.content && item.content.toLowerCase().includes(keyword))
      );
    }

    this.setData({
      filteredEvents: result
    });
  },

  // 触发弹窗显示
  openAddModal: function () {
    this.setData({
      showModal: true,
      evtDate: today(),
      evtTitle: '',
      evtContent: ''
    });
  },

  closeAddModal: function () {
    this.setData({ showModal: false });
  },

  // 输入绑定
  onEvtInput: function (e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [field]: e.detail.value });
  },

  // 添加大事件保存
  saveEvent: function () {
    const d = this.data.evtDate;
    const cat = this.data.evtCategory;
    const t = this.data.evtTitle.trim();
    const c = this.data.evtContent.trim();

    if (!t) {
      wx.showToast({ title: '标题不能为空', icon: 'error' });
      return;
    }

    const list = [...this.data.events];
    list.push({
      id: Date.now(),
      date: d,
      category: cat,
      title: t,
      content: c
    });

    this.setData({
      events: list,
      showModal: false
    }, () => {
      setStorage('baby_timeline_events', list);
      this.loadEvents();
      wx.showToast({ title: '记录成功', icon: 'success' });
    });
  },

  // 删除某条大事记
  deleteEvent: function (e) {
    const id = e.currentTarget.dataset.id;
    const that = this;
    wx.showModal({
      title: '删除事件',
      content: '确认要删除此条大事记吗？',
      success: (res) => {
        if (res.confirm) {
          const list = that.data.events.filter(item => item.id !== id);
          that.setData({ events: list }, () => {
            setStorage('baby_timeline_events', list);
            that.loadEvents();
          });
        }
      }
    });
  }
});
