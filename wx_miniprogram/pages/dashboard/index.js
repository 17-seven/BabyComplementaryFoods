// pages/dashboard/index.js
const { getStorage, today } = require('../../utils/storage.js');
const { calculateBabyAge } = require('../../utils/babyHelper.js');

// 未登录时展示的示例假数据（不含任何真实用户信息）
const GUEST_DATA = {
  babyInfo:  { name: '小宝贝', birthDate: '', desc: '', isPremature: false },
  actualAge: '0月0天', correctedAge: '', isPremature: false,
  isLoggedIn: false,
  nextVaccine: null, nextCheckup: null, nextClinical: null,
  milkVal: 0, milkProgress: 0, waterVal: 0, bowelCount: 0,
  timerItems: [{ id: 'eyepatch', name: '眼罩遮盖', icon: '👁️', targetHours: 4, todayHours: 0, progress: 0 }],
  latestMilestone: null,
  avatarUrl: '/assets/avatar_default.png'
};

Page({
  data: {
    babyInfo: { name: '小宝贝', birthDate: '', desc: '', isPremature: false },
    actualAge: '0月0天', correctedAge: '', isPremature: false,
    isLoggedIn: false,
    nextVaccine: null, nextCheckup: null, nextClinical: null,
    milkProgress: 0, milkVal: 0, waterVal: 0, bowelCount: 0,
    timerItems: [],
    latestMilestone: null,
    avatarUrl: '/assets/avatar_default.png'
  },

  onShow: function () {
    this.loadBabyStatus();
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 });
    }
  },

  onPullDownRefresh: function () {
    this.loadBabyStatus();
    wx.stopPullDownRefresh();
  },

  loadBabyStatus: function () {
    const isLoggedIn = !!(wx.getStorageSync('user_is_logged_in') || wx.getStorageSync('user_openid'));

    // 未登录 → 展示示例假数据，不读取用户真实缓存
    if (!isLoggedIn) {
      this.setData(GUEST_DATA);
      return;
    }

    const todayStr = today();
    const profile  = getStorage('baby_profile_info', null);

    const name         = profile && profile.name        ? profile.name        : '小宝贝';
    const birthDate    = profile && profile.birthDate   ? profile.birthDate   : '';
    const isPremature  = profile ? !!profile.isPremature : false;
    const prematureDays = isPremature && profile ? (profile.prematureDays || 0) : 0;
    const prematureDesc = isPremature && profile ? (profile.prematureDesc || '') : '';

    const ageInfo = birthDate
      ? calculateBabyAge(birthDate, prematureDays)
      : { actualAge: '0月0天', correctedAge: '' };

    // 饥奶与饥水
    const milkRecs   = getStorage('milk_water_records', []).filter(r => r.date === todayStr);
    const todayMilk  = milkRecs.filter(r => r.type === 'milk').reduce((s, r) => s + (r.amount || 0), 0);
    const todayWater = milkRecs.filter(r => r.type === 'water').reduce((s, r) => s + (r.amount || 0), 0);
    const todayBowel = getStorage('bowel_records', []).filter(r => r.date === todayStr).length;

    // 可扩展计时项
    const defaultTimers = [{ id: 'eyepatch', name: '眼罩遮盖', icon: '👁️', targetMins: 240 }];
    const timerDefs  = getStorage('vision_timer_items', defaultTimers);
    const timerItems = timerDefs.map(t => {
      const key  = t.id === 'eyepatch' ? 'eyepatch_records' : `vision_records_${t.id}`;
      const mins = getStorage(key, [])
        .filter(r => r.date === todayStr)
        .reduce((s, r) => s + (r.durationMinutes || 0), 0);
      return {
        ...t,
        todayHours:  parseFloat((mins / 60).toFixed(1)),
        targetHours: Math.round(t.targetMins / 60),
        progress:    Math.min(Math.round((mins / t.targetMins) * 100), 100)
      };
    });

    // 疫苗提醒
    const dueVaccines = getStorage('baby_vaccines_list', []).filter(v => v.status === '需补种' || v.status === '推荐接种');
    let nextVaccine = null;
    if (dueVaccines.length > 0) {
      const baseStr = getStorage('catchup_start_date', todayStr);
      const diff    = Math.ceil((new Date(baseStr).getTime() - Date.now()) / 86400000);
      nextVaccine   = { name: dueVaccines[0].name, dose: dueVaccines[0].dose, plannedDate: baseStr, daysLeft: diff > 0 ? diff : 0 };
    }

    // 儿保提醒
    const healthcares = getStorage('baby_healthcares', []);
    let nextCheckup = null;
    if (healthcares.length > 0) {
      const latest = [...healthcares].sort((a, b) => b.date.localeCompare(a.date))[0];
      const d = new Date(latest.date); d.setMonth(d.getMonth() + 3);
      const plannedStr = d.toISOString().slice(0, 10);
      const diff = Math.ceil((d.getTime() - Date.now()) / 86400000);
      nextCheckup = { plannedDate: plannedStr, daysLeft: diff > 0 ? diff : 0 };
    }

    // 就诊提醒
    const upcoming = getStorage('baby_clinical_logs', [])
      .filter(l => l.status === '未完成' && l.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date));
    let nextClinical = null;
    if (upcoming.length > 0) {
      const diff = Math.ceil((new Date(upcoming[0].date).getTime() - Date.now()) / 86400000);
      nextClinical = { name: upcoming[0].name, date: upcoming[0].date, daysLeft: diff > 0 ? diff : 0 };
    }

    // 最新大事记
    const events = getStorage('baby_timeline_events', []);
    const latestMilestone = events.length
      ? [...events].sort((a, b) => b.date.localeCompare(a.date))[0]
      : null;

    const avatar = getStorage('baby_custom_avatar', '/assets/avatar_default.png');

    this.setData({
      babyInfo: { name, birthDate, desc: isPremature ? prematureDesc : '', isPremature },
      actualAge: ageInfo.actualAge,
      correctedAge: ageInfo.correctedAge,
      isPremature,
      milkVal: todayMilk,
      milkProgress: Math.min(Math.round((todayMilk / 500) * 100), 100),
      waterVal: todayWater,
      bowelCount: todayBowel,
      timerItems,
      nextVaccine, nextCheckup, nextClinical,
      latestMilestone,
      avatarUrl: avatar,
      isLoggedIn: true
    });
  },

  onAvatarTap: function () {
    const avatar = this.data.avatarUrl;
    if (!avatar || avatar === '/assets/avatar_default.png') {
      wx.navigateTo({ url: '/pages/album/index' });
    } else {
      wx.previewImage({ urls: [avatar], current: avatar });
    }
  },

  goToLogin:    function() { wx.navigateTo({ url: '/pages/login/index' }); },
  toMealPlan:   function() { wx.switchTab({ url: '/pages/mealplan/index' }); },
  toHealthcare: function() { wx.switchTab({ url: '/pages/healthcare/index' }); },
  toTimeline:   function() { wx.switchTab({ url: '/pages/timeline/index' }); },
  toNutrition:  function() { wx.navigateTo({ url: '/pages/nutrition/index' }); },
  toBowel:      function() { wx.navigateTo({ url: '/pages/bowel/index' }); },
  toVision:     function() { wx.navigateTo({ url: '/pages/vision/index' }); }
});
