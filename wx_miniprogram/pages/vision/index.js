// pages/vision/index.js
const { getStorage, setStorage, today } = require('../../utils/storage.js');

// 默认计时模块（保持向后兼容）
const DEFAULT_TIMERS = [
  { id: 'eyepatch', name: '眼罩遮盖', desc: '矫正斜视遮盖治疗', targetMins: 240, icon: '👁️' }
];

const ICON_OPTIONS = ['👁️', '😴', '🏃', '📺', '📖', '🧩', '🎵', '💊', '🧘', '🌙', '⏱️', '🎯'];

Page({
  data: {
    timerItems: [],
    expandedId: null,
    manualInputs: {},
    showAddModal: false,
    newName: '', newDesc: '', newIcon: '⏱️', newTargetHours: '4',
    newType: 'timer',
    iconOptions: ICON_OPTIONS
  },

  _liveTimer: null,

  onShow: function () {
    this.loadAllTimers();
    this._startLive();
  },

  onHide: function () { this._stopLive(); },
  onUnload: function () { this._stopLive(); },

  // 实时计时区间
  _startLive: function () {
    this._stopLive();
    this._liveTimer = setInterval(() => {
      const items = this.data.timerItems;
      let hasWearing = false;
      const updated = items.map(t => {
        if (!t.isWearing || !t.startTime) return t;
        hasWearing = true;
        const sessionSecs = Math.floor((Date.now() - t.startTime) / 1000);
        const totalSecs   = (t.todayMins || 0) * 60 + sessionSecs;
        const h = Math.floor(totalSecs / 3600);
        const m = Math.floor((totalSecs % 3600) / 60);
        const s = totalSecs % 60;
        const liveStr = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
        const progress = Math.min(Math.round((totalSecs / ((t.targetMins || 1) * 60)) * 100), 100);
        return { ...t, liveStr, progress };
      });
      if (hasWearing) this.setData({ timerItems: updated });
    }, 1000);
  },
  _stopLive: function () {
    if (this._liveTimer) { clearInterval(this._liveTimer); this._liveTimer = null; }
  },

  loadAllTimers: function () {
    const defs     = getStorage('vision_timer_items', DEFAULT_TIMERS);
    const todayStr = today();
    const timerItems = defs.filter(t => t.id !== 'eyepatch').map(t => {
      const recordsKey  = t.id === 'eyepatch' ? 'eyepatch_records' : `vision_records_${t.id}`;
      const wearingData = getStorage(`vision_wearing_${t.id}`, { isWearing: false, startTime: null });
      const logs        = getStorage(recordsKey, []);
      const todayMins   = logs.filter(l => l.date === todayStr).reduce((s, r) => s + (r.durationMinutes || 0), 0);
      const totalSecs   = wearingData.isWearing && wearingData.startTime
        ? todayMins * 60 + Math.floor((Date.now() - wearingData.startTime) / 1000)
        : todayMins * 60;
      const h = Math.floor(totalSecs / 3600);
      const m = Math.floor((totalSecs % 3600) / 60);
      const s = totalSecs % 60;
      return {
        ...t,
        isWearing:  wearingData.isWearing,
        startTime:  wearingData.startTime,
        todayMins,                        // 已完成的分钟数（供 live 计算基底用）
        logs:       [...logs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 50),
        todayHours:  parseFloat((totalSecs / 3600).toFixed(1)),
        targetHours: Math.round(t.targetMins / 60),
        progress:    Math.min(Math.round((totalSecs / ((t.targetMins || 1) * 60)) * 100), 100),
        liveStr:     `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
      };
    });
    this.setData({ timerItems });
  },

  toggleTimer: function (e) {
    const id   = e.currentTarget.dataset.id;
    const item = this.data.timerItems.find(t => t.id === id);
    if (!item) return;
    const wearingKey = `vision_wearing_${id}`;
    const recordsKey = id === 'eyepatch' ? 'eyepatch_records' : `vision_records_${id}`;
    if (!item.isWearing) {
      setStorage(wearingKey, { isWearing: true, startTime: Date.now() });
      this.loadAllTimers();
      wx.showToast({ title: `${item.name} 开始计时 ▶`, icon: 'success' });
    } else {
      const minutes = Math.max(Math.round((Date.now() - (item.startTime || Date.now())) / 60000), 1);
      const logs = getStorage(recordsKey, []);
      logs.push({ id: Date.now(), date: today(), durationMinutes: minutes, remark: '计时自动保存' });
      setStorage(recordsKey, logs);
      setStorage(wearingKey, { isWearing: false, startTime: null });
      this.loadAllTimers();
      wx.showModal({ title: '⏹ 计时结束', content: `${item.name} 本次 ${minutes} 分钟，已记入今日总量。`, showCancel: false });
    }
  },

  onManualInput: function (e) {
    const inputs = { ...this.data.manualInputs };
    inputs[e.currentTarget.dataset.id] = e.detail.value;
    this.setData({ manualInputs: inputs });
  },

  addManual: function (e) {
    const id   = e.currentTarget.dataset.id;
    const mins = parseInt(this.data.manualInputs[id]);
    if (!mins || mins <= 0) { wx.showToast({ title: '请输入正确分钟数', icon: 'error' }); return; }
    const recordsKey = id === 'eyepatch' ? 'eyepatch_records' : `vision_records_${id}`;
    const logs = getStorage(recordsKey, []);
    logs.push({ id: Date.now(), date: today(), durationMinutes: mins, remark: '手动补录' });
    setStorage(recordsKey, logs);
    const inputs = { ...this.data.manualInputs };
    inputs[id] = '';
    this.setData({ manualInputs: inputs }, () => { this.loadAllTimers(); wx.showToast({ title: '补录成功', icon: 'success' }); });
  },

  toggleHistory: function (e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ expandedId: this.data.expandedId === id ? null : id });
  },

  deleteLog: function (e) {
    const { id, logid } = e.currentTarget.dataset;
    const recordsKey = id === 'eyepatch' ? 'eyepatch_records' : `vision_records_${id}`;
    wx.showModal({ title: '删除记录', content: '确定要删除这条计时记录吗？',
      success: (res) => {
        if (res.confirm) {
          const logs = getStorage(recordsKey, []).filter(l => String(l.id) !== String(logid));
          setStorage(recordsKey, logs); this.loadAllTimers();
        }
      }
    });
  },

  selectIcon: function (e) { this.setData({ newIcon: e.currentTarget.dataset.icon }); },
  setNewType: function (e) { this.setData({ newType: e.currentTarget.dataset.type }); },
  openAddModal: function () {
    if (!wx.getStorageSync('user_is_logged_in') && !wx.getStorageSync('user_openid')) {
      wx.showModal({
        title: '请先登录', content: '新增模块需要登录后才能保存，以便数据云端同步。',
        confirmText: '去登录',
        success: (res) => { if (res.confirm) wx.navigateTo({ url: '/pages/login/index' }); }
      });
      return;
    }
    this.setData({ showAddModal: true, newName: '', newDesc: '', newIcon: '⏱️', newTargetHours: '4', newType: 'timer' });
  },
  closeAddModal: function () { this.setData({ showAddModal: false }); },
  onNewInput: function (e) { this.setData({ [e.currentTarget.dataset.field]: e.detail.value }); },

  saveNewTimer: function () {
    const name = this.data.newName.trim();
    if (!name) { wx.showToast({ title: '请输入模块名称', icon: 'error' }); return; }
    const newItem = {
      id: 'timer_' + Date.now(), name,
      desc: this.data.newDesc.trim(),
      targetMins: Math.round((parseFloat(this.data.newTargetHours) || 1) * 60),
      icon: this.data.newIcon || '⏱️',
      type: this.data.newType || 'timer'
    };
    const defs = getStorage('vision_timer_items', DEFAULT_TIMERS);
    defs.push(newItem);
    setStorage('vision_timer_items', defs);
    const familyId = wx.getStorageSync('user_family_id');
    if (familyId && wx.cloud) {
      wx.cloud.callFunction({ name: 'updateFamily', data: { action: 'update', familyId, data: { timer_items: defs } } });
    }
    this.setData({ showAddModal: false }, () => { this.loadAllTimers(); wx.showToast({ title: '模块已添加', icon: 'success' }); });
  },

  // ===== 时间段记录（range 类型专用） =====
  onRangeInput: function (e) {
    const { id, field } = e.currentTarget.dataset;
    const idx = this.data.timerItems.findIndex(t => t.id === id);
    if (idx < 0) return;
    this.setData({ [`timerItems[${idx}]._draft.${field}`]: e.detail.value });
  },

  addRangeRecord: function (e) {
    const id   = e.currentTarget.dataset.id;
    const item = this.data.timerItems.find(t => t.id === id);
    if (!item || !item._draft) return;
    const { date, startTime, endTime } = item._draft;
    if (!startTime || !endTime) { wx.showToast({ title: '请选择开始和结束时间', icon: 'error' }); return; }
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const mins = (eh * 60 + em) - (sh * 60 + sm);
    if (mins <= 0) { wx.showToast({ title: '结束时间须晚于开始时间', icon: 'error' }); return; }
    const recordsKey = `vision_records_${id}`;
    const logs = getStorage(recordsKey, []);
    logs.push({ id: Date.now(), date: date || today(), startTime, endTime, durationMinutes: mins, remark: `${startTime}~${endTime}` });
    setStorage(recordsKey, logs);
    this.loadAllTimers();
    wx.showToast({ title: `已记录 ${mins} 分钟`, icon: 'success' });
  },

  deleteTimer: function (e) {
    const id = e.currentTarget.dataset.id;
    if (id === 'eyepatch') { wx.showToast({ title: '默认模块不可删除', icon: 'none' }); return; }
    wx.showModal({ title: '删除模块', content: '确定要删除此模块及所有历史记录吗？', confirmColor: '#e53e3e',
      success: (res) => {
        if (res.confirm) {
          const defs = getStorage('vision_timer_items', DEFAULT_TIMERS).filter(t => t.id !== id);
          setStorage('vision_timer_items', defs); this.loadAllTimers();
        }
      }
    });
  }
});
