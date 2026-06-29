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

    this.globalData = {
      babyId: 'default_baby_id',
      openid: ''
    };
  }
});
