// utils/storage.js

/**
 * 读取本地缓存，若不存在则返回默认值
 */
function getStorage(key, defaultValue) {
  try {
    const val = wx.getStorageSync(key);
    if (val === undefined || val === '' || val === null) {
      return defaultValue;
    }
    return val;
  } catch (e) {
    console.error("读取微信缓存失败", e);
    return defaultValue;
  }
}

/**
 * 写入本地同步缓存
 */
function setStorage(key, value) {
  try {
    wx.setStorageSync(key, value);
  } catch (e) {
    console.error("写入微信缓存失败", e);
  }
}

/**
 * 获取今日 ISO 日期格式 (YYYY-MM-DD)
 */
function getTodayString() {
  const d = new Date();
  const year = d.getFullYear();
  let month = d.getMonth() + 1;
  let day = d.getDate();
  if (month < 10) month = '0' + month;
  if (day < 10) day = '0' + day;
  return `${year}-${month}-${day}`;
}

module.exports = {
  getStorage,
  setStorage,
  today: getTodayString
};
