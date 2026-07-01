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
    // 微信小程序自建后端架构迁移：已弃用原有的 wx.cloud 云端开发依赖
    console.log('围兜日记：自建 Node.js 后端数据对接中...');

    // 从本地缓存预载用户登录身份
    const userInfo = wx.getStorageSync('user_info') || null;
    const openid = wx.getStorageSync('user_openid') || '';

    this.globalData = {
      babyId: wx.getStorageSync('baby_id') || 'default_baby_id',
      openid: openid,
      userInfo: userInfo
    };
  }
});
