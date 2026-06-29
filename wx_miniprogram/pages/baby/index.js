// pages/baby/index.js
const { getStorage, setStorage } = require('../../utils/storage.js');

Page({
  data: {
    name: '',
    birthDate: '',
    isPremature: false,
    prematureDays: 0,
    prematureDesc: ''
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
        prematureDays: profile.prematureDays || 0,
        prematureDesc: profile.prematureDesc || ''
      });
    }
    // 如果 profile 为 null，说明新用户，保持默认空值
  },

  // 1. 输入框字段修改监听
  onFieldInput: function (e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [field]: e.detail.value });
  },

  // 2. 早产开关切换
  onPrematureChange: function (e) {
    const val = e.detail.value;
    this.setData({
      isPremature: val,
      prematureDays: val ? this.data.prematureDays : 0
    });
  },

  // 3. 日期选择器修改
  onDateChange: function (e) {
    this.setData({ birthDate: e.detail.value });
  },

  // 4. 保存宝宝档案
  saveProfile: function () {
    const { name, birthDate, isPremature, prematureDays, prematureDesc } = this.data;

    if (!name.trim()) {
      wx.showToast({ title: '请输入宝宝姓名', icon: 'none' });
      return;
    }

    if (!birthDate) {
      wx.showToast({ title: '请选择出生日期', icon: 'none' });
      return;
    }

    const profile = {
      name: name.trim(),
      birthDate,
      isPremature,
      prematureDays: isPremature ? parseInt(prematureDays) || 0 : 0,
      prematureDesc: isPremature ? prematureDesc.trim() : ''
    };

    // A. 写入本地缓存
    setStorage('baby_profile_info', profile);

    // B. 若绑定了云端家庭组，同步至云端
    const familyId = getStorage('user_family_id', '');
    if (familyId) {
      try {
        const db = wx.cloud.database();
        db.collection('families').doc(familyId).update({
          data: {
            baby_name: profile.name,
            birth_date: profile.birthDate,
            premature_days: profile.prematureDays,
            premature_desc: profile.prematureDesc
          },
          success: () => {
            console.log("云端宝宝档案同步更新成功！");
          },
          fail: (err) => {
            console.warn("同步云端宝宝档案失败", err);
          }
        });
      } catch (e) {
        console.warn("云数据库未初始化，忽略云同步");
      }
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
