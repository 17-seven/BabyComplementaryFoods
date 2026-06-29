// cloudfunctions/login/index.js
const cloud = require('wx-server-sdk');

// 初始化云函数
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

/**
 * 获取用户的 OpenID
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();

  return {
    event,
    openid: wxContext.OPENID,
    appid: wxContext.APPID,
    unionid: wxContext.UNIONID,
    env: wxContext.ENV
  };
};
