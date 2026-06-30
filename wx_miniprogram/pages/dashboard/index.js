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
  timerItems: [{ id: 'sleep_demo', name: '睡眠记录', icon: '😴', targetHours: 12, todayHours: 0, progress: 0 }],
  latestMilestone: null,
  avatarUrl: '/assets/avatar_default.png'
};

Page({
  data: {
    babyInfo: { name: '小宝贝', birthDate: '', desc: '', isPremature: false },
    actualAge: '0月0天', correctedAge: '', isPremature: false,
    isLoggedIn: false,
    animKey: 0,
    nextVaccine: null, nextCheckup: null, nextClinical: null,
    milkProgress: 0, milkVal: 0, waterVal: 0, bowelCount: 0,
    timerItems: [],
    latestMilestone: null,
    avatarUrl: '/assets/avatar_default.png'
  },

  _liveTimer: null,

  onShow: function () {
    this.setData({ animKey: (this.data.animKey + 1) % 2 });
    this.loadBabyStatus();
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 });
    }
  },

  onHide:   function () { this._stopLive(); },
  onUnload: function () { this._stopLive(); },

  _stopLive: function () {
    if (this._liveTimer) { clearInterval(this._liveTimer); this._liveTimer = null; }
  },

  // 有计时进行时每秒刷新 timerItems 数据
  _startLive: function () {
    this._stopLive();
    this._liveTimer = setInterval(() => {
      const todayStr = require('../../utils/storage.js').today();
      const items = this.data.timerItems;
      let hasWearing = false;
      const updated = items.map(t => {
        if (!t.isWearing || !t.startTime) return t;
        hasWearing = true;
        const sessionSecs = Math.floor((Date.now() - t.startTime) / 1000);
        const totalSecs   = (t.todayMins || 0) * 60 + sessionSecs;
        return { ...t, todayHours: parseFloat((totalSecs / 3600).toFixed(1)),
          progress: Math.min(Math.round((totalSecs / ((t.targetMins || 1) * 60)) * 100), 100) };
      });
      if (hasWearing) this.setData({ timerItems: updated });
      else this._stopLive();
    }, 1000);
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

    // 可扩展计时项（只展示用户自创的，排除默认眼罩模块）
    const defaultTimers = [{ id: 'eyepatch', name: '眼罩遮盖', icon: '👁️', targetMins: 240 }];
    const timerDefs = getStorage('vision_timer_items', defaultTimers)
      .filter(t => t.id !== 'eyepatch');
    const timerItems = timerDefs.map(t => {
      const key  = `vision_records_${t.id}`;
      const wearingData = getStorage(`vision_wearing_${t.id}`, { isWearing: false, startTime: null });
      const savedMins = getStorage(key, [])
        .filter(r => r.date === todayStr)
        .reduce((s, r) => s + (r.durationMinutes || 0), 0);
      const sessionSecs = wearingData.isWearing && wearingData.startTime
        ? Math.floor((Date.now() - wearingData.startTime) / 1000) : 0;
      const totalSecs = savedMins * 60 + sessionSecs;
      return {
        ...t,
        isWearing:   wearingData.isWearing,
        startTime:   wearingData.startTime,
        todayMins:   savedMins,
        todayHours:  parseFloat((totalSecs / 3600).toFixed(1)),
        targetHours: Math.round(t.targetMins / 60),
        progress:    Math.min(Math.round((totalSecs / ((t.targetMins || 1) * 60)) * 100), 100)
      };
    });
    // 有正在进行的计时时，启动实时刷新
    if (timerItems.some(t => t.isWearing)) this._startLive();

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
