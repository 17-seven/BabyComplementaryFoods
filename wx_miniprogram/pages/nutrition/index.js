// pages/nutrition/index.js
const { getStorage, setStorage, today } = require('../../utils/storage.js');

Page({
  data: {
    historyLogs: [],
    
    // 今日累计
    todayMilk: 0,
    todayWater: 0,
    milkProgressPercent: 0,

    // 表单输入
    selectedType: 'milk', // 'milk' | 'water'
    amountVal: '',
    logDate: ''
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
    this.setData({ logDate: today() });
    this.loadNutritionLogs();
  },

  loadNutritionLogs: function () {
    const todayStr = today();
    
    // 载入历史记录
    const defaultLogs = [
      { id: 1, date: todayStr, type: 'milk', amount: 150, remark: '上午喝奶' },
      { id: 2, date: todayStr, type: 'water', amount: 50, remark: '吸管杯喝水' }
    ];
    const logs = getStorage('milk_water_records', defaultLogs);

    // 统计今日喝水量与喝奶量
    const todayLogs = logs.filter(l => l.date === todayStr);
    const milkSum = todayLogs.filter(l => l.type === 'milk').reduce((sum, item) => sum + (item.amount || 0), 0);
    const waterSum = todayLogs.filter(l => l.type === 'water').reduce((sum, item) => sum + (item.amount || 0), 0);
    const progress = Math.min(Math.round((milkSum / 500) * 100), 100); // 奶量限制500ml内

    this.setData({
      historyLogs: [...logs].sort((a, b) => b.date.localeCompare(a.date)),
      todayMilk: milkSum,
      todayWater: waterSum,
      milkProgressPercent: progress
    });
  },

  // 快速加量按钮打卡
  quickAdd: function (e) {
    const { type, amount } = e.currentTarget.dataset;
    const item = {
      id: Date.now(),
      date: today(),
      type: type,
      amount: parseInt(amount),
      remark: '快速打卡记录'
    };

    const list = [...this.data.historyLogs];
    list.push(item);

    setStorage('milk_water_records', list);
    this.loadNutritionLogs();
    wx.showToast({ title: `成功记入 +${amount}ml`, icon: 'success' });
  },

  // 表单类型选择变更
  selectType: function (e) {
    this.setData({ selectedType: e.currentTarget.dataset.type });
  },
  onAmountInput: function (e) {
    this.setData({ amountVal: e.detail.value });
  },
  onDateChange: function (e) {
    this.setData({ logDate: e.detail.value });
  },

  // 保存记录
  saveRecord: function () {
    const amt = parseInt(this.data.amountVal);
    if (!amt || amt <= 0) {
      wx.showToast({ title: '请输入正确容量', icon: 'error' });
      return;
    }

    const item = {
      id: Date.now(),
      date: this.data.logDate,
      type: this.data.selectedType,
      amount: amt,
      remark: '手动录入'
    };

    const list = [...this.data.historyLogs];
    list.push(item);

    this.setData({ amountVal: '' }, () => {
      setStorage('milk_water_records', list);
      this.loadNutritionLogs();
      wx.showToast({ title: '保存成功', icon: 'success' });
    });
  },

  // 删除某条记录
  deleteLog: function (e) {
    const id = e.currentTarget.dataset.id;
    const that = this;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条喂水/喂奶记录吗？',
      success: (res) => {
        if (res.confirm) {
          const list = that.data.historyLogs.filter(l => l.id !== id);
          that.setData({ historyLogs: list }, () => {
            setStorage('milk_water_records', list);
            that.loadNutritionLogs();
          });
        }
      }
    });
  }
});
