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
 * 自动静默云同步逻辑
 */
function triggerAutoCloudSync(key, data) {
  const familyId = wx.getStorageSync('user_family_id');
  if (!familyId) return; // 未开启家庭协同，不进行自动上传

  try {
    const db = wx.cloud.database();
    
    // 本地缓存键与云集合名称映射
    const collections = {
      'bowel_records': 'bowel_records',
      'milk_water_records': 'milk_water_records',
      'eyepatch_records': 'eyepatch_records',
      'baby_timeline_events': 'timeline_events',
      'baby_vaccines_list': 'vaccines',
      'baby_healthcares': 'healthcares',
      'baby_clinical_logs': 'clinical_logs'
    };

    const collName = collections[key];
    if (!collName) return;

    if (Array.isArray(data)) {
      // 遍历更新单条记录
      data.forEach(item => {
        const syncId = item.id || item.name; // 依据 id 或 疫苗名称 识别唯一性
        if (!syncId) return;

        db.collection(collName).where({
          family_id: familyId,
          sync_id: syncId
        }).get({
          success: (res) => {
            if (res.data.length > 0) {
              // 已存在记录，执行更新
              db.collection(collName).doc(res.data[0]._id).update({
                data: {
                  ...item,
                  sync_time: new Date()
                }
              });
            } else {
              // 新增记录，包含家庭ID和唯一标示
              db.collection(collName).add({
                data: {
                  ...item,
                  family_id: familyId,
                  sync_id: syncId,
                  sync_time: new Date()
                }
              });
            }
          },
          fail: (err) => {
            console.error("云端条件查询失败", err);
          }
        });
      });
    }
  } catch (e) {
    // 捕获可能未开通云开发或在测试环境下未配置云环境的报错，保证系统正常离线运行
    console.warn("微信云能力尚未开启，已自动跳过静默云同步", e);
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
