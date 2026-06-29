// pages/baby/index.js
const { getStorage, setStorage } = require('../../utils/storage.js');

Page({
  data: {
    name: '',
    birthDate: '',
    isPremature: false,
    dueDate: '',          // 预产期
    prematureDays: 0,     // 自动计算的早产天数
    prematureDesc: ''     // 自动生成的描述（如 "29w+6 早产"）
  },

  onLoad: function () {
    this.loadBabyProfile();
  },

  loadBabyProfile: function () {
    // 读取宝宝的本地档案设置，新用户默认为空
    const profile = getStorage('baby_profile_info', null);

    if (profile) {
      this.setData({
        name: profile.name || '',
        birthDate: profile.birthDate || '',
        isPremature: profile.isPremature || false,
        dueDate: profile.dueDate || '',
        prematureDays: profile.prematureDays || 0,
        prematureDesc: profile.prematureDesc || ''
      });
    }
    // 如果 profile 为 null，说明新用户，保持默认空值
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
    const birthMs = new Date(this.data.birthDate).getTime();
    const dueMs = new Date(this.data.dueDate).getTime();

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

    if (openid && wx.cloud) {
      const cloudData = {
        baby_name: profile.name,
        birth_date: profile.birthDate,
        due_date: profile.dueDate,
        premature_days: profile.prematureDays,
        premature_desc: profile.prematureDesc,
        baby_avatar: babyAvatar,
        creator_nickname: userInfo ? userInfo.nickName : '',
        creator_avatar: userInfo ? userInfo.avatarUrl : '/assets/avatar_default.png'
      };

      wx.cloud.callFunction({
        name: 'updateFamily',
        data: {
          action: familyId ? 'update' : 'create',
          familyId: familyId || null,
          data: cloudData
        },
        success: (res) => {
          if (res.result && res.result.success) {
            if (!familyId && res.result.familyId) {
              setStorage('user_family_id', res.result.familyId);
              console.log('云端创建家庭组成功，familyId:', res.result.familyId);
            } else {
              console.log('云端宝宝档案更新成功');
            }
          }
        },
        fail: (err) => {
          console.warn('updateFamily 云函数调用失败（本地已保存）:', err);
        }
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
