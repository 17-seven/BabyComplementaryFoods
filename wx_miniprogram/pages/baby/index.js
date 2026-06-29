// pages/baby/index.js
const { getStorage, setStorage } = require('../../utils/storage.js');

Page({
  data: {
    name: '王珑初',
    birthDate: '2025-02-18',
    isPremature: true,
    prematureDays: 71,
    prematureDesc: '29w+6 早产'
  },

  onLoad: function () {
    this.loadBabyProfile();
  },

  loadBabyProfile: function () {
    // 读取宝宝的本地档案设置
    const defaultProfile = {
      name: '王珑初',
      birthDate: '2025-02-18',
      isPremature: true,
      prematureDays: 71,
      prematureDesc: '29w+6 早产'
    };

    const profile = getStorage('baby_profile_info', defaultProfile);
    this.setData({
      name: profile.name,
      birthDate: profile.birthDate,
      isPremature: profile.isPremature !== undefined ? profile.isPremature : true,
      prematureDays: profile.prematureDays !== undefined ? profile.prematureDays : 71,
      prematureDesc: profile.prematureDesc || '29w+6 早产'
    });
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
      prematureDays: val ? 71 : 0
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
      wx.showToast({ title: '姓名不能为空', icon: 'none' });
      return;
    }

    const profile = {
      name: name.trim(),
      birthDate,
      isPremature,
      prematureDays: isPremature ? parseInt(prematureDays) || 0 : 0,
      prematureDesc: isPremature ? prematureDesc.trim() : '无早产'
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
