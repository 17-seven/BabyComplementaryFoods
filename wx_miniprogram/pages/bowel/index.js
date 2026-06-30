// pages/bowel/index.js
const { getStorage, setStorage, today } = require('../../utils/storage.js');

Page({
  data: {
    historyLogs: [],
    todayCount: 0,

    // 表单状态
    bowelDate: '',
    selectedStatus: '正常糊状',
    selectedColor: '黄色',
    selectedDryness: '适中',
    hasBlood: false,
    remark: '',

    // 可选项列表
    statusList: ['正常糊状', '干硬蛋蛋', '稀烂多水', '黏液便'],
    colorList: ['黄色', '绿色', '褐色', '黑色', '带血红'],
    drynessList: ['干硬', '适中', '稀软']
  },

  onShow: function () {
    if (!wx.getStorageSync('user_is_logged_in') && !wx.getStorageSync('user_openid')) {
      wx.showModal({ title: '请先登录', content: '此功能需要登录才能使用。', confirmText: '去登录', cancelText: '返回',
        success: (res) => {
          if (res.confirm) wx.redirectTo({ url: '/pages/login/index' });
          else wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/dashboard/index' }) });
        }
      });
      return;
    }
    this.setData({ bowelDate: today() });
    this.loadBowelLogs();
  },

  loadBowelLogs: function () {
    const todayStr = today();
    const logs = getStorage('bowel_records', []);
    
    // 过滤出今天的数量
    const todayLogs = logs.filter(l => l.date === todayStr);

    this.setData({
      historyLogs: [...logs].sort((a, b) => b.date.localeCompare(a.date)),
      todayCount: todayLogs.length
    });
  },

  // 绑定选择器
  onStatusChange: function (e) {
    this.setData({ selectedStatus: this.data.statusList[e.detail.value] });
  },
  onColorChange: function (e) {
    const color = this.data.colorList[e.detail.value];
    this.setData({ 
      selectedColor: color,
      hasBlood: color === '带血红'
    });
  },
  onDrynessChange: function (e) {
    this.setData({ selectedDryness: this.data.drynessList[e.detail.value] });
  },
  onDateChange: function (e) {
    this.setData({ bowelDate: e.detail.value });
  },
  onBloodToggle: function (e) {
    this.setData({ hasBlood: e.detail.value });
  },
  onRemarkInput: function (e) {
    this.setData({ remark: e.detail.value });
  },

  // 新增记录保存
  saveBowel: function () {
    // 未登录不允许添加内容
    if (!wx.getStorageSync('user_is_logged_in') && !wx.getStorageSync('user_openid')) {
      wx.showModal({
        title: '请先登录',
        content: '保存排便记录需要先登录。',
        confirmText: '去登录',
        success: (res) => { if (res.confirm) wx.navigateTo({ url: '/pages/login/index' }); }
      });
      return;
    }
    const item = {
      id: Date.now(),
      date: this.data.bowelDate,
      status: this.data.selectedStatus,
      color: this.data.selectedColor,
      dryness: this.data.selectedDryness,
      hasBlood: this.data.hasBlood,
      remark: this.data.remark.trim()
    };

    const list = [...this.data.historyLogs];
    list.push(item);

    this.setData({
      remark: '',
      hasBlood: false
    }, () => {
      setStorage('bowel_records', list);
      this.loadBowelLogs();
      wx.showToast({ title: '记录成功', icon: 'success' });
    });
  },

  // 删除某条记录
  deleteLog: function (e) {
    const id = e.currentTarget.dataset.id;
    const that = this;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条排便记录吗？',
      success: (res) => {
        if (res.confirm) {
          const list = that.data.historyLogs.filter(l => l.id !== id);
          that.setData({ bowel_records: list }, () => {
            setStorage('bowel_records', list);
            that.loadBowelLogs();
          });
        }
      }
    });
  }
});
