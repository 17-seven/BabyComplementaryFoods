// app.js
App({
  onLaunch: function () {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云端开发能力');
    } else {
      wx.cloud.init({
        // env 指定您的环境 ID，如果不传，默认使用第一个创建的云环境
        env: '', 
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
