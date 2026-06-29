// pages/family/index.js
const { getStorage, setStorage } = require('../../utils/storage.js');

Page({
  data: {
    isLoggedIn: false,
    myFamilyId: '',
    inviteCodeInput: '',
    familyDetails: null,
    membersList: []
  },

  onShow: function () {
    this.checkLoginStatus();
  },

  checkLoginStatus: function () {
    const app = getApp();
    const openid = app.globalData.openid;
    const familyId = getStorage('user_family_id', '');

    this.setData({
      isLoggedIn: !!openid,
      myFamilyId: familyId
    }, () => {
      if (this.data.isLoggedIn && this.data.myFamilyId) {
        this.fetchFamilyDetails();
      }
    });
  },

  // 从云数据库拉取家庭看护成员信息
  fetchFamilyDetails: function () {
    const db = wx.cloud.database();
    const that = this;

    db.collection('families').doc(this.data.myFamilyId).get({
      success: (res) => {
        const detail = res.data;
        that.setData({
          familyDetails: detail,
          membersList: detail.members || []
        });
      },
      fail: (err) => {
        console.warn("未能拉取云端家庭组详情，可能环境尚未部署完毕，采用本地缓存渲染", err);
        // 从本地宝宝档案读取，不再硬编码
        const profile = getStorage('baby_profile_info', null);
        that.setData({
          familyDetails: profile ? {
            baby_name: profile.name,
            birth_date: profile.birthDate,
            premature_days: profile.prematureDays || 0
          } : null,
          membersList: [getApp().globalData.openid || '您自己']
        });
      }
    });
  },

  // 1. 创建属于自己的全新家庭组
  createFamily: function () {
    const app = getApp();
    if (!this.data.isLoggedIn) {
      wx.showModal({
        title: '未登录',
        content: '请先在“我的”页面进行微信授权登录，以便系统记录您的云端 OpenID。',
        showCancel: false
      });
      return;
    }

    // 检查宝宝基础档案是否已设置
    const babyProfile = getStorage('baby_profile_info', null);
    if (!babyProfile || !babyProfile.name || !babyProfile.birthDate) {
      wx.showModal({
        title: '请先设置宝宝档案',
        content: '创建家庭共享前，需要先完善宝宝的基础信息（姓名、出生日期等），这样共享人才能看到宝宝的正确资料。',
        confirmText: '去设置',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: '/pages/baby/index' });
          }
        }
      });
      return;
    }

    const db = wx.cloud.database();
    const that = this;
    
    wx.showLoading({ title: '正在开通家庭组...' });
    
    const savedUserInfo = getStorage('user_info', null);
    db.collection('families').add({
      data: {
        baby_name: babyProfile.name,
        birth_date: babyProfile.birthDate,
        premature_days: babyProfile.prematureDays || 0,
        members: [app.globalData.openid],
        creator_nickname: savedUserInfo ? (savedUserInfo.nickName || '') : '',
        creator_avatar: savedUserInfo ? (savedUserInfo.avatarUrl || '/assets/avatar_default.png') : '/assets/avatar_default.png',
        create_time: new Date()
      },
      success: (res) => {
        wx.hideLoading();
        const familyId = res._id;
        
        that.setData({ myFamilyId: familyId }, () => {
          setStorage('user_family_id', familyId);
          that.fetchFamilyDetails();
          
          wx.showModal({
            title: '家庭创建成功',
            content: `您的专属家庭同步码为：\n\n${familyId}\n\n已为您自动复制。把此邀请码发送给您爱人，她在小程序端输入后即可共享数据。`,
            confirmText: '好 的',
            showCancel: false,
            success: () => {
              wx.setClipboardData({ data: familyId });
            }
          });
        });
      },
      fail: (err) => {
        wx.hideLoading();
        console.error("开通云端家庭失败，可能没有创建families集合，采用本地离线虚拟方案", err);
        
        // 离线生成临时同步码
        const fakeFamilyId = 'fam_loc_' + Date.now();
        that.setData({ myFamilyId: fakeFamilyId }, () => {
          setStorage('user_family_id', fakeFamilyId);
          that.fetchFamilyDetails();
          
          wx.showModal({
            title: '离线同步码生成',
            content: `本地虚拟同步码为：\n\n${fakeFamilyId}\n\n(注意：真实协同需开通云数据库families集合并部署joinFamily云函数哦！)`,
            confirmText: '复制同步码',
            success: (modalRes) => {
              if (modalRes.confirm) {
                wx.setClipboardData({ data: fakeFamilyId });
              }
            }
          });
        });
      }
    });
  },

  // 2. 输入框监听
  onInviteInput: function (e) {
    this.setData({ inviteCodeInput: e.detail.value.trim() });
  },

  // 3. 点击加入爱人的家庭
  joinFamily: function () {
    const code = this.data.inviteCodeInput;
    if (!code) {
      wx.showToast({ title: '请输入邀请码', icon: 'error' });
      return;
    }

    if (!this.data.isLoggedIn) {
      wx.showModal({
        title: '未登录',
        content: '请先在“我的”页面进行微信登录，以便系统记录您的 OpenID 绑定身份。',
        showCancel: false
      });
      return;
    }

    const that = this;
    wx.showLoading({ title: '正在加入...' });

    // 优先调用 joinFamily 云函数
    wx.cloud.callFunction({
      name: 'joinFamily',
      data: { familyId: code },
      success: (res) => {
        wx.hideLoading();
        if (res.result && res.result.success) {
          setStorage('user_family_id', code);
          that.setData({ myFamilyId: code }, () => {
            that.fetchFamilyDetails();
            wx.showModal({
              title: '绑定协同成功',
              content: '已成功接入家庭组！双方刷新页面即可看到共同添加的信息。',
              showCancel: false
            });
          });
        } else {
          // 兜底离线直接模拟成功
          that.setData({ myFamilyId: code }, () => {
            setStorage('user_family_id', code);
            that.fetchFamilyDetails();
            wx.showModal({
              title: '模拟绑定成功',
              content: '本地虚拟绑定成功！(真实云服务请部署 joinFamily 云函数。)',
              showCancel: false
            });
          });
        }
      },
      fail: (err) => {
        // 兜底失败直接模拟
        wx.hideLoading();
        console.warn("调用joinFamily云函数失败，采用离线模拟绑定", err);
        that.setData({ myFamilyId: code }, () => {
          setStorage('user_family_id', code);
          that.fetchFamilyDetails();
          wx.showModal({
            title: '绑定协同',
            content: '已本地记录您的同步码。请确保云数据库中 families 下已将您的 openid 添加入对应记录的 members 中。',
            showCancel: false
          });
        });
      }
    });
  },

  // 4. 复制我的同步码
  copyInviteCode: function () {
    wx.setClipboardData({
      data: this.data.myFamilyId,
      success: () => {
        wx.showToast({ title: '邀请码已复制', icon: 'success' });
      }
    });
  },

  // 5. 解绑家庭组
  leaveFamily: function () {
    const that = this;
    wx.showModal({
      title: '解绑确认',
      content: '确定要退出当前绑定的家庭组吗？退出后将无法共享看护人数据，转为单机本地状态。',
      confirmColor: '#e53e3e',
      success: (res) => {
        if (res.confirm) {
          setStorage('user_family_id', '');
          that.setData({
            myFamilyId: '',
            familyDetails: null,
            membersList: []
          });
          wx.showToast({ title: '已成功退组' });
        }
      }
    });
  }
});
