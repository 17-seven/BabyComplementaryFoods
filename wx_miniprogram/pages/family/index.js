// pages/family/index.js
const { getStorage, setStorage } = require('../../utils/storage.js');

Page({
  data: {
    isLoggedIn: false,
    myFamilyId: '',
    inviteCodeInput: '',
    familyDetails: null,
    membersList: [],
    showQrModal: false
  },

  onShow: function () {
    if (!wx.getStorageSync('user_is_logged_in') && !wx.getStorageSync('user_openid')) {
      wx.showModal({ title: '请先登录', content: '此功能需要登录才能使用。', confirmText: '去登录', cancelText: '返回',
        success: (res) => {
          if (res.confirm) wx.redirectTo({ url: '/pages/login/index' });
          else wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/dashboard/index' }) });
        }
      });
      return;
    }
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
    const that = this;
    wx.showLoading({ title: '正在获取家庭信息...' });

    const request = require('../../utils/request.js');
    request.post('/sync/pull', {
      familyId: that.data.myFamilyId
    }).then((res) => {
      wx.hideLoading();
      if (res.code === 200 && res.data && res.data.familyRecord) {
        const detail = res.data.familyRecord;
        const membersInfo = detail.members_info || [];
        const membersOpenids = detail.members || [];
        
        const currentOpenid = getApp().globalData.openid || wx.getStorageSync('user_openid') || '';
        const creatorOpenid = detail.creator_openid || detail._openid || (membersOpenids && membersOpenids[0]);
        
        const membersList = membersOpenids.map(m => {
          const info = membersInfo.find(infoItem => infoItem.openid === m);
          const isCreator = (m === creatorOpenid);
          let nickName = info ? info.nickName : (isCreator ? (detail.creator_nickname || '群主') : '看护人');
          let avatarUrl = info ? info.avatarUrl : (isCreator ? (detail.creator_avatar || '/assets/avatar_default.png') : '/assets/avatar_default.png');
          
          const isLocalPath = (url) => {
            if (!url) return true;
            return url.startsWith('wxfile://') || 
                   url.startsWith('http://tmp/') || 
                   url.startsWith('http://usr/') || 
                   url.startsWith('wdfile://') || 
                   url.includes('profile_avatar') ||
                   url.startsWith('http://127.0.0.1');
          };
          
          if (m !== currentOpenid && isLocalPath(avatarUrl)) {
            avatarUrl = '/assets/avatar_default.png';
          }

          return {
            openid: m,
            nickName: nickName || (isCreator ? '创建者' : '看护人'),
            avatarUrl: avatarUrl || '/assets/avatar_default.png',
            isCreator: isCreator
          };
        });

        membersList.sort((a, b) => {
          if (a.openid === creatorOpenid) return -1;
          if (b.openid === creatorOpenid) return 1;
          return 0;
        });

        const isCurrentCreator = (currentOpenid === creatorOpenid);
        that.setData({
          familyDetails: detail,
          membersList: membersList,
          isCurrentCreator: isCurrentCreator
        });
      } else {
        const localFamilyId = wx.getStorageSync('user_family_id');
        if (localFamilyId) {
          setStorage('user_family_id', '');
          that.setData({ myFamilyId: '' }, () => {
            that.fallbackToOffline();
            wx.showModal({
              title: '协同共享已断开',
              content: '您已被管理员移出该家庭组，或该家庭组已解散。已自动切换回本地单机模式。',
              showCancel: false
            });
          });
        } else {
          that.fallbackToOffline();
        }
      }
    }).catch((err) => {
      wx.hideLoading();
      console.warn("未能通过自建后台拉取家庭组详情，采用本地缓存渲染", err);
      that.fallbackToOffline();
    });
  },

  fallbackToOffline: function () {
    const profile = getStorage('baby_profile_info', null);
    const userInfo = getStorage('user_info', null);
    const openid = getApp().globalData.openid || wx.getStorageSync('user_openid') || '您自己';
    this.setData({
      familyDetails: profile ? {
        baby_name: profile.name,
        birth_date: profile.birthDate,
        premature_days: profile.prematureDays || 0,
        creator_openid: openid
      } : { creator_openid: openid },
      membersList: [
        {
          openid: openid,
          nickName: userInfo ? (userInfo.nickName || '您自己') : '您自己',
          avatarUrl: userInfo ? (userInfo.avatarUrl || '/assets/avatar_default.png') : '/assets/avatar_default.png',
          isCreator: true
        }
      ],
      isCurrentCreator: true
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

    const that = this;
    const savedUserInfo = getStorage('user_info', null);
    wx.showLoading({ title: '正在开通家庭组...' });

    const request = require('../../utils/request.js');
    request.post('/family/update-action', {
      action: 'create',
      data: {
        baby_name: babyProfile.name,
        birth_date: babyProfile.birthDate,
        premature_days: babyProfile.prematureDays || 0,
        creator_nickname: savedUserInfo ? (savedUserInfo.nickName || '') : '',
        creator_avatar: savedUserInfo ? (savedUserInfo.avatarUrl || '/assets/avatar_default.png') : '/assets/avatar_default.png'
      }
    }).then((res) => {
      wx.hideLoading();
      if (res.code !== 200 || !res.data || !res.data.success) {
        wx.showModal({ title: '创建失败', content: res.message || '未知错误', showCancel: false });
        return;
      }
      const familyId = res.data.familyId;
      that.setData({ myFamilyId: familyId }, () => {
        setStorage('user_family_id', familyId);
        const { syncMerge } = require('../../utils/storage.js');
        syncMerge(familyId, () => {
          that.fetchFamilyDetails();
          wx.showModal({
            title: '家庭创建成功',
            content: `您的专属家庭同步码为：\n\n${familyId}\n\n已为您自动复制。把此邀请码发送给您爱人，她在小程序端输入后即可共享数据。`,
            confirmText: '好 的',
            showCancel: false,
            success: () => { wx.setClipboardData({ data: familyId }); }
          });
        });
      });
    }).catch((err) => {
      wx.hideLoading();
      console.error('自建服务器创建家庭接口失败，进行本地降级:', err);
      const fakeFamilyId = 'fam_loc_' + Date.now();
      that.setData({ myFamilyId: fakeFamilyId }, () => {
        setStorage('user_family_id', fakeFamilyId);
        that.fetchFamilyDetails();
        wx.showModal({
          title: '离线同步码生成',
          content: `本地虚拟同步码为：\n\n${fakeFamilyId}\n\n(已复制到剪贴板，注意当前为离线模式)`,
          confirmText: '复制同步码',
          success: (modalRes) => {
            if (modalRes.confirm) {
              wx.setClipboardData({ data: fakeFamilyId });
            }
          }
        });
      });
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

    const userInfo = getStorage('user_info', null);
    // 优先调用 joinFamily 云函数
    const request = require('../../utils/request.js');
    request.post('/family/update-action', {
      action: 'addMember',
      familyId: code,
      data: {
        nickName: userInfo ? (userInfo.nickName || '') : '',
        avatarUrl: userInfo ? (userInfo.avatarUrl || '/assets/avatar_default.png') : '/assets/avatar_default.png'
      }
    }).then((res) => {
      wx.hideLoading();
      if (res.code === 200 && res.data && res.data.success) {
        setStorage('user_family_id', code);
        that.setData({ myFamilyId: code }, () => {
          const { syncMerge } = require('../../utils/storage.js');
          syncMerge(code, () => {
            that.fetchFamilyDetails();
            wx.showModal({
              title: '绑定协同成功',
              content: '已成功接入家庭组！双方刷新页面即可看到共同添加的信息。',
              showCancel: false
            });
          });
        });
      } else {
        wx.showModal({ title: '绑定失败', content: res.message || '邀请码错误或已被解散', showCancel: false });
      }
    }).catch((err) => {
      wx.hideLoading();
      console.warn("加入家庭接口失败，进行本地模拟绑定", err);
      that.setData({ myFamilyId: code }, () => {
        setStorage('user_family_id', code);
        that.fetchFamilyDetails();
        wx.showModal({
          title: '离线绑定成功',
          content: '已在本地保存该家庭同步码，部分离线缓存将限制在当前设备使用。',
          showCancel: false
        });
      });
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
  // 移除家庭组成员 (仅创建者有权调用)
  removeMember: function (e) {
    const that = this;
    const targetOpenid = e.currentTarget.dataset.openid;
    const nickname = e.currentTarget.dataset.nickname || '看护人';
    const familyId = this.data.myFamilyId;

    if (!familyId || !targetOpenid) return;

    wx.showModal({
      title: '移除成员确认',
      content: `确定要将“${nickname}”移出当前家庭组吗？移出后对方将转为单机本地状态且无法同步数据。`,
      confirmColor: '#e53e3e',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '正在移除成员...', mask: true });
          const request = require('../../utils/request.js');
          request.post('/family/update-action', {
            action: 'removeMember',
            familyId: familyId,
            targetOpenid: targetOpenid
          }).then((res) => {
            wx.hideLoading();
            if (res.code === 200 && res.data && res.data.success) {
              wx.showToast({ title: '移除成功', icon: 'success' });
              that.fetchFamilyDetails();
            } else {
              wx.showToast({ title: res.message || '移除失败', icon: 'none' });
            }
          }).catch((err) => {
            wx.hideLoading();
            console.error('移除成员接口失败:', err);
            wx.showToast({ title: '网络异常，请重试', icon: 'none' });
          });
        }
      }
    });
  },

  // 5. 解绑退出或注销家庭组
  leaveFamily: function () {
    const that = this;
    const isCreator = this.data.isCurrentCreator;
    const familyId = this.data.myFamilyId;

    if (isCreator) {
      // 创建者注销家庭组逻辑：必须先移除其他所有看护成员
      if (this.data.membersList.length > 1) {
        wx.showModal({
          title: '无法注销',
          content: '无法直接注销家庭组。请先点击列表成员旁的“移除”按钮，将其他所有协同看护人移出家庭组，最后再注销家庭组。',
          showCancel: false
        });
        return;
      }

      wx.showModal({
        title: '注销家庭组确认',
        content: '确定要注销当前家庭组吗？注销后所有协同绑定关系将被删除，您的数据将转为单机本地状态。',
        confirmColor: '#e53e3e',
        success: (res) => {
          if (res.confirm) {
            wx.showLoading({ title: '正在注销家庭组...', mask: true });
            if (familyId && !familyId.startsWith('fam_loc_')) {
              const request = require('../../utils/request.js');
              request.post('/family/update-action', {
                action: 'dismissFamily',
                familyId: familyId
              }).then((res) => {
                wx.hideLoading();
                if (res.code === 200 && res.data && res.data.success) {
                  that.clearLocalFamilyInfo();
                  wx.showToast({ title: '家庭组已注销', icon: 'success' });
                } else {
                  wx.showToast({ title: res.message || '注销失败', icon: 'none' });
                }
              }).catch((err) => {
                wx.hideLoading();
                console.warn('服务端注销失败，强制本地注销:', err);
                that.clearLocalFamilyInfo();
              });
            } else {
              wx.hideLoading();
              that.clearLocalFamilyInfo();
            }
          }
        }
      });

    } else {
      // 协同成员自主退组逻辑
      wx.showModal({
        title: '退出确认',
        content: '确定要退出当前绑定的家庭组吗？退出后您将无法共享数据，数据转为单机本地状态。',
        confirmColor: '#e53e3e',
        success: (res) => {
          if (res.confirm) {
            wx.showLoading({ title: '正在解除绑定...', mask: true });
            if (familyId && !familyId.startsWith('fam_loc_')) {
              const request = require('../../utils/request.js');
              request.post('/family/update-action', {
                action: 'removeMember',
                familyId: familyId
              }).then(() => {
                wx.hideLoading();
                that.clearLocalFamilyInfo();
              }).catch((err) => {
                wx.hideLoading();
                console.warn('服务端退出家庭组失败，进行本地解绑:', err);
                that.clearLocalFamilyInfo();
              });
            } else {
              wx.hideLoading();
              that.clearLocalFamilyInfo();
            }
          }
        }
      });
    }
  },

  clearLocalFamilyInfo: function () {
    setStorage('user_family_id', '');
    this.setData({
      myFamilyId: '',
      familyDetails: null,
      membersList: []
    });
    wx.showToast({ title: '已成功退组', icon: 'success' });
  },

  // 6. 二维码弹窗控制
  openQrModal: function () {
    this.setData({ showQrModal: true });
  },
  closeQrModal: function () {
    this.setData({ showQrModal: false });
  },
  preventBubble: function () {
    // 阻止冒泡
  },

  // 7. 扫码绑定
  scanToJoin: function () {
    const that = this;
    wx.scanCode({
      onlyFromCamera: false,
      scanType: ['qrCode'],
      success: (res) => {
        let code = res.result || '';
        if (code.startsWith('familyId:')) {
          code = code.replace('familyId:', '');
        }
        code = code.trim();
        if (code && code.length >= 10) {
          that.setData({ inviteCodeInput: code }, () => {
            that.joinFamily();
          });
        } else {
          wx.showToast({ title: '无效的同步码', icon: 'error' });
        }
      },
      fail: (err) => {
        console.warn('扫码失败或取消:', err);
      }
    });
  }
});
