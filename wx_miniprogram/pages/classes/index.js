// pages/classes/index.js
const { getStorage, setStorage, today } = require('../../utils/storage.js');

Page({
  data: {
    // 机构管理
    customers: [],
    activeCustomerId: '',
    activeCustomerName: '',
    customerRecords: [],
    showAddCustomerModal: false,
    newCustomerName: '',

    // 统计看板
    currentBalance: 0,
    attendedCount: 0,
    absentCount: 0,
    monthCost: 0,

    // 月份过滤
    months: [],
    filterMonth: '',
    filteredRecords: [],

    // 表单状态
    formDate: '',
    formDayName: '',
    formAttended: true,
    formTeacher: '',
    formSessions: 2,
    formCost: 0,
    formTopup: 0,
    formBalance: 0,
    formNote: '',
    formAveragePrice: 0, // 默认单节均价自动计算值

    sessionsOptions: ['1节', '1.5节', '2节', '3节'],
    sessionsValues: [1, 1.5, 2, 3]
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

    this.loadClassesLocalData();

    // 静默云刷新
    const { syncPull } = require('../../utils/storage.js');
    syncPull(['classes', 'class_customers'], () => {
      this.loadClassesLocalData();
    });
  },

  loadClassesLocalData: function () {
    const customers = getStorage('class_customers', []);
    const activeCustomerId = getStorage('class_active_customer_id', '');
    
    const activeCust = customers.find(c => c.id === activeCustomerId) || customers[0] || null;
    const actualActiveId = activeCust ? activeCust.id : '';
    const actualActiveName = activeCust ? activeCust.name : '';

    this.setData({
      customers,
      activeCustomerId: actualActiveId,
      activeCustomerName: actualActiveName,
      formDate: today(),
      formDayName: this.getDayName(today())
    }, () => {
      this.loadActiveCustomerRecords();
    });
  },

  onPullDownRefresh: function () {
    const { syncPull } = require('../../utils/storage.js');
    syncPull(['classes', 'class_customers'], () => {
      this.loadClassesLocalData();
      wx.stopPullDownRefresh();
    });
  },

  // 获取星期
  getDayName: function (dateStr) {
    if (!dateStr) return '';
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const date = new Date(dateStr.replace(/-/g, '/'));
    return weekDays[date.getDay()];
  },

  // 载入当前机构的打卡明细
  loadActiveCustomerRecords: function () {
    const customerId = this.data.activeCustomerId;
    if (!customerId) {
      this.setData({
        customerRecords: [],
        filteredRecords: [],
        currentBalance: 0,
        attendedCount: 0,
        absentCount: 0,
        monthCost: 0
      });
      return;
    }

    // 新用户默认无任何种子数据
    const records = getStorage(`class_records_${customerId}`, []);
    const sortedRecords = records.sort((a, b) => a.date.localeCompare(b.date));
    
    // 自动提取最后一次上课的教师、课时和费用作为默认填入值，避免重复录入
    const lastAttended = [...sortedRecords].reverse().find(r => r.attended);
    const defaultTeacher = lastAttended ? lastAttended.teacher : '';
    const defaultSessions = lastAttended ? lastAttended.sessions : 2;
    const defaultCost = lastAttended ? lastAttended.cost : 240;

    this.setData({ 
      customerRecords: sortedRecords,
      formTeacher: defaultTeacher,
      formSessions: defaultSessions,
      formCost: defaultCost
    }, () => {
      this.calculateStats();
      this.precalculateFormBalance();
    });
  },

  // 统计数值计算
  calculateStats: function () {
    const records = this.data.customerRecords;
    const thisMonth = today().slice(0, 7);
    
    const currentBalance = records.length ? records[records.length - 1].balance : 0;
    const attendedCount = records.filter(r => r.date.startsWith(thisMonth) && r.attended).length;
    const absentCount = records.filter(r => r.date.startsWith(thisMonth) && !r.attended && r.date <= today()).length;
    const monthCost = records.filter(r => r.date.startsWith(thisMonth)).reduce((sum, r) => sum + (r.cost || 0), 0);

    // 月份过滤下拉菜单选项
    const set = new Set(records.map(r => r.date.slice(0, 7)));
    const months = [...set].sort().reverse();
    const filterMonthsOptions = ['全部月份', ...months];

    this.setData({
      currentBalance,
      attendedCount,
      absentCount,
      monthCost,
      months,
      filterMonthsOptions
    }, () => {
      this.filterRecords();
    });
  },

  // 过滤出历史明细
  filterRecords: function () {
    const list = [...this.data.customerRecords].reverse();
    const filter = this.data.filterMonth;
    const filteredRecords = filter ? list.filter(r => r.date.startsWith(filter)) : list;
    this.setData({ filteredRecords });
  },

  // 月份切换
  onFilterMonthChange: function (e) {
    const index = e.detail.value;
    const filterMonth = index === '0' ? '' : this.data.months[parseInt(index) - 1];
    this.setData({ filterMonth }, () => {
      this.filterRecords();
    });
  },

  // 切换机构
  onCustomerChange: function (e) {
    const index = e.detail.value;
    const activeCust = this.data.customers[index];
    if (!activeCust) return;
    
    setStorage('class_active_customer_id', activeCust.id);
    this.setData({
      activeCustomerId: activeCust.id,
      activeCustomerName: activeCust.name,
      filterMonth: ''
    }, () => {
      this.loadActiveCustomerRecords();
    });
  },

  // 自动预计算最终余额与单节均价
  precalculateFormBalance: function () {
    const records = this.data.customerRecords;
    const lastBal = records.length ? records[records.length - 1].balance : 0;
    const nextBal = lastBal + (parseFloat(this.data.formTopup) || 0) - (parseFloat(this.data.formCost) || 0);
    
    let formAveragePrice = 0;
    const sessions = parseFloat(this.data.formSessions) || 0;
    const cost = parseFloat(this.data.formCost) || 0;
    if (sessions > 0) {
      formAveragePrice = parseFloat((cost / sessions).toFixed(1));
    }

    this.setData({
      formBalance: nextBal,
      formAveragePrice: formAveragePrice
    });
  },

  // 表单双向绑定
  onDateChange: function (e) {
    const dateStr = e.detail.value;
    this.setData({
      formDate: dateStr,
      formDayName: this.getDayName(dateStr)
    });
  },

  onAttendedChange: function (e) {
    const val = e.detail.value; // Switch 开关: true/false
    this.setData({
      formAttended: val,
      formTeacher: val ? '' : '',
      formSessions: val ? 2 : 0,
      formCost: val ? 240 : 0
    }, () => {
      this.precalculateFormBalance();
    });
  },

  onTextInput: function (e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [field]: e.detail.value }, () => {
      if (field === 'formCost' || field === 'formTopup') {
        this.precalculateFormBalance();
      }
    });
  },

  onSessionsChange: function (e) {
    const idx = e.detail.value;
    const sessions = this.data.sessionsValues[idx];
    const cost = sessions * 120; // 默认均价120，用户后续可自行微调扣费
    this.setData({
      formSessions: sessions,
      formCost: cost
    }, () => {
      this.precalculateFormBalance();
    });
  },

  // 保存记录：增加弹窗二次确认
  addRecord: function () {
    if (!this.data.formDate || this.data.formBalance === '') {
      wx.showToast({ title: '表单不完整', icon: 'error' });
      return;
    }

    const dateStr = this.data.formDate;
    const attended = this.data.formAttended;
    const cost = parseFloat(this.data.formCost) || 0;
    const topup = parseFloat(this.data.formTopup) || 0;
    const balance = parseFloat(this.data.formBalance) || 0;
    const sessions = attended ? parseFloat(this.data.formSessions) : 0;
    const avgPrice = this.data.formAveragePrice;

    wx.showModal({
      title: '确认保存打卡',
      content: `请确认本次记录明细：\n\n・ 日期：${dateStr}\n・ 状态：${attended ? '出勤打卡' : '请假/缺席'}\n${attended ? `・ 课节：${sessions} 节\n・ 均价：¥${avgPrice} / 节\n` : ''}・ 扣减费用：¥${cost}\n・ 充值金额：¥${topup}\n・ 最终余额：¥${balance}\n\n是否确认保存该记录？`,
      success: (res) => {
        if (res.confirm) {
          const newItem = {
            id: Date.now(),
            date: dateStr,
            dayName: this.data.formDayName || this.getDayName(dateStr),
            attended: attended,
            teacher: attended ? this.data.formTeacher : '',
            sessions: sessions,
            cost: cost,
            topup: topup,
            balance: balance,
            note: this.data.formNote
          };

          const list = [...this.data.customerRecords];
          list.push(newItem);
          list.sort((a, b) => a.date.localeCompare(b.date));

          setStorage(`class_records_${this.data.activeCustomerId}`, list);
          
          wx.showToast({ title: '保存成功', icon: 'success' });
          
          // 重置表单状态，保留授课老师、课节数和费用（由 loadActiveCustomerRecords 从最新数据中自动填充）
          this.setData({
            formDate: today(),
            formDayName: this.getDayName(today()),
            formAttended: true,
            formTopup: 0,
            formNote: '',
          }, () => {
            this.loadActiveCustomerRecords();
          });
        }
      }
    });
  },

  // 删除某条记录
  deleteRecord: function (e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条上课打卡明细吗？',
      confirmColor: '#e53e3e',
      success: (res) => {
        if (res.confirm) {
          const list = this.data.customerRecords.filter(r => r.id !== id);
          setStorage(`class_records_${this.data.activeCustomerId}`, list);
          this.loadActiveCustomerRecords();
          wx.showToast({ title: '已删除', icon: 'success' });
        }
      }
    });
  },

  // 打开新建机构弹窗
  openAddCustomerModal: function () {
    this.setData({ showAddCustomerModal: true, newCustomerName: '' });
  },

  closeAddCustomerModal: function () {
    this.setData({ showAddCustomerModal: false });
  },

  onNewCustomerInput: function (e) {
    this.setData({ newCustomerName: e.detail.value });
  },

  // 保存新建机构
  saveCustomer: function () {
    const name = this.data.newCustomerName.trim();
    if (!name) {
      wx.showToast({ title: '请输入机构名称', icon: 'error' });
      return;
    }

    // 若用户手动创建了“春雨”、“春雨教育”、“春雨 (默认)”或“春雨红圆健康管理中心”，其 ID 必须设为 'spring_rain' 以对齐导入的历史打卡记录
    const id = (name === '春雨' || name === '春雨教育' || name === '春雨 (默认)' || name === '春雨红圆健康管理中心') ? 'spring_rain' : `customer_${Date.now()}`;
    const list = [...this.data.customers];
    list.push({ id, name });

    setStorage('class_customers', list);
    setStorage('class_active_customer_id', id);

    this.setData({
      customers: list,
      activeCustomerId: id,
      activeCustomerName: name,
      showAddCustomerModal: false
    }, () => {
      this.loadActiveCustomerRecords();
      wx.showToast({ title: '机构已创建', icon: 'success' });
    });
  },

  // 删除当前机构
  deleteActiveCustomer: function () {
    const activeCust = this.data.customers.find(c => c.id === this.data.activeCustomerId);
    if (!activeCust) return;

    wx.showModal({
      title: '彻底删除机构',
      content: `确定要彻底删除机构 "${activeCust.name}" 及其所有历史课程记录吗？该操作不可逆。`,
      confirmColor: '#e53e3e',
      success: (res) => {
        if (res.confirm) {
          wx.removeStorageSync(`class_records_${this.data.activeCustomerId}`);
          
          const list = this.data.customers.filter(c => c.id !== this.data.activeCustomerId);
          setStorage('class_customers', list);
          
          const nextActive = list[0] || null;
          const nextActiveId = nextActive ? nextActive.id : '';
          const nextActiveName = nextActive ? nextActive.name : '';
          setStorage('class_active_customer_id', nextActiveId);

          this.setData({
            customers: list,
            activeCustomerId: nextActiveId,
            activeCustomerName: nextActiveName
          }, () => {
            this.loadActiveCustomerRecords();
            wx.showToast({ title: '已彻底删除', icon: 'success' });
          });
        }
      }
    });
  }
});
