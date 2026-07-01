# 小程序对接及网络请求封装设计 (Miniprogram Integration)

为了将“围兜日记”小程序从原先的微信云开发（`wx.cloud`）平滑迁移到自建 Node.js API，我们需要在小程序前端重新封装一套安全、健壮的网络请求库，支持 **JWT Token 自动携带** 与 **Token 过期无感刷新 (Silent Refresh)**。

---

## 一、 网络请求库封装 (`utils/request.js`)

在项目 `utils` 文件夹下创建 `request.js`，基于 `wx.request` 封装 Promise 风格的 API。

### 1. 核心封装思路
* **基准路径**：统一配置 `BASE_URL`。
* **拦截器**：
  * **请求拦截**：发送时自动从 Storage 中取出 `accessToken`，添加在 HTTP Headers 的 `Authorization` 中。
  * **响应拦截**：检查状态码。如果返回 **401 (Unauthorized)**，说明 Access Token 已过期，自动启动 Token 无感刷新机制，将在此期间产生的其他并发请求挂起并排入队列，待刷新成功后重新发起，避免用户闪退或被迫重新登录。

### 2. 完整代码实现 (`utils/request.js`)

```javascript
// utils/request.js

const BASE_URL = 'https://api.yourdomain.com/api'; // 自建服务器生产域名/测试域名

let isRefreshing = false; // 是否正在刷新 Token 的锁
let subscribers = [];     // 401并发请求挂起队列

// 队列操作：将待重试的请求排队
function addSubscriber(callback) {
  subscribers.push(callback);
}

// 刷新成功后，重试队列中的所有请求并清空队列
function onAccessTokenRefreshed(newAccessToken) {
  subscribers.forEach((callback) => callback(newAccessToken));
  subscribers = [];
}

/**
 * 核心网络请求主函数
 * @param {Object} options 微信请求配置
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

        // 2. 核心拦截：AccessToken 过期 (401 拦截)
        if (statusCode === 401) {
          const refreshToken = wx.getStorageSync('refresh_token');
          
          // 如果根本没有 refreshToken，直接跳转到登录页
          if (!refreshToken) {
            handleAuthError();
            reject(new Error('未登录或登录态已失效'));
            return;
          }

          // 开启无感刷新流程
          if (!isRefreshing) {
            isRefreshing = true;
            
            // 静默向服务端请求刷新 Token
            refreshTokens(refreshToken).then(newTokens => {
              isRefreshing = false;
              // 保存新 Token
              wx.setStorageSync('access_token', newTokens.accessToken);
              wx.setStorageSync('refresh_token', newTokens.refreshToken);
              
              // 触发队列中的请求重新发起
              onAccessTokenRefreshed(newTokens.accessToken);
            }).catch(err => {
              isRefreshing = false;
              handleAuthError();
              reject(err);
            });
          }

          // 将当前因为 401 失败的请求封装成 Promise 挂起，排队等待 Token 刷新成功后重新调用
          const retryOriginalRequest = new Promise((resolveRetry) => {
            addSubscriber((newAccessToken) => {
              // 重新组装 Headers 发起请求
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

        // 3. 其它系统或业务错误 (如 400, 403, 500 等)
        reject(responseBody || new Error(`HTTP 错误码: ${statusCode}`));
      },
      fail: (err) => {
        wx.showToast({ title: '网络连接异常', icon: 'error' });
        reject(err);
      }
    });
  });
}

/**
 * 刷新 Token 接口请求
 */
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
          reject(new Error('刷新 Token 失败'));
        }
      },
      fail: (err) => reject(err)
    });
  });
}

/**
 * 清除本地失效 Token 并强制拉回登录页面
 */
function handleAuthError() {
  wx.removeStorageSync('access_token');
  wx.removeStorageSync('refresh_token');
  wx.removeStorageSync('user_is_logged_in');
  
  wx.showModal({
    title: '登录失效',
    content: '您的登录信息已过期，请重新登录。',
    showCancel: false,
    success: () => {
      wx.reLaunch({
        url: '/pages/login/index'
      });
    }
  });
}

// 暴露出快捷 GET/POST 方法，方便前端快速调用
module.exports = {
  request,
  get: (url, data = {}, headers = {}) => request({ url, method: 'GET', data, headers }),
  post: (url, data = {}, headers = {}) => request({ url, method: 'POST', data, headers }),
  put: (url, data = {}, headers = {}) => request({ url, method: 'PUT', data, headers }),
  delete: (url, data = {}, headers = {}) => request({ url, method: 'DELETE', data, headers }),
  BASE_URL
};
```

---

## 二、 前端业务代码改写指南 (Migration Guide)

前端迁移的关键，是将原先的 `wx.cloud.callFunction` 及 `wx.cloud.database()` 查询替换为上述编写的 `request` 方法。

### 1. 微信登录授权改写对比
* **迁移前 (微信云开发)**：
```javascript
// app.js 或 login/index.js
wx.cloud.callFunction({
  name: 'login',
  success: res => {
    this.globalData.openid = res.result.openid;
    // 直接进入系统
  }
});
```
* **迁移后 (自建 Node.js 服务端)**：
```javascript
// login/index.js
const request = require('../../utils/request.js');

wx.login({
  success: (res) => {
    if (res.code) {
      wx.showLoading({ title: '正在登录...' });
      
      // 提交 code 换取长短 Token 
      request.post('/auth/login', {
        code: res.code,
        nickname: this.data.userInfo.nickName || '',
        avatarUrl: this.data.userInfo.avatarUrl || ''
      }).then(res => {
        wx.hideLoading();
        if (res.code === 200) {
          // 缓存双 Token 
          wx.setStorageSync('access_token', res.data.accessToken);
          wx.setStorageSync('refresh_token', res.data.refreshToken);
          wx.setStorageSync('user_is_logged_in', true);
          wx.setStorageSync('user_family_id', res.data.familyId);
          wx.setStorageSync('baby_id', res.data.babyId);
          
          wx.switchTab({ url: '/pages/dashboard/index' });
        }
      }).catch(err => {
        wx.hideLoading();
        wx.showModal({ title: '登录失败', content: err.message || '未知错误', showCancel: false });
      });
    }
  }
});
```

---

### 2. 增量数据同步接口替换
* **原逻辑**：在 `utils/storage.js` 的 `syncPull` 和 `triggerAutoCloudSync` 中直接调用 `wx.cloud.callFunction({ name: 'syncData' })`。
* **新逻辑**：将数据上传由云函数映射为 API 交互。
```javascript
// utils/storage.js 改写片段
const request = require('./request.js');

function triggerAutoCloudSync(key, data) {
  const familyId = wx.getStorageSync('user_family_id');
  if (!familyId) return;

  const keyToCollection = {
    'bowel_records': 'bowel_records',
    'milk_water_records': 'milk_water_records'
    // ... 其他表映射
  };

  const collName = keyToCollection[key];
  if (!collName || !Array.isArray(data)) return;

  // 调用自建后台的增量推送同步 API 
  request.post('/sync/push', {
    familyId: familyId,
    collection: collName,
    records: data
  }).then(res => {
    console.log('[Sync] 云端同步成功，保存条数:', res.data.successCount);
  }).catch(err => {
    console.warn('[Sync] 云同步失败，本地已离线暂存:', err);
  });
}
```
通过以上请求库和调用逻辑的改写，微信小程序的迁移即可无缝落地。
