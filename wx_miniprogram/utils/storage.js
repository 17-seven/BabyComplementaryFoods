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
 * 写入本地同步缓存，并触发静默云端同步
 */
function setStorage(key, value) {
  try {
    wx.setStorageSync(key, value);
    // 触发自动静默云同步
    triggerAutoCloudSync(key, value);
  } catch (e) {
    console.error("写入微信缓存失败", e);
  }
}

/**
 * 自动静默云同步：通过 syncData 云函数（管理员权限）批量 upsert，彻底绕过客户端安全规则
 */
function triggerAutoCloudSync(key, data) {
  const familyId = wx.getStorageSync('user_family_id');
  if (!familyId) return; // 未开启家庭协同，跳过

  // 本地缓存键 → 云集合名称映射（含食材、周计划等全量业务集合）
  const KEY_TO_COLLECTION = {
    'bowel_records':        'bowel_records',
    'milk_water_records':   'milk_water_records',
    'eyepatch_records':     'eyepatch_records',
    'baby_timeline_events': 'timeline_events',
    'baby_vaccines_list':   'vaccines',
    'baby_healthcares':     'healthcares',
    'baby_clinical_logs':   'clinical_logs',
    'mp_safe_foods_list':   'safe_foods',
    'mp_risk_foods_list':   'risk_foods',
    'baby_week_plans':      'meal_plans',
    'baby_assessments':     'assessments'
  };

  const collName = KEY_TO_COLLECTION[key];
  if (!collName || !Array.isArray(data) || data.length === 0) return;

  try {
    wx.cloud.callFunction({
      name: 'syncData',
      data: { collection: collName, familyId: familyId, records: data },
      fail: (err) => {
        console.warn('[syncData] 静默云同步失败，本地数据已保存:', err.errMsg || err);
      }
    });
  } catch (e) {
    console.warn('[triggerAutoCloudSync] 云函数调用异常:', e);
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
