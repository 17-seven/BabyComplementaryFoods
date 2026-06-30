// pages/healthcare/index.js
const { getStorage, setStorage, today } = require('../../utils/storage.js');
const { regenerateVaccineSchedule } = require('../../utils/babyHelper.js');
const { 
  defaultVaccinesList, 
  defaultHealthcares, 
  defaultAssessments, 
  defaultClinicalLogs 
} = require('../../data/healthcare.js');

Page({
  data: {
    activeTab: 'vaccine', // 'vaccine' | 'checkup' | 'assessment' | 'clinical'
    
    // 1. 疫苗记录
    vaccineList: [],
    catchUpStartDate: '2026-07-06',
    catchUpSchedule: [],
    nextVaccine: null,
    vaccineFilter: 'all', // 'all' | 'due' | 'completed'
    
    // 2. 季度儿保
    healthcares: [],
    nextCheckupDate: '',
    nextCheckupDays: 0,
    // 表单
    hcDate: '',
    hcHeight: '',
    hcWeight: '',
    hcHead: '',
    hcFeedback: '',

    // 3. 发育评估
    assessments: [],
    // 评估表单
    asmDate: '',
    asmName: '',
    asmDoctor: '',
    asmResult: '',
    asmIntervention: '',

    // 4. 临床就诊
    clinicalLogs: [],
    cliFilter: 'all', // 'all' | 'completed' | 'uncompleted'
    nextClinical: null,
    // 就诊表单
    cliName: '',
    cliDate: '',
    cliStatus: '未完成',
    cliDesc1: '',
    cliDesc2: '',
    cliResult: ''
  },

  onShow: function () {
    this.setData({ hcDate: today(), cliDate: today(), asmDate: today(), animKey: ((this.data.animKey || 0) + 1) % 2 });
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 });
    }
    if (!wx.getStorageSync('user_is_logged_in') && !wx.getStorageSync('user_openid')) {
      wx.showModal({ title: '请先登录', content: '此功能需要登录才能使用。', confirmText: '去登录', cancelText: '留在此页',
        success: (res) => { if (res.confirm) wx.navigateTo({ url: '/pages/login/index' }); }
      });
      return;
    }
    this.initData();
  },

  initData: function () {
    // 载入本地缓存或种子数据
    const vaccines = getStorage('baby_vaccines_list', defaultVaccinesList);
    const catchupStart = getStorage('catchup_start_date', '2026-07-06');
    const hcs = getStorage('baby_healthcares', defaultHealthcares);
    const asms = getStorage('baby_assessments', defaultAssessments);
    const clis = getStorage('baby_clinical_logs', defaultClinicalLogs);

    this.setData({
      vaccineList: vaccines,
      catchUpStartDate: catchupStart,
      healthcares: hcs,
      assessments: asms,
      clinicalLogs: clis
    }, () => {
      this.calculateVaccines();
      this.calculateNextCheckup();
      this.calculateNextClinical();
    });
  },

  // tab 切换
  switchTab: function (e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
  },

  // ==================== 1. 疫苗接种逻辑 ====================
  calculateVaccines: function () {
    const schedule = regenerateVaccineSchedule(this.data.vaccineList, this.data.catchUpStartDate);
    this.setData({
      catchUpSchedule: schedule,
      nextVaccine: schedule.length > 0 ? schedule[0] : null
    });
  },

  // 修改补种起点
  onCatchUpDateChange: function (e) {
    const date = e.detail.value;
    this.setData({ catchUpStartDate: date }, () => {
      setStorage('catchup_start_date', date);
      this.calculateVaccines();
    });
  },

  // 快捷打卡接种疫苗
  vaccineCheckIn: function (e) {
    const index = e.currentTarget.dataset.index;
    const item = this.data.catchUpSchedule[index];
    if (!item) return;

    // 弹窗确认实际接种日期
    const that = this;
    wx.showModal({
      title: '疫苗接种打卡',
      content: `确认已接种 ${item.name} (${item.dose}) 吗？`,
      editable: true,
      placeholderText: today(),
      success: (res) => {
        if (res.confirm) {
          const actualDate = res.content.trim() || today();
          
          // 在原列表里更新状态
          const list = [...that.data.vaccineList];
          const originIdx = list.findIndex(v => v.name === item.name && v.dose === item.dose);
          if (originIdx !== -1) {
            list[originIdx].status = '已接种';
            list[originIdx].actualDate = actualDate;
          }

          // 级联滚动：下一个接种日期规划在该接种日期的 15 天后
          const nextStart = new Date(actualDate);
          nextStart.setDate(nextStart.getDate() + 15);
          const nextStartStr = nextStart.toISOString().slice(0, 10);

          that.setData({
            vaccineList: list,
            catchUpStartDate: nextStartStr
          }, () => {
            setStorage('baby_vaccines_list', list);
            setStorage('catchup_start_date', nextStartStr);
            that.calculateVaccines();
          });

          wx.showToast({ title: '打卡成功', icon: 'success' });
        }
      }
    });
  },

  // 变更全量疫苗表中某针的状态
  toggleListStatus: function (e) {
    const idx = e.currentTarget.dataset.index;
    const list = [...this.data.vaccineList];
    const item = list[idx];
    
    const that = this;
    const statusOpts = ['已接种', '需补种', '推荐接种', '未到时间'];
    wx.showActionSheet({
      itemList: statusOpts,
      success: (res) => {
        const newStatus = statusOpts[res.tapIndex];
        item.status = newStatus;
        if (newStatus === '已接种') {
          item.actualDate = today();
        } else {
          item.actualDate = null;
        }
        
        that.setData({ vaccineList: list }, () => {
          setStorage('baby_vaccines_list', list);
          that.calculateVaccines();
        });
      }
    });
  },

  // ==================== 2. 儿保逻辑 ====================
  calculateNextCheckup: function () {
    const hcs = this.data.healthcares;
    if (hcs.length === 0) return;
    const sorted = [...hcs].sort((a, b) => b.date.localeCompare(a.date));
    const latest = sorted[0];
    const d = new Date(latest.date);
    d.setMonth(d.getMonth() + 3);
    const plannedDate = d.toISOString().slice(0, 10);
    const diff = Math.ceil((d.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    this.setData({
      nextCheckupDate: plannedDate,
      nextCheckupDays: diff > 0 ? diff : 0
    });
  },

  // 输入监听
  onHcInput: function (e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [field]: e.detail.value });
  },

  // ==================== 2.5 发育评估逻辑 ====================
  onAsmInput: function (e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [field]: e.detail.value });
  },

  addAssessment: function () {
    const name = this.data.asmName.trim();
    const date = this.data.asmDate;
    const result = this.data.asmResult.trim();
    if (!name || !date || !result) {
      wx.showToast({ title: '请填写评估名称、日期和结果', icon: 'error' });
      return;
    }
    const list = [...this.data.assessments];
    list.push({
      id: Date.now(),
      date,
      name,
      doctor:       this.data.asmDoctor.trim(),
      result,
      intervention: this.data.asmIntervention.trim()
    });
    this.setData({
      assessments: list,
      asmName: '', asmDoctor: '', asmResult: '', asmIntervention: ''
    }, () => {
      setStorage('baby_assessments', list);
      wx.showToast({ title: '评估记录已保存', icon: 'success' });
    });
  },

  deleteAssessment: function (e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条发育评估记录吗？',
      success: (res) => {
        if (res.confirm) {
          const list = this.data.assessments.filter(a => a.id !== id);
          this.setData({ assessments: list }, () => setStorage('baby_assessments', list));
        }
      }
    });
  },

  // 添加儿保记录
  addHealthcare: function () {
    const d = this.data.hcDate;
    const h = parseFloat(this.data.hcHeight);
    const w = parseFloat(this.data.hcWeight);
    const hc = parseFloat(this.data.hcHead);
    const f = this.data.hcFeedback.trim();

    if (!d || !h || !w || !hc) {
      wx.showToast({ title: '请填写完整指标', icon: 'error' });
      return;
    }

    const list = [...this.data.healthcares];
    list.push({
      id: Date.now(),
      date: d,
      height: h,
      weight: w,
      headCircumference: hc,
      feedback: f
    });

    this.setData({
      healthcares: list,
      hcHeight: '',
      hcWeight: '',
      hcHead: '',
      hcFeedback: ''
    }, () => {
      setStorage('baby_healthcares', list);
      this.calculateNextCheckup();
      wx.showToast({ title: '添加成功', icon: 'success' });
    });
  },

  deleteHealthcare: function (e) {
    const id = e.currentTarget.dataset.id;
    const that = this;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条儿保记录吗？',
      success: (res) => {
        if (res.confirm) {
          const list = that.data.healthcares.filter(h => h.id !== id);
          that.setData({ healthcares: list }, () => {
            setStorage('baby_healthcares', list);
            that.calculateNextCheckup();
          });
        }
      }
    });
  },

  // ==================== 3. 临床就诊逻辑 ====================
  calculateNextClinical: function () {
    const clis = this.data.clinicalLogs;
    const todayStr = today();
    const upcoming = clis
      .filter(l => l.status === '未完成' && l.date && l.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date));
    this.setData({
      nextClinical: upcoming.length > 0 ? upcoming[0] : null
    });
  },

  onCliInput: function(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [field]: e.detail.value });
  },

  // 快速完成/撤销就诊状态
  toggleClinicalStatus: function (e) {
    const id = e.currentTarget.dataset.id;
    const list = [...this.data.clinicalLogs];
    const idx = list.findIndex(l => l.id === id);
    if (idx !== -1) {
      list[idx].status = list[idx].status === '已完成' ? '未完成' : '已完成';
      this.setData({ clinicalLogs: list }, () => {
        setStorage('baby_clinical_logs', list);
        this.calculateNextClinical();
      });
    }
  },

  // 添加就诊卡
  addClinicalLog: function () {
    const name = this.data.cliName.trim();
    const d = this.data.cliDate;
    const status = this.data.cliStatus;
    const d1 = this.data.cliDesc1.trim();
    const d2 = this.data.cliDesc2.trim();
    const r = this.data.cliResult.trim();

    if (!name || !d) {
      wx.showToast({ title: '填写名称与日期', icon: 'error' });
      return;
    }

    const list = [...this.data.clinicalLogs];
    list.push({
      id: Date.now(),
      name,
      date: d,
      status,
      desc1: d1,
      desc2: d2,
      result: r
    });

    this.setData({
      clinicalLogs: list,
      cliName: '',
      cliDesc1: '',
      cliDesc2: '',
      cliResult: ''
    }, () => {
      setStorage('baby_clinical_logs', list);
      this.calculateNextClinical();
      wx.showToast({ title: '录入成功', icon: 'success' });
    });
  },

  deleteClinicalLog: function (e) {
    const id = e.currentTarget.dataset.id;
    const that = this;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条就诊记录吗？',
      success: (res) => {
        if (res.confirm) {
          const list = that.data.clinicalLogs.filter(l => l.id !== id);
          that.setData({ clinicalLogs: list }, () => {
            setStorage('baby_clinical_logs', list);
            that.calculateNextClinical();
          });
        }
      }
    });
  }
});
