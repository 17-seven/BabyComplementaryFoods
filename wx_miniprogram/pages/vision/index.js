// pages/vision/index.js
const { getStorage, setStorage, today } = require('../../utils/storage.js');

Page({
  data: {
    isWearing: false,
    startTime: null,
    todayDurationMins: 0,
    progressPercent: 0,
    historyLogs: [],

    // 手动录入表单
    manualMins: ''
  },

  onShow: function () {
    this.loadVisionData();
  },

  loadVisionData: function () {
    const todayStr = today();
    
    // 载入是否戴镜状态
    const status = getStorage('eyepatch_is_wearing', false);
    const start = getStorage('eyepatch_start_time', null);
    
    // 载入历史纪录
    const defaultLogs = [
      { id: 1, date: todayStr, durationMinutes: 120, remark: '上午看书遮盖2小时' }
    ];
    const logs = getStorage('eyepatch_records', defaultLogs);

    // 计算今日累计遮盖时间
    const todayLogs = logs.filter(l => l.date === todayStr);
    const totalMins = todayLogs.reduce((sum, item) => sum + (item.durationMinutes || 0), 0);
    const progress = Math.min(Math.round((totalMins / 240) * 100), 100); // 目标 4小时 (240分钟)

    this.setData({
      isWearing: status,
      startTime: start,
      historyLogs: logs,
      todayDurationMins: totalMins,
      progressPercent: progress
    });
  },

  // 开关：戴上眼罩 / 摘下眼罩
  toggleWearing: function () {
    const nowStatus = !this.data.isWearing;
    const nowTime = Date.now();
    const todayStr = today();

    if (nowStatus) {
      // 1. 戴上：记录开始毫秒数
      this.setData({
        isWearing: true,
        startTime: nowTime
      });
      setStorage('eyepatch_is_wearing', true);
      setStorage('eyepatch_start_time', nowTime);
      wx.showToast({ title: '开始遮盖计时', icon: 'success' });
    } else {
      // 2. 摘下：结算时长
      const start = this.data.startTime;
      if (!start) return;

      const diffMs = nowTime - start;
      const minutes = Math.max(Math.round(diffMs / (1000 * 60)), 1); // 至少记1分钟
      
      const list = [...this.data.historyLogs];
      list.push({
        id: Date.now(),
        date: todayStr,
        durationMinutes: minutes,
        remark: '计时自动保存'
      });

      this.setData({
        isWearing: false,
        startTime: null,
        historyLogs: list
      }, () => {
        setStorage('eyepatch_is_wearing', false);
        setStorage('eyepatch_start_time', null);
        setStorage('eyepatch_records', list);
        this.loadVisionData();
      });

      wx.showModal({
        title: '计时结束',
        content: `本次遮盖已持续 ${minutes} 分钟，已记入今日总量。`,
        showCancel: false
      });
    }
  },

  // 输入监听
  onMinsInput: function (e) {
    this.setData({ manualMins: e.detail.value });
  },

  // 手动录入记录
  addManualRecord: function () {
    const mins = parseInt(this.data.manualMins);
    if (!mins || mins <= 0) {
      wx.showToast({ title: '请输入正确分钟数', icon: 'error' });
      return;
    }

    const list = [...this.data.historyLogs];
    list.push({
      id: Date.now(),
      date: today(),
      durationMinutes: mins,
      remark: '手动补录'
    });

    this.setData({
      manualMins: '',
      historyLogs: list
    }, () => {
      setStorage('eyepatch_records', list);
      this.loadVisionData();
      wx.showToast({ title: '记录已保存', icon: 'success' });
    });
  },

  // 删除某条记录
  deleteLog: function (e) {
    const id = e.currentTarget.dataset.id;
    const that = this;
    wx.showModal({
      title: '删除记录',
      content: '确定要删除这条眼罩遮盖记录吗？',
      success: (res) => {
        if (res.confirm) {
          const list = that.data.historyLogs.filter(l => l.id !== id);
          that.setData({ historyLogs: list }, () => {
            setStorage('eyepatch_records', list);
            that.loadVisionData();
          });
        }
      }
    });
  }
});
