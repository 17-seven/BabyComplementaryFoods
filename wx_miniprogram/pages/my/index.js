// pages/my/index.js
const { calculateBabyAge } = require('../../utils/babyHelper.js');
const { getStorage, setStorage } = require('../../utils/storage.js');
const { today } = require('../../utils/storage.js');

// 默认计时模块（与 vision 页保持同步）
const DEFAULT_TIMERS = [
  { id: 'eyepatch', name: '眼罩遮盖', desc: '矫正斜视遮盖治疗', targetMins: 240, icon: '👁️' }
];
const TIMER_ICONS = ['⏱️', '😴', '🏃', '📺', '📖', '🧩', '🎵', '💊', '🧘', '🌙', '🎯', '⚽'];

// 可添加为页面快捷方式的清单
const AVAILABLE_PAGES = [
  { page: 'vision',    name: '计时模块',   icon: '⏱️', desc: '自定义计时追踪管理' },
  { page: 'bowel',     name: '排便记录',   icon: '💩', desc: '大便次数与性状打卡' },
  { page: 'nutrition', name: '饮奶饮水',   icon: '🍼', desc: '奶量水量每日记账' },
  { page: 'allergen',  name: '食材管理',   icon: '🥦', desc: '排敏食材安全池维护' },
  { page: 'album',     name: '宝宝相册',   icon: '🖼️', desc: '萌照管理与头像设置' },
  { page: 'baby',      name: '宝宝档案',   icon: '👶', desc: '基础信息与早产校正' },
  { page: 'family',    name: '家庭协同',   icon: '🏡', desc: '多端共享同步码管理' },
  { page: 'mealplan',  name: '辅食计划',   icon: '🥗', desc: '周历食谱与合规校验' },
  { page: 'healthcare',name: '医疗儿保',   icon: '🩺', desc: '疫苗、儿保、就诊记录' },
  { page: 'timeline',  name: '成长大事记', icon: '📋', desc: '里程碑时间轴记录' },
];

