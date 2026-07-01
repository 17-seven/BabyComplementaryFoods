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

    const that = this;
    wx.login({
      success: (loginRes) => {
        if (loginRes.code) {
          const request = require('../../utils/request.js');
          const oldInfo = getStorage('user_info', {});
          request.post('/auth/login', {
            code: loginRes.code,
            nickname: oldInfo.nickName || '',
            avatarUrl: oldInfo.avatarUrl || ''
          }).then(res => {
            wx.hideLoading();
            if (res.code === 200) {
              const data = res.data;
              wx.setStorageSync('access_token', data.accessToken);
              wx.setStorageSync('refresh_token', data.refreshToken);
              wx.setStorageSync('user_openid', data.user.openid);
              
              if (data.familyId) {
                wx.setStorageSync('user_family_id', data.familyId);
              } else {
                wx.removeStorageSync('user_family_id');
              }
              if (data.babyId) {
                wx.setStorageSync('baby_id', data.babyId);
                const app = getApp();
                if (app) app.globalData.babyId = data.babyId;
              } else {
                wx.removeStorageSync('baby_id');
              }

              that.proceedLoginWithOpenid(data.user.openid, data.familyRecord, data.businessData || {});
            } else {
              wx.showModal({ title: '登录失败', content: res.message || '未知错误', showCancel: false });
            }
          }).catch(err => {
            wx.hideLoading();
            wx.showModal({
              title: '登录异常',
              content: err.message || '服务器连接失败',
              showCancel: false
            });
          });
        } else {
          wx.hideLoading();
          wx.showToast({ title: '获取微信Code失败', icon: 'error' });
        }
      },
      fail: (err) => {
        wx.hideLoading();
        wx.showModal({ title: '微信登录调用失败', content: err.errMsg, showCancel: false });
      }
    });
  },

  // 使用云函数已返回的 familyRecord 直接恢复数据，彻底规避客户端查库权限问题
  proceedLoginWithOpenid: function (openid, familyRecord, businessData) {
    const app = getApp();
    if (app) {
      app.globalData.openid = openid;
    }
    wx.setStorageSync('user_openid', openid);

    // 确定当前登录用户是否为该家庭组的创建者
    let isCreator = false;
    let cloudUserInfo = null;

    if (familyRecord) {
      const creatorOpenid = familyRecord.creator_openid || familyRecord._openid || (familyRecord.members && familyRecord.members[0]);
      isCreator = (openid === creatorOpenid);

      if (isCreator) {
        if (familyRecord.creator_nickname) {
          cloudUserInfo = {
            nickName: familyRecord.creator_nickname,
            avatarUrl: familyRecord.creator_avatar || '/assets/avatar_default.png'
          };
        }
      } else if (familyRecord.members_info) {
        // 如果是普通协同看护人，从 members_info 数组中查找属于自己的信息
        const myInfo = familyRecord.members_info.find(m => m.openid === openid);
        if (myInfo && myInfo.nickName) {
          cloudUserInfo = {
            nickName: myInfo.nickName,
            avatarUrl: myInfo.avatarUrl || '/assets/avatar_default.png'
          };
        }
      }
    }

    if (familyRecord && cloudUserInfo && cloudUserInfo.nickName) {
      // 成功从云端家庭组记录中恢复属于当前用户的独立个人信息（创建者或看护人）
      const userInfo = cloudUserInfo;
      setStorage('user_info', userInfo);
      wx.setStorageSync('user_is_logged_in', true);
      wx.setStorageSync('user_family_id', familyRecord._id);

      const babyProfile = {
        name: familyRecord.baby_name || '宝宝',
        birthDate: familyRecord.birth_date || '',
        isPremature: !!familyRecord.due_date,
        dueDate: familyRecord.due_date || '',
        prematureDays: familyRecord.premature_days || 0,
        prematureDesc: familyRecord.premature_desc || ''
      };
      wx.setStorageSync('baby_profile_info', babyProfile);
      if (familyRecord.baby_avatar) {
        wx.setStorageSync('baby_custom_avatar', familyRecord.baby_avatar);
      }
      if (familyRecord.album_photos) {
        wx.setStorageSync('baby_album_photos', familyRecord.album_photos);
      }
      // 恢复自定义计时模块配置
      if (familyRecord.timer_items && familyRecord.timer_items.length > 0) {
        wx.setStorageSync('vision_timer_items', familyRecord.timer_items);
      }
      // 恢复自定义大事记分类配置
      if (familyRecord.timeline_categories && familyRecord.timeline_categories.length > 0) {
        wx.setStorageSync('timeline_categories', familyRecord.timeline_categories);
      }
      // 恢复辅食备注
      if (familyRecord.meal_day_notes && Object.keys(familyRecord.meal_day_notes).length > 0) {
        wx.setStorageSync('meal_day_notes', familyRecord.meal_day_notes);
      }

      // 把云函数一次性返回的业务数据直接写入本地 Storage
      const CLOUD_TO_LOCAL = {
        'timeline_events':    'baby_timeline_events',
        'vaccines':           'baby_vaccines_list',
        'healthcares':        'baby_healthcares',
        'assessments':        'baby_assessments',
        'clinical_logs':      'baby_clinical_logs',
        'safe_foods':         'mp_safe_foods_list',
        'risk_foods':         'mp_risk_foods_list',
        'meal_plans':         'baby_week_plans',
        'bowel_records':      'bowel_records',
        'milk_water_records': 'milk_water_records',
        'eyepatch_records':   'eyepatch_records',
        'growth':             'baby_growth_records',
        'class_customers':    'class_customers'
      };
      Object.entries(CLOUD_TO_LOCAL).forEach(function(entry) {
        const collName = entry[0], localKey = entry[1];
        if (businessData[collName]) {
          wx.setStorageSync(localKey, businessData[collName]);
          console.log('[数据恢复]', collName, businessData[collName].length, '条 ->', localKey);
          
          if (collName === 'meal_plans' && businessData[collName].length > 0) {
            wx.setStorageSync('meal_plan_auto_generated', true);
          }
          if ((collName === 'safe_foods' || collName === 'risk_foods') && businessData[collName].length > 0) {
            wx.setStorageSync('allergen_setup_completed', true);
          }
        }
      });

      // 恢复多机构上课打卡明细
      if (businessData['classes']) {
        const classesGrouped = {};
        businessData['classes'].forEach(item => {
          const instId = item.institution_id || 'spring_rain';
          if (!classesGrouped[instId]) {
            classesGrouped[instId] = [];
          }
          // 去除在同步上传时产生的辅助冗余字段
          const cleanItem = { ...item };
          delete cleanItem.institution_id;
          classesGrouped[instId].push(cleanItem);
        });
        
        Object.entries(classesGrouped).forEach(([instId, list]) => {
          wx.setStorageSync(`class_records_${instId}`, list);
          console.log('[数据恢复] classes ->', `class_records_${instId}`, list.length, '条');
        });
      }

      if (app) {
        app.globalData.userInfo = userInfo;
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
      // 新用户或云端无昵称记录：走本地缓存兜底，最终弹填资料抽屉
      wx.hideLoading();
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

    const finishSubmit = (cloudUrl) => {
      // 构造完整的登录看护人信息
      const userInfo = {
        nickName: nickname,
        avatarUrl: cloudUrl || avatar || '/assets/avatar_default.png'
      };
      setStorage('user_info', userInfo);
      wx.setStorageSync('user_is_logged_in', true);

      const app = getApp();
      if (app) {
        app.globalData.userInfo = userInfo;
      }

      // 实时同步更新至自建服务器备份里
      const familyId = wx.getStorageSync('user_family_id');
      if (familyId) {
        const request = require('../../utils/request.js');
        request.post('/family/update-action', {
          action: 'update',
          familyId: familyId,
          data: {
            creator_nickname: nickname,
            creator_avatar: cloudUrl || avatar || '/assets/avatar_default.png'
          }
        }).catch((err) => {
          console.warn('同步昵称至自建后端失败（本地已保存）:', err);
        });
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
    };

    // 迁移自建后端后，本地临时头像不再自动上传云端，待接入COS/OSS服务后再行配置。本地调试暂直接以本地临时路径为准进行缓存
    finishSubmit(null);
  },

  /**
   * 数据已由 login 云函数在登录时一并返回并写入 Storage，此方法保留备用
   */
  restoreCloudDataToLocal: function (familyId) {
    console.log('[restoreCloudDataToLocal] 数据已由云函数完成恢复, familyId =', familyId);
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
