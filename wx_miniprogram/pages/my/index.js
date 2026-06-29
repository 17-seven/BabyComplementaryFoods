// pages/my/index.js
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
    
    // 登录授权状态
    isLoggedIn: false,
    userInfo: null,
    showLoginModal: false,
    tempAvatarUrl: '', // 临时选取的头像
    inputNickname: ''  // 输入的昵称
  },

  onShow: function () {
    const ageInfo = calculateBabyAge(this.data.babyInfo.birthDate, 71);
    const app = getApp();
    
    this.setData({
      actualAge: ageInfo.actualAge,
      correctedAge: ageInfo.correctedAge,
      isLoggedIn: !!app.globalData.openid,
      userInfo: app.globalData.userInfo
    });
  },

  // 触发授权登录
  handleLogin: function () {
    const that = this;
    wx.showLoading({ title: '正在授权...' });

    // 1. 调用云函数获取用户openid
    wx.cloud.callFunction({
      name: 'login',
      success: (res) => {
        wx.hideLoading();
        const openid = res.result.openid;
        getApp().globalData.openid = openid;
        wx.setStorageSync('user_openid', openid);
        
        // 2. 引导用户补充昵称和头像
        that.setData({
          showLoginModal: true,
          tempAvatarUrl: '',
          inputNickname: ''
        });
      },
      fail: (err) => {
        wx.hideLoading();
        console.error("云函数登录失败，采用本地离线兜底登录态", err);
        // 离线环境兜底虚拟 OpenID
        const fakeOpenid = 'fake_openid_' + Date.now();
        getApp().globalData.openid = fakeOpenid;
        wx.setStorageSync('user_openid', fakeOpenid);

        that.setData({
          showLoginModal: true,
          tempAvatarUrl: '',
          inputNickname: ''
        });
      }
    });
  },

  // 选择头像回调
  onChooseAvatar: function (e) {
    const avatarUrl = e.detail.avatarUrl;
    this.setData({ tempAvatarUrl: avatarUrl });
  },

  // 昵称输入绑定
  onNicknameInput: function (e) {
    this.setData({ inputNickname: e.detail.value });
  },

  // 保存登录资料
  submitLoginProfile: function () {
    const nick = this.data.inputNickname.trim();
    const avatar = this.data.tempAvatarUrl || '/assets/avatar_default.png'; // 默认头像

    if (!nick) {
      wx.showToast({ title: '请输入昵称', icon: 'error' });
      return;
    }

    const userInfo = {
      nickName: nick,
      avatarUrl: avatar
    };

    const app = getApp();
    app.globalData.userInfo = userInfo;
    wx.setStorageSync('user_info', userInfo);

    this.setData({
      isLoggedIn: true,
      userInfo: userInfo,
      showLoginModal: false
    });

    wx.showToast({ title: '登录成功', icon: 'success' });
  },

  // 取消登录模态框
  closeLoginModal: function () {
    this.setData({ showLoginModal: false });
  },

  // 快捷页面跳转
  navigateToPage: function (e) {
    const page = e.currentTarget.dataset.page;
    wx.navigateTo({
      url: `/pages/${page}/index`
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
    if (!app.globalData.openid) {
      wx.showModal({
        title: '未登录',
        content: '导入数据需要先完成微信授权登录。',
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
          const collectionName = FILE_COLLECTION_MAP[rawName];

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

            // 逐条写入云数据库（每批最多20条并发，避免超限）
            const BATCH_SIZE = 20;
            let imported = 0;

            for (let i = 0; i < dataArray.length; i += BATCH_SIZE) {
              const batch = dataArray.slice(i, i + BATCH_SIZE);
              const tasks = batch.map(item => {
                return db.collection(collectionName).add({
                  data: {
                    ...item,
                    baby_id: app.globalData.babyId || 'default_baby_id',
                    _import_time: new Date()
                  }
                });
              });

              await Promise.all(tasks);
              imported += batch.length;
            }

            totalRecords += imported;
            successFiles++;
            logs.push({ success: true, text: `✅ ${file.name} → ${collectionName}（${imported} 条记录）` });
          } catch (err) {
            console.error(`导入 ${file.name} 失败：`, err);
            logs.push({ success: false, text: `❌ ${file.name} - ${err.message || '写入失败'}` });
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