Page({
  data: {
    babyInfo: null,
    actualAge: "",
    correctedAge: "",
    isLoggedIn: false,
    userInfo: null,
    showLoginModal: false,
    tempAvatarUrl: '',
    inputNickname: '',

    // 自定义计时模块（同步 vision_timer_items）
    customTimers: [],
    // 页面快捷方式
    customShortcuts: [],
    // 新增计时模块弹窗
    showNewTimerModal: false,
    newTimerName: '', newTimerDesc: '', newTimerTargetHours: '1', newTimerIcon: '⏱️',
    timerIconOptions: TIMER_ICONS,
    // 页面快捷方式弹窗
    showShortcutModal: false,
    newShortcutPage: '',
    availablePages: AVAILABLE_PAGES
  },

  onShow: function () {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 4 });
    }
    this.setData({ animKey: ((this.data.animKey || 0) + 1) % 2 });
    const app = getApp();
    
    // 优先从本地缓存或全局对象中加载最新的微信登录信息
    const openid = app.globalData.openid || wx.getStorageSync('user_openid') || '';
    const isLoggedIn = wx.getStorageSync('user_is_logged_in') || !!openid;
    const userInfo = getStorage('user_info', app.globalData.userInfo);

    if (openid && app) {
      app.globalData.openid = openid;
      app.globalData.userInfo = userInfo;
    }

    // 从本地缓存读取宝宝档案
    const profile = getStorage('baby_profile_info', null);

    if (profile && profile.birthDate) {
      const prematureDays = profile.prematureDays || 0;
      const ageInfo = calculateBabyAge(profile.birthDate, prematureDays);
      this.setData({
        babyInfo: profile,
        actualAge: ageInfo.actualAge,
        correctedAge: ageInfo.correctedAge,
        isLoggedIn: isLoggedIn,
        userInfo: userInfo
      });
    } else {
      this.setData({
        babyInfo: null, actualAge: '', correctedAge: '',
        isLoggedIn: isLoggedIn, userInfo: userInfo
      });
    }
    this.loadCustomShortcuts();
  },

  // 触发授权登录（直接跳转至微信一键登录专属独立页面）
  handleLogin: function () {
    wx.navigateTo({
      url: '/pages/login/index'
    });
  },

  // 退出登录
  handleLogout: function () {
    const that = this;
    wx.showModal({
      title: '确认退出',
      content: '退出登录后，您的本地同步和家庭协同状态将会暂停，是否确认退出？',
      success: (res) => {
        if (res.confirm) {
          // 清除相关登录状态缓存
          wx.removeStorageSync('user_is_logged_in');
          wx.removeStorageSync('user_info');
          wx.removeStorageSync('user_openid');

          // 清除全局挂载
          const app = getApp();
          if (app) {
            app.globalData.openid = '';
            app.globalData.userInfo = null;
          }

          wx.showToast({
            title: '已退出登录',
            icon: 'success',
            duration: 1000,
            success: () => {
              setTimeout(() => {
                // 重定向回微信一键登录页面，形成完整循环
                wx.reLaunch({
                  url: '/pages/login/index'
                });
              }, 1000);
            }
          });
        }
      }
    });
  },

  // 快捷页面跳转
  navigateToPage: function (e) {
    const page = e.currentTarget.dataset.page;
    wx.navigateTo({ url: `/pages/${page}/index` });
  },

  // ===== 自定义快捷入口 =====
  loadCustomShortcuts: function () {
    const shortcuts = getStorage('my_custom_shortcuts', []);
    // 加载用户自创的计时模块（排除默认eyepatch）
    const timerDefs = getStorage('vision_timer_items', DEFAULT_TIMERS);
    const todayStr = today();
    const customTimers = timerDefs
      .filter(t => t.id !== 'eyepatch')
      .map(t => {
        const mins = getStorage(`vision_records_${t.id}`, [])
          .filter(r => r.date === todayStr)
          .reduce((s, r) => s + (r.durationMinutes || 0), 0);
        return { ...t, todayHours: parseFloat((mins / 60).toFixed(1)), targetHours: Math.round(t.targetMins / 60) };
      });
    this.setData({ customShortcuts: shortcuts, customTimers });
  },

  goTimer: function () { wx.navigateTo({ url: '/pages/vision/index' }); },

  goShortcut: function (e) {
    wx.navigateTo({ url: `/pages/${e.currentTarget.dataset.page}/index` });
  },

  // ===== 新增计时模块弹窗 =====
  openNewTimerModal: function () {
    this.setData({ showNewTimerModal: true, newTimerName: '', newTimerDesc: '', newTimerTargetHours: '1', newTimerIcon: '⏱️' });
  },
  closeNewTimerModal: function () { this.setData({ showNewTimerModal: false }); },
  selectTimerIcon:    function (e) { this.setData({ newTimerIcon: e.currentTarget.dataset.icon }); },
  onNewTimerInput:    function (e) { this.setData({ [e.currentTarget.dataset.field]: e.detail.value }); },

  saveNewTimerModule: function () {
    const name = this.data.newTimerName.trim();
    if (!name) { wx.showToast({ title: '请输入模块标题', icon: 'error' }); return; }
    const newItem = {
      id: 'timer_' + Date.now(), name,
      desc: this.data.newTimerDesc.trim(),
      targetMins: Math.round((parseFloat(this.data.newTimerTargetHours) || 1) * 60),
      icon: this.data.newTimerIcon || '⏱️'
    };
    const defs = getStorage('vision_timer_items', DEFAULT_TIMERS);
    defs.push(newItem);
    wx.setStorageSync('vision_timer_items', defs);
    const familyId = wx.getStorageSync('user_family_id');
    if (familyId && wx.cloud) {
      wx.cloud.callFunction({ name: 'updateFamily', data: { action: 'update', familyId, data: { timer_items: defs } } });
    }
    this.setData({ showNewTimerModal: false }, () => { this.loadCustomShortcuts(); wx.showToast({ title: '计时模块已创建', icon: 'success' }); });
  },

  deleteCustomTimer: function (e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({ title: '删除计时模块', content: '确定要删除此模块及所有历史记录吗？', confirmColor: '#e53e3e',
      success: (res) => {
        if (res.confirm) {
          const defs = getStorage('vision_timer_items', DEFAULT_TIMERS).filter(t => t.id !== id);
          wx.setStorageSync('vision_timer_items', defs);
          const familyId = wx.getStorageSync('user_family_id');
          if (familyId && wx.cloud) {
            wx.cloud.callFunction({ name: 'updateFamily', data: { action: 'update', familyId, data: { timer_items: defs } } });
          }
          this.loadCustomShortcuts();
        }
      }
    });
  },

  openShortcutModal: function () { wx.showToast({ title: '功能已移除', icon: 'none' }); },
  },
  closeShortcutModal: function () { this.setData({ showShortcutModal: false }); },
  selectShortcutPage: function (e) { this.setData({ newShortcutPage: e.currentTarget.dataset.page }); },

  confirmAddShortcut: function () {
    const pageDef = AVAILABLE_PAGES.find(p => p.page === this.data.newShortcutPage);
    if (!pageDef) return;
    const shortcuts = [...this.data.customShortcuts];
    if (shortcuts.some(s => s.page === pageDef.page)) {
      wx.showToast({ title: '已添加过该入口', icon: 'none' }); return;
    }
    shortcuts.push({ id: Date.now(), page: pageDef.page, name: pageDef.name, icon: pageDef.icon });
    setStorage('my_custom_shortcuts', shortcuts);
    this.setData({ customShortcuts: shortcuts, showShortcutModal: false });
    wx.showToast({ title: '快捷入口已添加', icon: 'success' });
  },

  deleteShortcut: function (e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '移除快捷入口', content: '确定要移除这个快捷入口吗？',
      success: (res) => {
        if (res.confirm) {
          const shortcuts = this.data.customShortcuts.filter(s => s.id !== id);
          setStorage('my_custom_shortcuts', shortcuts);
          this.setData({ customShortcuts: shortcuts });
        }
      }
    });
  },

  // ===== 开发者隐藏入口：版本号连点10次解锁 =====
  _versionTapCount: 0,       // 点击计数器
  _versionTapTimer: null,    // 超时重置定时器

  // 版本号点击事件
  onVersionTap: function () {
    this._versionTapCount++;

    // 3秒内未凑够10次则重置
    if (this._versionTapTimer) clearTimeout(this._versionTapTimer);
    this._versionTapTimer = setTimeout(() => {
      this._versionTapCount = 0;
    }, 3000);

    // 到达第7次时给予提示
    if (this._versionTapCount === 7) {
      wx.showToast({ title: '再点3次...', icon: 'none', duration: 1000 });
    }

    // 到达10次，解锁开发者面板
    if (this._versionTapCount >= 10) {
      this._versionTapCount = 0;
      clearTimeout(this._versionTapTimer);
      wx.vibrateShort({ type: 'heavy' }); // 触觉反馈
      this.setData({
        showDevPanel: true,
        importLogs: []
      });
      wx.showToast({ title: '🔓 开发者模式', icon: 'none' });
    }
  },

  // 关闭开发者面板
  closeDevPanel: function () {
    this.setData({ showDevPanel: false, importLogs: [] });
  },

  // 选取JSON文件并批量导入云数据库
  selectAndImportJsonFiles: function () {
    const app = getApp();
    const familyId = wx.getStorageSync('user_family_id');

    if (!app.globalData.openid) {
      wx.showModal({
        title: '未登录',
        content: '导入数据需要先完成微信授权登录。',
        showCancel: false
      });
      return;
    }

    if (!familyId) {
      wx.showModal({
        title: '导入提示',
        content: '请先前往“宝宝档案”页面录入并保存一次宝宝资料（即创建您的共享家庭组），然后再导入历史数据，以保证数据与家庭组正确关联。',
        showCancel: false
      });
      return;
    }

    const that = this;

    // 文件名 → 云数据库集合名的映射表
    const FILE_COLLECTION_MAP = {
      'timeline_events': 'timeline_events',
      'vaccines': 'vaccines',
      'healthcares': 'healthcares',
      'assessments': 'assessments',
      'clinical_logs': 'clinical_logs',
      'safe_foods': 'safe_foods',
      'risk_foods': 'risk_foods',
      'meal_plans': 'meal_plans'
    };

    // 微信文件管理器选取文件（支持多选）
    wx.chooseMessageFile({
      count: 20, // 最多选20个文件
      type: 'file',
      extension: ['json'],
      success: async (res) => {
        const files = res.tempFiles;
        if (!files || files.length === 0) return;

        that.setData({ importLogs: [] });
        const logs = [];
        const db = wx.cloud.database();
        let totalRecords = 0;
        let successFiles = 0;

        wx.showLoading({ title: '正在导入...', mask: true });

        for (const file of files) {
          // 从文件名中提取集合名（去掉扩展名）
          const rawName = file.name.replace(/\.json$/i, '');
          // 支持模糊匹配（如 2026-06-29_meal_plans.json 包含 meal_plans）
          const collectionKey = Object.keys(FILE_COLLECTION_MAP).find(key => rawName.includes(key));
          const collectionName = collectionKey ? FILE_COLLECTION_MAP[collectionKey] : null;

          if (!collectionName) {
            logs.push({ success: false, text: `⚠️ ${file.name} - 无法识别的文件名，跳过` });
            that.setData({ importLogs: logs.slice() });
            continue;
          }

          try {
            // 读取文件内容
            const fs = wx.getFileSystemManager();
            const fileContent = fs.readFileSync(file.path, 'utf-8');
            const dataArray = JSON.parse(fileContent);

            if (!Array.isArray(dataArray)) {
              logs.push({ success: false, text: `❌ ${file.name} - JSON内容不是数组格式` });
              that.setData({ importLogs: logs.slice() });
              continue;
            }

            // 1. 率先写入本地 LocalStorage，实现离线高可用与高容错
            const LOCAL_STORAGE_KEY_MAP = {
              'timeline_events': 'baby_timeline_events',
              'vaccines': 'baby_vaccines_list',
              'healthcares': 'baby_healthcares',
              'assessments': 'baby_assessments',
              'clinical_logs': 'baby_clinical_logs',
              'safe_foods': 'mp_safe_foods_list',
              'risk_foods': 'mp_risk_foods_list',
              'meal_plans': 'baby_week_plans'
            };
            const localKey = LOCAL_STORAGE_KEY_MAP[collectionName];
            if (localKey) {
              setStorage(localKey, dataArray);
            }

            // 2. 尝试向云数据库中写入（如果写入失败，直接报错打红叉，不能进行静默降级）
            let cloudSuccess = true;
            let cloudErrMsg = '';
            try {
              // 逐条写入云数据库（每批最多20条并发，避免超限）
              const BATCH_SIZE = 20;
              for (let i = 0; i < dataArray.length; i += BATCH_SIZE) {
                const batch = dataArray.slice(i, i + BATCH_SIZE);
                const tasks = batch.map(item => {
                  return db.collection(collectionName).add({
                    data: {
                      ...item,
                      family_id: familyId,
                      _import_time: new Date()
                    }
                  });
                });

                await Promise.all(tasks);
              }
            } catch (cloudErr) {
              console.error(`同步写入云端数据库 ${collectionName} 失败：`, cloudErr);
              cloudSuccess = false;
              cloudErrMsg = cloudErr.errMsg || cloudErr.message || JSON.stringify(cloudErr);
            }

            if (cloudSuccess) {
              totalRecords += dataArray.length;
              successFiles++;
              logs.push({ success: true, text: `✅ ${file.name} - 成功导入本地并同步至云数据库（共 ${dataArray.length} 条记录）` });
            } else {
              logs.push({ success: false, text: `❌ ${file.name} - 导入云数据库失败（${cloudErrMsg}）` });
            }
          } catch (err) {
            console.error(`解析导入 ${file.name} 失败：`, err);
            logs.push({ success: false, text: `❌ ${file.name} - ${err.message || '文件格式解析失败'}` });
          }

          // 实时更新日志到界面
          that.setData({ importLogs: logs.slice() });
        }

        wx.hideLoading();
        wx.showModal({
          title: '导入完成',
          content: `共处理 ${files.length} 个文件，成功 ${successFiles} 个，累计写入 ${totalRecords} 条记录。`,
          showCancel: false
        });
      },
      fail: () => {
        // 用户取消选择，不做处理
      }
    });
  }
});
