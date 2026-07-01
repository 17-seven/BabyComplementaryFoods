// pages/baby/index.js
const { getStorage, setStorage, today } = require('../../utils/storage.js');

Page({
  data: {
    name: '',
    birthDate: '',
    isPremature: false,
    dueDate: '',
    prematureDays: 0,
    prematureDesc: ''
  },

  onLoad: function () {
    if (!wx.getStorageSync('user_is_logged_in') && !wx.getStorageSync('user_openid')) {
      wx.showModal({ title: '请先登录', content: '此功能需要登录才能使用。', confirmText: '去登录', cancelText: '返回',
        success: (res) => {
          if (res.confirm) wx.redirectTo({ url: '/pages/login/index' });
          else wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/dashboard/index' }) });
        }
      });
      return;
    }
    this.loadBabyProfile();
  },

  loadBabyProfile: function () {
    const profile = getStorage('baby_profile_info', null);
    if (profile) {
      this.setData({
        name: profile.name || '',
        birthDate: profile.birthDate || today(),
        isPremature: profile.isPremature || false,
        dueDate: profile.dueDate || '',
        prematureDays: profile.prematureDays || 0,
        prematureDesc: profile.prematureDesc || ''
      });
    } else {
      // 新用户默认出生日期为今天
      this.setData({ birthDate: today() });
    }
  },

  // 1. 通用输入框字段修改监听
  onFieldInput: function (e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [field]: e.detail.value });
  },

  // 2. 早产开关切换
  onPrematureChange: function (e) {
    const val = e.detail.value;
    if (!val) {
      // 关闭早产，清空预产期和计算结果
      this.setData({
        isPremature: false,
        dueDate: '',
        prematureDays: 0,
        prematureDesc: ''
      });
    } else {
      this.setData({ isPremature: true });
    }
  },

  // 3. 出生日期选择器修改
  onBirthDateChange: function (e) {
    this.setData({ birthDate: e.detail.value });
    // 如果已选了预产期，重新计算早产天数
    if (this.data.isPremature && this.data.dueDate) {
      this._calcPrematureDays();
    }
  },

  // 4. 预产期选择器修改
  onDueDateChange: function (e) {
    this.setData({ dueDate: e.detail.value });
    // 自动计算早产天数
    if (this.data.birthDate) {
      this._calcPrematureDays();
    }
  },

  // 5. 根据预产期和出生日期自动计算早产天数
  _calcPrematureDays: function () {
    const birthMs = new Date(this.data.birthDate.replace(/-/g, '/')).getTime();
    const dueMs = new Date(this.data.dueDate.replace(/-/g, '/')).getTime();

    if (isNaN(birthMs) || isNaN(dueMs)) return;

    // 早产天数 = 预产期 - 实际出生日期（正数表示早产）
    const diffDays = Math.round((dueMs - birthMs) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) {
      // 实际出生日期 >= 预产期，说明不是早产
      this.setData({
        prematureDays: 0,
        prematureDesc: '未早产（出生日期已达到或超过预产期）'
      });
      return;
    }

    // 根据早产天数推算实际孕周描述
    // 足月 = 40周 = 280天，实际孕周天数 = 280 - 早产天数
    const actualGestDays = 280 - diffDays;
    const weeks = Math.floor(actualGestDays / 7);
    const days = actualGestDays % 7;
    const desc = `${weeks}w+${days} 早产（提前 ${diffDays} 天出生）`;

    this.setData({
      prematureDays: diffDays,
      prematureDesc: desc
    });
  },

  // 6. 保存宝宝档案
  saveProfile: function () {
    const { name, birthDate, isPremature, dueDate, prematureDays, prematureDesc } = this.data;

    if (!name.trim()) {
      wx.showToast({ title: '请输入宝宝姓名', icon: 'none' });
      return;
    }

    if (!birthDate) {
      wx.showToast({ title: '请选择出生日期', icon: 'none' });
      return;
    }

    if (isPremature && !dueDate) {
      wx.showToast({ title: '请选择预产期', icon: 'none' });
      return;
    }

    const profile = {
      name: name.trim(),
      birthDate,
      isPremature,
      dueDate: isPremature ? dueDate : '',
      prematureDays: isPremature ? prematureDays : 0,
      prematureDesc: isPremature ? prematureDesc : ''
    };

    // A. 写入本地缓存
    setStorage('baby_profile_info', profile);

    // B. 通过云函数同步至云数据库（绕过客户端安全规则）
    const app = getApp();
    const openid = app.globalData.openid || wx.getStorageSync('user_openid');
    const familyId = getStorage('user_family_id', '');
    const babyAvatar = getStorage('baby_custom_avatar', '/assets/avatar_default.png');
    const userInfo = getStorage('user_info', null);
    if (openid) {
      const cloudData = {
        baby_name: profile.name,
        birth_date: profile.birthDate,
        due_date: profile.dueDate,
        premature_days: profile.prematureDays,
        premature_desc: profile.premature_desc,
        baby_avatar: babyAvatar,
        creator_nickname: userInfo ? userInfo.nickName : '',
        creator_avatar: userInfo ? userInfo.avatarUrl : '/assets/avatar_default.png'
      };

      const request = require('../../utils/request.js');
      request.post('/family/update-action', {
        action: familyId ? 'update' : 'create',
        familyId: familyId || null,
        data: cloudData
      }).then((res) => {
        if (res.code === 200 && res.data && res.data.success) {
          if (!familyId && res.data.familyId) {
            setStorage('user_family_id', res.data.familyId);
            console.log('自建后端创建家庭组成功，familyId:', res.data.familyId);
          } else {
            console.log('自建后端宝宝档案更新成功');
          }
        }
      }).catch((err) => {
        console.warn('自建后端更新家庭档案失败（本地已保存）:', err);
      });
    }
    wx.showToast({
      title: '档案保存成功',
      icon: 'success',
      success: () => {
        setTimeout(() => {
          wx.navigateBack();
        }, 1000);
      }
    });
  }
});
