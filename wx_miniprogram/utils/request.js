// utils/request.js
const BASE_URL = 'http://127.0.0.1:3000/api'; // 本地自建开发服务器接口基准地址

let isRefreshing = false; // 并发刷新 Token 状态锁
let subscribers = [];     // 被挂起的 401 请求等待队列

function addSubscriber(callback) {
  subscribers.push(callback);
}

function onAccessTokenRefreshed(newAccessToken) {
  subscribers.forEach((callback) => callback(newAccessToken));
  subscribers = [];
}

/**
 * 统一网络请求核心封装
 * @param {Object} options 请求配置
 */
function request(options) {
  const { url, method = 'GET', data = {}, headers = {} } = options;

  // 请求拦截：动态注入 JWT Token
  const token = wx.getStorageSync('access_token');
  const authHeaders = {
    'Content-Type': 'application/json',
    ...headers
  };
  if (token) {
    authHeaders['Authorization'] = `Bearer ${token}`;
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url: url.startsWith('http') ? url : `${BASE_URL}${url}`,
      method,
      data,
      header: authHeaders,
      success: async (res) => {
        const { statusCode, data: responseBody } = res;

        // 1. 请求成功 (标准 200 OK)
        if (statusCode >= 200 && statusCode < 300) {
          resolve(responseBody);
          return;
        }

        // 2. 拦截并处理 401 Access Token 过期
        if (statusCode === 401) {
          const refreshToken = wx.getStorageSync('refresh_token');
          
          if (!refreshToken) {
            handleAuthError();
            reject(new Error('您已处于未登录状态，请先登录'));
            return;
          }

          // 开启无感 Token 刷新
          if (!isRefreshing) {
            isRefreshing = true;
            
            refreshTokens(refreshToken).then(newTokens => {
              isRefreshing = false;
              // 缓存刷新后的长短 Token
              wx.setStorageSync('access_token', newTokens.accessToken);
              wx.setStorageSync('refresh_token', newTokens.refreshToken);
              
              // 依次重试等待队列中的请求
              onAccessTokenRefreshed(newTokens.accessToken);
            }).catch(err => {
              isRefreshing = false;
              handleAuthError();
              reject(err);
            });
          }

          // 将当前请求排队挂起，包装成 Promise 并在 Token 刷新完成后触发 resolve
          const retryOriginalRequest = new Promise((resolveRetry) => {
            addSubscriber((newAccessToken) => {
              authHeaders['Authorization'] = `Bearer ${newAccessToken}`;
              wx.request({
                url: url.startsWith('http') ? url : `${BASE_URL}${url}`,
                method,
                data,
                header: authHeaders,
                success: (retryRes) => resolveRetry(retryRes.data),
                fail: (retryErr) => reject(retryErr)
              });
            });
          });
          
          resolve(retryOriginalRequest);
          return;
        }

        // 3. 拦截 4xx/5xx 等其它 API 接口报错，统一抛出
        reject(responseBody || new Error(`网络请求异常，错误码: ${statusCode}`));
      },
      fail: (err) => {
        wx.showToast({ title: '网络连接异常', icon: 'error' });
        reject(err);
      }
    });
  });
}

function refreshTokens(refreshToken) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${BASE_URL}/auth/refresh`,
      method: 'POST',
      data: { refreshToken },
      header: { 'Content-Type': 'application/json' },
      success: (res) => {
        if (res.statusCode === 200 && res.data.code === 200) {
          resolve(res.data.data);
        } else {
          reject(new Error('无感刷新 Token 失败'));
        }
      },
      fail: (err) => reject(err)
    });
  });
}

function handleAuthError() {
  wx.removeStorageSync('access_token');
  wx.removeStorageSync('refresh_token');
  wx.removeStorageSync('user_is_logged_in');
  
  wx.showModal({
    title: '登录态失效',
    content: '您的身份验证已过期，请重新微信授权登录。',
    showCancel: false,
    success: () => {
      wx.reLaunch({
        url: '/pages/login/index'
      });
    }
  });
}

module.exports = {
  request,
  get: (url, data = {}, headers = {}) => request({ url, method: 'GET', data, headers }),
  post: (url, data = {}, headers = {}) => request({ url, method: 'POST', data, headers }),
  put: (url, data = {}, headers = {}) => request({ url, method: 'PUT', data, headers }),
  delete: (url, data = {}, headers = {}) => request({ url, method: 'DELETE', data, headers }),
  BASE_URL
};
