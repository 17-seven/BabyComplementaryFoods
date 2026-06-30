const { getStorage, setStorage, today } = require('../../utils/storage.js');

const TARGET_MINS = 720; // 12小时

Page({
  data: {
    sleepLogs: [],
    todayTotalMins: 0,
    todayTotalStr: '0小时0分',
    targetHours: TARGET_MINS / 60,
    progress: 0,
    showForm: false,
    addDate: '',
    addStart: '',
    addEnd: '',
    addNote: ''
  },

  onShow: function () {
    if (!wx.getStorageSync('user_is_logged_in') && !wx.getStorageSync('user_openid')) {
      wx.showModal({
        title: '请先登录',
        content: '此功能需要登录才能使用。',
        confirmText: '去登录',
        cancelText: '返回',
        success: (res) => {
          if (res.confirm) {
            wx.redirectTo({ url: '/pages/login/index' });
          } else {
            wx.navigateBack({
              fail: () => wx.switchTab({ url: '/pages/dashboard/index' })
            });
          }
        }
      });
      return;
    }
    this.setData({ addDate: today() });
    this.loadSleepLogs();
  },

  loadSleepLogs: function () {
    const todayStr = today();
    const logs = getStorage('baby_sleep_records', []);
    const sorted = [...logs]
      .sort((a, b) => (b.date + (b.startTime || '')).localeCompare(a.date + (a.startTime || '')))
      .map(l => ({
        ...l,
        durStr: `${Math.floor(l.durationMinutes / 60)}h${l.durationMinutes % 60}m`
      }));
    const todayMins = logs
      .filter(l => l.date === todayStr)
      .reduce((s, r) => s + (r.durationMinutes || 0), 0);
    const h = Math.floor(todayMins / 60);
    const m = todayMins % 60;
    this.setData({
      sleepLogs: sorted,
      todayTotalMins: todayMins,
      todayTotalStr: `${h}小时${m}分`,
      progress: Math.min(Math.round((todayMins / TARGET_MINS) * 100), 100)
    });
  },

  toggleForm: function () {
    this.setData({
      showForm: !this.data.showForm,
      addStart: '',
      addEnd: '',
      addNote: ''
    });
  },

  onFormInput: function (e) {
    this.setData({ [e.currentTarget.dataset.field]: e.detail.value });
  },

  saveRecord: function () {
    const { addDate, addStart, addEnd, addNote } = this.data;
    if (!addStart || !addEnd) {
      wx.showToast({ title: '请选择开始和结束时间', icon: 'error' });
      return;
    }
    const [sh, sm] = addStart.split(':').map(Number);
    const [eh, em] = addEnd.split(':').map(Number);
    let mins = (eh * 60 + em) - (sh * 60 + sm);
    if (mins <= 0) mins += 24 * 60; // 跨夜处理
    const logs = getStorage('baby_sleep_records', []);
    logs.push({
      id: Date.now(),
      date: addDate,
      startTime: addStart,
      endTime: addEnd,
      durationMinutes: mins,
      note: addNote.trim()
    });
    setStorage('baby_sleep_records', logs);
    this.setData({ showForm: false, addStart: '', addEnd: '', addNote: '' });
    this.loadSleepLogs();
    wx.showToast({ title: `已记录 ${Math.floor(mins / 60)}h${mins % 60}m`, icon: 'success' });
  },

  deleteRecord: function (e) {
    wx.showModal({
      title: '删除记录',
      content: '确定要删除这条睡眠记录吗？',
      confirmColor: '#e53e3e',
      success: (res) => {
        if (res.confirm) {
          const logs = getStorage('baby_sleep_records', [])
            .filter(l => String(l.id) !== String(e.currentTarget.dataset.id));
          setStorage('baby_sleep_records', logs);
          this.loadSleepLogs();
        }
      }
    });
  }
});
