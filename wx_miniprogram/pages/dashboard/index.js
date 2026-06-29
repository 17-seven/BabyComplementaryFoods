// pages/dashboard/index.js
const { getStorage, today } = require('../../utils/storage.js');
const { calculateBabyAge } = require('../../utils/babyHelper.js');

Page({
  data: {
    babyInfo: {
      name: "小宝贝",
      birthDate: "2025-02-18",
      desc: "29w+6 早产"
    },
    actualAge: "",
    correctedAge: "",
    
    // 日程提醒
    nextVaccine: null,
    nextCheckup: null,
    nextClinical: null,

    // 今日护理数据
    milkProgress: 0,
    milkVal: 0,
    waterVal: 0,
    bowelCount: 0,
    eyepatchProgress: 0,
    eyepatchVal: 0,

    // 最新大事记
    latestMilestone: null,
    avatarUrl: '/assets/avatar_default.png'
  },

  onShow: function () {
    // 清除缓存后未登录，强制跳回登录页
    const isLoggedIn = wx.getStorageSync('user_is_logged_in');
    const openid = wx.getStorageSync('user_openid');
    if (!isLoggedIn && !openid) {
      wx.reLaunch({ url: '/pages/login/index' });
      return;
    }
    this.loadBabyStatus();
  },

  loadBabyStatus: function () {
    const todayStr = today();
    
    // 读取宝宝的本地档案设置
    const defaultProfile = {
      name: '',
      birthDate: '',
      isPremature: true,
      prematureDays: 0,
      prematureDesc: ''
    };
    const profile = getStorage('baby_profile_info', defaultProfile);

    // 1. 计算月龄
    const ageInfo = calculateBabyAge(profile.birthDate, profile.prematureDays);
    
    // 2. 饮奶与饮水统计
    const milkRecords = getStorage('milk_water_records', []);
    const todayRecs = milkRecords.filter(r => r.date === todayStr);
    const todayMilk = todayRecs.filter(r => r.type === 'milk').reduce((s, r) => s + r.amount, 0);
    const todayWater = todayRecs.filter(r => r.type === 'water').reduce((s, r) => s + r.amount, 0);

    // 3. 今日排便
    const bowelRecords = getStorage('bowel_records', []);
    const todayBowel = bowelRecords.filter(r => r.date === todayStr).length;

    // 4. 眼罩遮盖时间
    const eyepatchRecords = getStorage('eyepatch_records', []);
    const todayEyepatchMins = eyepatchRecords.filter(r => r.date === todayStr).reduce((s, r) => s + (r.durationMinutes || 0), 0);
    const eyepatchHours = parseFloat((todayEyepatchMins / 60).toFixed(1));

    // 5. 提醒：下一针疫苗
    const defaultVaccines = [
      { name: '乙肝疫苗', dose: '第3剂', status: '需补种' }
    ];
    const vaccineList = getStorage('baby_vaccines_list', defaultVaccines);
    const dueVaccines = vaccineList.filter(v => v.status === '需补种' || v.status === '推荐接种');
    let nextVaccine = null;
    if (dueVaccines.length > 0) {
      const baseStr = getStorage('catchup_start_date', '2026-07-06');
      const base = new Date(baseStr);
      const plannedDateStr = base.toISOString().slice(0, 10);
      const diff = Math.ceil((base.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      nextVaccine = {
        name: dueVaccines[0].name,
        dose: dueVaccines[0].dose,
        plannedDate: plannedDateStr,
        daysLeft: diff > 0 ? diff : 0
      };
    }

    // 6. 提醒：下次儿保
    const defaultHealthcares = [{ date: '2026-06-18' }];
    const healthcares = getStorage('baby_healthcares', defaultHealthcares);
    let nextCheckup = null;
    if (healthcares.length > 0) {
      const latest = [...healthcares].sort((a, b) => b.date.localeCompare(a.date))[0];
      const d = new Date(latest.date);
      d.setMonth(d.getMonth() + 3);
      const plannedStr = d.toISOString().slice(0, 10);
      const diff = Math.ceil((d.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      nextCheckup = {
        plannedDate: plannedStr,
        daysLeft: diff > 0 ? diff : 0
      };
    }

    // 7. 提醒：预约就诊
    const defaultClinicalLogs = [
      { id: 24, name: '眼睛复查', date: '2026-09-15', desc1: '四院 崔丽红', desc2: '三个月后散瞳复查', result: '', status: '未完成' }
    ];
    const clinicalLogs = getStorage('baby_clinical_logs', defaultClinicalLogs);
    const upcoming = clinicalLogs
      .filter(l => l.status === '未完成' && l.date && l.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date));
    let nextClinical = null;
    if (upcoming.length > 0) {
      const appt = upcoming[0];
      const d = new Date(appt.date);
      const diff = Math.ceil((d.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      nextClinical = {
        name: appt.name,
        date: appt.date,
        daysLeft: diff > 0 ? diff : 0
      };
    }

    // 8. 最新大事记
    const defaultEvents = [{ date: '2026-06-18', category: '日常医疗', title: '斜视遮盖法', content: '开始遵医嘱进行斜视矫正遮盖治疗。第一天遮盖左眼，每天佩戴遮盖眼罩4小时。' }];
    const list = getStorage('baby_timeline_events', defaultEvents);
    let latestMilestone = null;
    if (list.length > 0) {
      latestMilestone = [...list].sort((a, b) => b.date.localeCompare(a.date))[0];
    }

    const avatar = getStorage('baby_custom_avatar', '/assets/avatar_default.png');

    this.setData({
      babyInfo: {
        name: profile.name,
        birthDate: profile.birthDate,
        desc: profile.prematureDesc
      },
      actualAge: ageInfo.actualAge,
      correctedAge: ageInfo.correctedAge,
      milkVal: todayMilk,
      milkProgress: Math.min(Math.round((todayMilk / 500) * 100), 100),
      waterVal: todayWater,
      bowelCount: todayBowel,
      eyepatchVal: eyepatchHours,
      eyepatchProgress: Math.min(Math.round((eyepatchHours / 4) * 100), 100),
      nextVaccine,
      nextCheckup,
      nextClinical,
      latestMilestone,
      avatarUrl: avatar
    });
  },

  // 首页头像点击：有图展示大图，无图跳到相册管理页面上传
  onAvatarTap: function () {
    const avatar = this.data.avatarUrl;
    const isDefault = !avatar || avatar === '/assets/avatar_default.png';
    if (isDefault) {
      wx.navigateTo({ url: '/pages/album/index' });
    } else {
      wx.previewImage({ urls: [avatar], current: avatar });
    }
  },

  // 页面交互方法
  toMealPlan: function() {
    wx.switchTab({ url: '/pages/mealplan/index' });
  },
  toHealthcare: function() {
    wx.switchTab({ url: '/pages/healthcare/index' });
  },
  toTimeline: function() {
    wx.switchTab({ url: '/pages/timeline/index' });
  },
  toNutrition: function() {
    wx.navigateTo({ url: '/pages/nutrition/index' });
  },
  toBowel: function() {
    wx.navigateTo({ url: '/pages/bowel/index' });
  },
  toVision: function() {
    wx.navigateTo({ url: '/pages/vision/index' });
  }
});
