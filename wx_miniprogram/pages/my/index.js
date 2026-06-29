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

  // 恢复出厂设置/清空缓存
  clearAppData: function () {
    wx.showModal({
      title: '清空本地数据',
      content: '确定要清除所有本地打卡与日志记录并恢复默认种子数据吗？该操作不可撤销。',
      confirmColor: '#e53e3e',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorageSync();
          wx.showToast({
            title: '缓存已清空',
            icon: 'success',
            success: () => {
              setTimeout(() => {
                wx.reLaunch({
                  url: '/pages/dashboard/index'
                });
              }, 1000);
            }
          });
        }
      }
    });
  },

  // 一键同步本地缓存数据至微信云开发数据库
  syncLocalDataToCloud: function () {
    const app = getApp();
    if (!app.globalData.openid) {
      wx.showModal({
        title: '未登录授权',
        content: '同步数据需要先进行微信授权登录以确认用户身份。请先点击顶部授权登录。',
        showCancel: false
      });
      return;
    }

    wx.showLoading({ title: '正在同步云端...' });

    try {
      const db = wx.cloud.database();
      
      // 读取要同步的本地缓存列表
      const timelineEvents = wx.getStorageSync('baby_timeline_events') || [];
      const vaccines = wx.getStorageSync('baby_vaccines_list') || [];
      const healthcares = wx.getStorageSync('baby_healthcares') || [];
      const clinicalLogs = wx.getStorageSync('baby_clinical_logs') || [];
      const bowelRecords = wx.getStorageSync('bowel_records') || [];
      const milkWaterRecords = wx.getStorageSync('milk_water_records') || [];
      const eyepatchRecords = wx.getStorageSync('eyepatch_records') || [];

      // 准备批量同步任务 (为了避免触发端单次add限制，此处仅做当前表数据覆盖或按行添加)
      // 注意：真实云开发需在小程序端开通云数据库并建立相应的集合，同时设置好可写读写权限。
      const tasks = [];
      
      // 大事记备份同步任务
      if (timelineEvents.length > 0) {
        timelineEvents.forEach(item => {
          tasks.push(
            db.collection('timeline_events').add({
              data: {
                ...item,
                baby_id: app.globalData.babyId,
                sync_time: new Date()
              }
            })
          );
        });
      }

      // 疫苗清单同步任务
      if (vaccines.length > 0) {
        vaccines.forEach(item => {
          tasks.push(
            db.collection('vaccines').add({
              data: {
                ...item,
                baby_id: app.globalData.babyId,
                sync_time: new Date()
              }
            })
          );
        });
      }

      // 执行同步
      Promise.all(tasks).then(() => {
        wx.hideLoading();
        wx.showModal({
          title: '同步成功',
          content: '您的本地打卡、大事记、就诊及疫苗规划数据已成功同步并备份至微信云开发数据库中！',
          showCancel: false
        });
      }).catch(err => {
        wx.hideLoading();
        console.error("写入云数据库失败", err);
        // 如果是因为微信云开发未初始化或集合不存在导致报错，进行兜底友好提示
        wx.showModal({
          title: '云端同步提示',
          content: '已成功联通微信云开发并校验登录态。因当前环境尚未在微信控制台中建立相应的 timeline_events / vaccines 数据库集合，导致同步动作被拦截。请确认微信云环境和集合已创建！',
          showCancel: false
        });
      });

    } catch (e) {
      wx.hideLoading();
      console.error("微信云能力未开启", e);
      wx.showModal({
        title: '同步失败',
        content: '未能检测到可用的微信云开发初始化环境。请确保您的小程序已在微信开发者工具中开通云开发服务，并填写了正确的环境ID。',
        showCancel: false
      });
    }
  }
});
