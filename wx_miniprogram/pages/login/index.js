// pages/login/index.js
const { getStorage, setStorage } = require('../../utils/storage.js');

Page({
  data: {
    agreementChecked: false, // 隐私政策勾选状态
    showProfileDrawer: false, // 完善个人资料抽屉开关
    tempAvatarUrl: '',        // 授权临时头像路径
    inputNickname: ''         // 输入的看护人昵称
  },

  onLoad: function () {
    // 预载已存储的用户资料，方便回填
    const info = getStorage('user_info', null);
    if (info) {
      this.setData({
        tempAvatarUrl: info.avatarUrl || '',
        inputNickname: info.nickName || ''
      });
    }
  },

  // 协议复选框切换
  toggleAgreement: function () {
    this.setData({
      agreementChecked: !this.data.agreementChecked
    });
  },

  // 微信一键登录按钮点击
  handleWechatLogin: function () {
    // 1. 协议合规强校验
    if (!this.data.agreementChecked) {
      wx.showToast({
        title: '请勾选同意协议政策',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    wx.showLoading({ title: '正在登录...', mask: true });

    // 2. 优先调用微信云开发自带的 login 云函数，直接在云端安全获取唯一、终生不变的微信号真实 openid
    const that = this;
    if (wx.cloud) {
      wx.cloud.callFunction({
        name: 'login',
        success: (res) => {
          const openid = res.result.openid;
          console.log("微信云端成功换取到真实、稳定唯一的微信 OpenID：" + openid);
          that.proceedLoginWithOpenid(openid);
        },
        fail: (err) => {
          wx.hideLoading();
          wx.showModal({
            title: '微信登录失败',
            content: '无法通过云开发服务获取您的微信用户标识 OpenID。发布前请确保您的微信小程序云后台已部署并开通了名为 login 的云函数。\n\n错误信息：' + (err.errMsg || err.message || JSON.stringify(err)),
            showCancel: false
          });
        }
      });
    } else {
      wx.hideLoading();
      wx.showModal({
        title: '微信登录失败',
        content: '云开发环境未初始化。请先在 app.js 中完成真实云环境 ID 的设定，并开通微信云开发服务。',
        showCancel: false
      });
    }
  },

  // 使用换取的稳定唯一 OpenID 开展老用户家庭组检索与数据重构
  proceedLoginWithOpenid: function (openid) {
    const app = getApp();
    if (app) {
      app.globalData.openid = openid;
    }
    wx.setStorageSync('user_openid', openid);

    if (wx.cloud) {
      try {
        const db = wx.cloud.database();
        db.collection('families').where({
          members: openid
        }).limit(1).get({
          success: (queryRes) => {
            if (queryRes.data && queryRes.data.length > 0) {
              const familyRec = queryRes.data[0];
              // 如果云端保存过创建者昵称，说明是老用户清除了本地缓存，直接无感恢复
              if (familyRec.creator_nickname) {
                const userInfo = {
                  nickName: familyRec.creator_nickname,
                  avatarUrl: familyRec.creator_avatar || '/assets/avatar_default.png'
                };
                setStorage('user_info', userInfo);
                wx.setStorageSync('user_is_logged_in', true);
                
                // 顺带恢复宝宝基础档案、头像、相册数据
                wx.setStorageSync('user_family_id', familyRec._id);
                const babyProfile = {
                  name: familyRec.baby_name || '宝宝',
                  birthDate: familyRec.birth_date || '',
                  isPremature: !!familyRec.due_date,
                  dueDate: familyRec.due_date || '',
                  prematureDays: familyRec.premature_days || 0,
                  prematureDesc: familyRec.premature_desc || ''
                };
                wx.setStorageSync('baby_profile_info', babyProfile);
                if (familyRec.baby_avatar) {
                  wx.setStorageSync('baby_custom_avatar', familyRec.baby_avatar);
                }
                if (familyRec.album_photos) {
                  wx.setStorageSync('baby_album_photos', familyRec.album_photos);
                }

                if (app) {
                  app.globalData.userInfo = userInfo;
                }

                // 后台静默从云端拉取所有业务数据，恢复本地缓存
                this.restoreCloudDataToLocal(familyRec._id);

                wx.hideLoading();
                wx.showToast({
                  title: '欢迎回来',
                  icon: 'success',
                  duration: 1500,
                  success: () => {
                    setTimeout(() => {
                      wx.navigateBack({
                        fail: () => {
                          wx.switchTab({ url: '/pages/dashboard/index' });
                        }
                      });
                    }, 1500);
                  }
                });
                return;
              }
            }

            // 没找到云端数据，或者云端没填昵称，则走本地缓存校验
            this.localUserInfoCheck(openid);
          },
          fail: (err) => {
            console.warn("查询云端 families 失败，退回本地缓存检测：", err);
            this.localUserInfoCheck(openid);
          }
        });
      } catch (e) {
        this.localUserInfoCheck(openid);
      }
    } else {
      this.localUserInfoCheck(openid);
    }
  },

  // 本地缓存看护人校验引导兜底
  localUserInfoCheck: function (openid) {
    const existingUserInfo = getStorage('user_info', null);
    const app = getApp();
    
    if (existingUserInfo && existingUserInfo.nickName) {
      // 老看护人直接登录成功，跳转回上一页
      wx.setStorageSync('user_is_logged_in', true);
      if (app) {
        app.globalData.userInfo = existingUserInfo;
      }

      wx.hideLoading();
      wx.showToast({
        title: '欢迎回来',
        icon: 'success',
        duration: 1500,
        success: () => {
          setTimeout(() => {
            wx.navigateBack({
              fail: () => {
                wx.switchTab({ url: '/pages/dashboard/index' });
              }
            });
          }, 1500);
        }
      });
    } else {
      // 真·新用户，唤起完善信息半屏抽屉面板
      wx.hideLoading();
      this.setData({
        showProfileDrawer: true
      });
    }
  },

  // 获取微信授权头像
  onChooseAvatar: function (e) {
    const avatarUrl = e.detail.avatarUrl;
    this.setData({
      tempAvatarUrl: avatarUrl
    });
  },

  // 获取微信昵称输入
  onNicknameInput: function (e) {
    this.setData({
      inputNickname: e.detail.value
    });
  },

  // 提交并保存完善的信息
  submitProfile: function () {
    const nickname = this.data.inputNickname.trim();
    const avatar = this.data.tempAvatarUrl;

    if (!nickname) {
      wx.showToast({
        title: '请输入看护人昵称',
        icon: 'none'
      });
      return;
    }

    // 构造完整的登录看护人信息
    const userInfo = {
      nickName: nickname,
      avatarUrl: avatar || '/assets/avatar_default.png'
    };
    setStorage('user_info', userInfo);
    wx.setStorageSync('user_is_logged_in', true);

    const app = getApp();
    if (app) {
      app.globalData.userInfo = userInfo;
    }

    // 实时同步更新至云数据库备份里（以防未来被清除缓存）
    // 同步看护人昵称到云端：优先按 familyId 更新，否则按 openid 检索所有所属家庭组更新
    const familyId = wx.getStorageSync('user_family_id');
    const openid = wx.getStorageSync('user_openid') || '';
    if (wx.cloud && openid) {
      try {
        const db = wx.cloud.database();
        const updatePayload = {
          creator_nickname: nickname,
          creator_avatar: avatar || '/assets/avatar_default.png'
        };
        if (familyId) {
          db.collection('families').doc(familyId).update({ data: updatePayload });
        } else {
          // 家庭组尚未创建，按 openid 成员关系查询后补录昵称
          db.collection('families').where({ members: openid }).get({
            success: (res) => {
              if (res.data && res.data.length > 0) {
                res.data.forEach(fam => {
                  db.collection('families').doc(fam._id).update({ data: updatePayload });
                });
              }
            }
          });
        }
      } catch (e) {
        console.warn("实时上传云端看护人信息备份失败：", e);
      }
    }

    this.setData({
      showProfileDrawer: false
    });

    wx.showToast({
      title: '登录成功',
      icon: 'success',
      duration: 1500,
      success: () => {
        setTimeout(() => {
          wx.navigateBack({
            fail: () => {
              wx.switchTab({ url: '/pages/dashboard/index' });
            }
          });
        }, 1500);
      }
    });
  },

  /**
   * 清缓存重新登录后，把云端各业务集合数据拉回本地 Storage
   * 采用 fire-and-forget 模式，不阻塞页面跳转
   */
  restoreCloudDataToLocal: function (familyId) {
    if (!wx.cloud || !familyId) return;
    const db = wx.cloud.database();

    const CLOUD_TO_LOCAL = {
      'timeline_events':  'baby_timeline_events',
      'vaccines':         'baby_vaccines_list',
      'healthcares':      'baby_healthcares',
      'assessments':      'baby_assessments',
      'clinical_logs':    'baby_clinical_logs',
      'safe_foods':       'mp_safe_foods_list',
      'risk_foods':       'mp_risk_foods_list',
      'meal_plans':       'baby_week_plans',
      'bowel_records':    'bowel_records',
      'milk_water_records': 'milk_water_records',
      'eyepatch_records': 'eyepatch_records'
    };

    Object.entries(CLOUD_TO_LOCAL).forEach(([collName, localKey]) => {
      db.collection(collName).where({ family_id: familyId }).limit(100).get({
        success: (res) => {
          if (res.data && res.data.length > 0) {
            wx.setStorageSync(localKey, res.data);
            console.log('[云端恢复]', collName, res.data.length, '条 →', localKey);
          }
        },
        fail: (err) => {
          console.warn('[云端恢复失败]', collName, err);
        }
      });
    });
  },

  // 关闭半屏抽屉面板
  closeProfileDrawer: function () {
    this.setData({
      showProfileDrawer: false
    });
  },

  // 打开协议文本
  openAgreement: function () {
    wx.showModal({
      title: '服务协议条款说明',
      content: '本小程序旨在辅助记录宝宝成长打卡、辅食添加和过敏防护。所有记录均存储于设备本地缓存及微信云端，绝不在任何第三方渠道下共享或搜集您的私人数据。',
      showCancel: false
    });
  },

  // 打开隐私政策文本
  openPrivacy: function () {
    wx.showModal({
      title: '看护隐私政策说明',
      content: '我们高度尊重用户隐私。除家庭同步码协同共享看护外，我们不会将宝宝的就诊详情、身高体重、大事记等记录用作任何商业、统计或其他分析用途。',
      showCancel: false
    });
  },

  // 拦截默认 checkbox 点击以防双重触发
  none: function () {}
});
