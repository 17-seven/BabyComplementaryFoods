// 全局拦截并包装 Page 构造器，使小程序所有页面一劳永逸自动支持分享给好友和朋友圈
const originalPage = Page;
Page = function (pageConfig) {
  // 全局默认分享给好友（发送给朋友）
  if (!pageConfig.onShareAppMessage) {
    pageConfig.onShareAppMessage = function () {
      return {
        title: '萌萌辅食日记 - 宝宝辅食排敏与健康助手 🍼',
        path: '/pages/dashboard/index'
      };
    };
  }
  // 全局默认分享到朋友圈
  if (!pageConfig.onShareTimeline) {
    pageConfig.onShareTimeline = function () {
      return {
        title: '萌萌辅食日记 - 宝宝辅食排敏与健康助手 🍼',
        query: 'from=timeline'
      };
    };
  }
  return originalPage(pageConfig);
};

// app.js
App({
  onLaunch: function () {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云端开发能力');
    } else {
      wx.cloud.init({
        // 显式指定云开发环境 ID，确保多端及真机测试时准确指向真实云后台
        env: 'cloudbase-d2gnb0gxs0bc55eb6', 
        traceUser: true
      });
    }

    // 从本地缓存预载用户登录身份
    const userInfo = wx.getStorageSync('user_info') || null;
    const openid = wx.getStorageSync('user_openid') || '';

    this.globalData = {
      babyId: 'default_baby_id',
      openid: openid,
      userInfo: userInfo
    };
  }
});
