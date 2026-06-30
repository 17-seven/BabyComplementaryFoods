// pages/growth/index.js
const { getStorage, setStorage, today } = require('../../utils/storage.js');

Page({
  data: {
    records: [],
    latestRecord: null,

    // 表单状态
    formDate: '',
    formHeight: '',
    formWeight: '',
    formHead: '',
    formFoot: '',
    formNote: ''
  },

  onShow: function () {
    if (!wx.getStorageSync('user_is_logged_in') && !wx.getStorageSync('user_openid')) {
      wx.showModal({
        title: '请先登录',
        content: '此功能需要登录才能使用。',
        confirmText: '去登录',
        cancelText: '返回',
        success: (res) => {
          if (res.confirm) wx.redirectTo({ url: '/pages/login/index' });
          else wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/dashboard/index' }) });
        }
      });
      return;
    }

    this.setData({
      formDate: today()
    }, () => {
      this.loadGrowthRecords();
    });
  },

  // 加载数据记录
  loadGrowthRecords: function () {
    const rawRecords = getStorage('baby_growth_records', []);
    
    // 按日期从小到大排序，用于计算差值
    const sortedChrono = [...rawRecords].sort((a, b) => a.date.localeCompare(b.date));
    
    // 计算前后的差值
    const recordsWithDeltas = this.computeDeltas(sortedChrono);
    
    // 取最后一条测量值作为最新数据
    const latestRecord = sortedChrono.length ? sortedChrono[sortedChrono.length - 1] : null;

    // 显示给用户时，按时间倒序排列
    const displayRecords = [...recordsWithDeltas].reverse();

    this.setData({
      records: displayRecords,
      latestRecord
    });
  },

  // 计算两次测量间的差值
  computeDeltas: function (records) {
    const result = [];
    for (let i = 0; i < records.length; i++) {
      const curr = records[i];
      const prev = i > 0 ? records[i - 1] : null;
      
      const delta = {
        height: '',
        weight: '',
        head: '',
        foot: ''
      };
      
      if (prev) {
        if (curr.height && prev.height) {
          const diff = curr.height - prev.height;
          delta.height = diff > 0 ? `+${diff.toFixed(1)}cm` : diff < 0 ? `${diff.toFixed(1)}cm` : '持平';
        }
        if (curr.weight && prev.weight) {
          const diff = curr.weight - prev.weight;
          delta.weight = diff > 0 ? `+${diff.toFixed(2)}kg` : diff < 0 ? `${diff.toFixed(2)}kg` : '持平';
        }
        if (curr.head && prev.head) {
          const diff = curr.head - prev.head;
          delta.head = diff > 0 ? `+${diff.toFixed(1)}cm` : diff < 0 ? `${diff.toFixed(1)}cm` : '持平';
        }
        if (curr.foot && prev.foot) {
          const diff = curr.foot - prev.foot;
          delta.foot = diff > 0 ? `+${diff.toFixed(1)}cm` : diff < 0 ? `${diff.toFixed(1)}cm` : '持平';
        }
      }
      
      result.push({
        ...curr,
        delta
      });
    }
    return result;
  },

  // 表单输入绑定
  onDateChange: function (e) {
    this.setData({ formDate: e.detail.value });
  },

  onInputChange: function (e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [field]: e.detail.value });
  },

  // 保存数据
  saveRecord: function () {
    const date = this.data.formDate;
    const h = parseFloat(this.data.formHeight);
    const w = parseFloat(this.data.formWeight);
    const head = parseFloat(this.data.formHead);
    const foot = parseFloat(this.data.formFoot);
    const note = this.data.formNote.trim();

    if (!date) {
      wx.showToast({ title: '请选择日期', icon: 'error' });
      return;
    }

    if (isNaN(h) && isNaN(w) && isNaN(head) && isNaN(foot)) {
      wx.showToast({ title: '请至少填一项', icon: 'error' });
      return;
    }

    // 重新组合当前所有的记录
    const list = getStorage('baby_growth_records', []);
    
    const newItem = {
      id: Date.now(),
      date,
      height: isNaN(h) ? null : h,
      weight: isNaN(w) ? null : w,
      head: isNaN(head) ? null : head,
      foot: isNaN(foot) ? null : foot,
      note
    };

    list.push(newItem);
    setStorage('baby_growth_records', list);

    wx.showToast({ title: '录入成功', icon: 'success' });

    // 重置表单并重新加载
    this.setData({
      formDate: today(),
      formHeight: '',
      formWeight: '',
      formHead: '',
      formFoot: '',
      formNote: ''
    }, () => {
      this.loadGrowthRecords();
    });
  },

  // 删除记录
  deleteRecord: function (e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条生长发育记录吗？',
      confirmColor: '#e53e3e',
      success: (res) => {
        if (res.confirm) {
          const list = getStorage('baby_growth_records', []);
          const filtered = list.filter(r => r.id !== id);
          setStorage('baby_growth_records', filtered);
          this.loadGrowthRecords();
          wx.showToast({ title: '已删除', icon: 'success' });
        }
      }
    });
  }
});
