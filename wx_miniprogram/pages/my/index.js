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
    correctedAge: ""
  },

  onShow: function () {
    const ageInfo = calculateBabyAge(this.data.babyInfo.birthDate, 71);
    this.setData({
      actualAge: ageInfo.actualAge,
      correctedAge: ageInfo.correctedAge
    });
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
  }
});
