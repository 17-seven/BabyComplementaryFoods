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
    let cleanValue = value;
    if (Array.isArray(value)) {
      // 自动进行本地去重防重复数据
      const seen = new Set();
      cleanValue = value.filter(item => {
        const id = item.id !== undefined ? item.id : item.name;
        if (id === undefined || id === null || id === '') return true;
        const idStr = String(id);
        if (seen.has(idStr)) return false;
        seen.add(idStr);
        return true;
      });
    }
    wx.setStorageSync(key, cleanValue);
    // 触发自动静默云同步
    triggerAutoCloudSync(key, cleanValue);
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
    'baby_assessments':     'assessments',
    'baby_growth_records':  'growth',
    'class_customers':      'class_customers',
    'baby_sleep_records':   'sleep_records'
  };

  let collName = KEY_TO_COLLECTION[key];
  let syncDataArray = data;

  // 针对 class_records_ 开头的动态键（多机构打卡记录）做特殊云同步识别
  if (!collName && typeof key === 'string' && key.startsWith('class_records_')) {
    collName = 'classes';
    const instId = key.replace('class_records_', '');
    // 附加机构 ID 到每条记录中以作云端区分
    syncDataArray = data.map(item => ({ ...item, institution_id: instId }));
  }

  if (!collName || !Array.isArray(syncDataArray)) return;

  try {
    const request = require('./request.js');
    request.post('/sync/push', {
      familyId: familyId,
      collection: collName,
      records: syncDataArray
    }).catch(err => {
      console.warn('[syncData] 静默云同步失败，本地数据已保存:', err.message || err);
    });
  } catch (e) {
    console.warn('[triggerAutoCloudSync] 请求发送异常:', e);
  }
}

/**
 * 从云端拉取最新数据覆盖本地缓存（家庭组协同成员实时更新专用）
 */
/**
 * 从云端拉取最新数据覆盖本地缓存（家庭组协同成员实时更新专用）
 * @param {string|string[]|Function} [targetCollections] 需要同步的云端业务集合名，不传则默认拉取全部
 * @param {Function} [onSuccess] 成功回调
 */
function syncPull(targetCollections, onSuccess) {
  const familyId = wx.getStorageSync('user_family_id');
  if (!familyId) {
    if (typeof targetCollections === 'function') targetCollections();
    else if (onSuccess) onSuccess();
    return;
  }

  let callback = onSuccess;
  let collections = null;
  if (typeof targetCollections === 'function') {
    callback = targetCollections;
  } else if (typeof targetCollections === 'string') {
    collections = [targetCollections];
  } else if (Array.isArray(targetCollections)) {
    collections = targetCollections;
  }

  const request = require('./request.js');
  request.post('/sync/pull', {
    familyId: familyId,
    collections: collections || []
  }).then((res) => {
    if (res.code === 200 && res.data && res.data.familyRecord) {
      const familyRecord = res.data.familyRecord;
      const businessData = res.data.businessData || {};

      // 1. 只有在全量同步（未指定 collections）时才更新宝宝档案、头像、大事记分类等基础属性
      if (!collections) {
        const babyProfile = {
          name: familyRecord.baby_name || '宝宝',
          birthDate: familyRecord.birth_date || '',
          isPremature: !!familyRecord.due_date,
          dueDate: familyRecord.due_date || '',
          prematureDays: familyRecord.premature_days || 0,
          prematureDesc: familyRecord.premature_desc || ''
        };
        wx.setStorageSync('baby_profile_info', babyProfile);
        
        if (familyRecord.baby_avatar) {
          wx.setStorageSync('baby_custom_avatar', familyRecord.baby_avatar);
        }
        if (familyRecord.album_photos) {
          wx.setStorageSync('baby_album_photos', familyRecord.album_photos);
        }
        if (familyRecord.timer_items) {
          wx.setStorageSync('vision_timer_items', familyRecord.timer_items);
        }
        if (familyRecord.timeline_categories) {
          wx.setStorageSync('timeline_categories', familyRecord.timeline_categories);
        }
        if (familyRecord.meal_day_notes) {
          wx.setStorageSync('meal_day_notes', familyRecord.meal_day_notes);
        }
      } else {
        // 局部更新时也同步 timeline_categories
        if (collections.includes('timeline_events') && familyRecord.timeline_categories) {
          wx.setStorageSync('timeline_categories', familyRecord.timeline_categories);
        }
        // 局部更新时也同步 meal_day_notes
        if (collections.includes('meal_plans') && familyRecord.meal_day_notes) {
          wx.setStorageSync('meal_day_notes', familyRecord.meal_day_notes);
        }
      }

      // 2. 覆盖写入业务数据列表
      const CLOUD_TO_LOCAL = {
        'timeline_events':    'baby_timeline_events',
        'vaccines':           'baby_vaccines_list',
        'healthcares':        'baby_healthcares',
        'assessments':        'baby_assessments',
        'clinical_logs':      'baby_clinical_logs',
        'safe_foods':         'mp_safe_foods_list',
        'risk_foods':         'mp_risk_foods_list',
        'meal_plans':         'baby_week_plans',
        'bowel_records':      'bowel_records',
        'milk_water_records': 'milk_water_records',
        'eyepatch_records':   'eyepatch_records',
        'growth':             'baby_growth_records',
        'class_customers':    'class_customers',
        'sleep_records':      'baby_sleep_records'
      };

      Object.entries(CLOUD_TO_LOCAL).forEach(([collName, localKey]) => {
        // 仅在全量拉取或者该集合在指定的拉取范围中时覆盖更新
        if (!collections || collections.includes(collName)) {
          if (businessData[collName]) {
            wx.setStorageSync(localKey, businessData[collName]);
          }
        }
      });

      // 3. 处理 classes 多机构上课明细数据（仅在全量拉取或者拉取范围中包含 classes 时）
      if (!collections || collections.includes('classes')) {
        if (businessData['classes']) {
          // 清空本地原有的 class_records_ 缓存
          try {
            const info = wx.getStorageInfoSync();
            info.keys.forEach(k => {
              if (k.startsWith('class_records_')) {
                wx.removeStorageSync(k);
              }
            });
          } catch (e) {
            console.error('清空上课记录本地缓存异常', e);
          }

          const classesGrouped = {};
          businessData['classes'].forEach(item => {
            const instId = item.institution_id || 'spring_rain';
            if (!classesGrouped[instId]) {
              classesGrouped[instId] = [];
            }
            const cleanItem = { ...item };
            delete cleanItem.institution_id;
            classesGrouped[instId].push(cleanItem);
          });

          Object.entries(classesGrouped).forEach(([instId, list]) => {
            wx.setStorageSync(`class_records_${instId}`, list);
          });
        }
      }
    } else {
      // 如果本地有绑定的家庭组ID，但自建后台 pull 返回无此家庭组，说明已被管理员移出或家庭组已解散！
      const localFamilyId = wx.getStorageSync('user_family_id');
      if (localFamilyId) {
        wx.setStorageSync('user_family_id', '');
        wx.showModal({
          title: '协同共享已断开',
          content: '您已被管理员移出该家庭组，或该家庭组已解散。已自动切换回本地单机模式。',
          showCancel: false,
          success: () => {
            // 自动刷新当前页面以清除云端数据渲染
            const pages = getCurrentPages();
            if (pages.length > 0) {
              const currentPage = pages[pages.length - 1];
              if (currentPage && typeof currentPage.onShow === 'function') {
                currentPage.onShow();
              }
            }
          }
        });
      }
    }
    if (callback) callback();
  }).catch((err) => {
    console.warn('[syncPull] 自动拉取数据失败，采用本地数据:', err.message || err);
    if (callback) callback();
  });
}

/**
 * 绑定家庭组时的双向数据全量合并（防丢数据与错乱）
 */
function syncMerge(familyId, onSuccess) {
  if (!familyId) {
    if (onSuccess) onSuccess();
    return;
  }

  wx.showLoading({ title: '正在合并数据...', mask: true });

  const request = require('./request.js');
  request.post('/sync/pull', {
    familyId: familyId
  }).then((res) => {
    if (res.code !== 200 || !res.data || !res.data.familyRecord) {
      wx.hideLoading();
      if (onSuccess) onSuccess();
      return;
    }
    const familyRecord = res.data.familyRecord;
    const businessData = res.data.businessData || {};

    const CLOUD_TO_LOCAL = {
      'timeline_events':    'baby_timeline_events',
      'vaccines':           'baby_vaccines_list',
      'healthcares':        'baby_healthcares',
      'assessments':        'baby_assessments',
      'clinical_logs':      'baby_clinical_logs',
      'safe_foods':         'mp_safe_foods_list',
      'risk_foods':         'mp_risk_foods_list',
      'meal_plans':         'baby_week_plans',
      'bowel_records':      'bowel_records',
      'milk_water_records': 'milk_water_records',
      'eyepatch_records':   'eyepatch_records',
      'growth':             'baby_growth_records',
      'class_customers':    'class_customers',
      'sleep_records':      'baby_sleep_records'
    };

    const keysToSync = [];

    // 1. 合并标准业务数据
    Object.entries(CLOUD_TO_LOCAL).forEach(([collName, localKey]) => {
      const localData = wx.getStorageSync(localKey) || [];
      const cloudData = businessData[collName] || [];

      let mergedData;
      if (collName === 'safe_foods' || collName === 'risk_foods') {
        mergedData = mergeArrays(localData, cloudData, 'name');
      } else {
        mergedData = mergeArrays(localData, cloudData, 'id');
      }

      // 保存合并后的数据到本地
      wx.setStorageSync(localKey, mergedData);
      keysToSync.push({ key: localKey, data: mergedData });
    });

    // 2. 合并 classes
    let localClassKeys = [];
    try {
      const info = wx.getStorageInfoSync();
      localClassKeys = info.keys.filter(k => k.startsWith('class_records_'));
    } catch (e) {
      console.error('获取 LocalStorage 键列表异常', e);
    }

    const cloudClasses = businessData['classes'] || [];
    const cloudClassGrouped = {};
    cloudClasses.forEach(item => {
      const instId = item.institution_id || 'spring_rain';
      if (!cloudClassGrouped[instId]) {
        cloudClassGrouped[instId] = [];
      }
      const cleanItem = { ...item };
      delete cleanItem.institution_id;
      cloudClassGrouped[instId].push(cleanItem);
    });

    const allInstIds = new Set([
      ...localClassKeys.map(k => k.replace('class_records_', '')),
      ...Object.keys(cloudClassGrouped)
    ]);

    allInstIds.forEach(instId => {
      const localKey = `class_records_${instId}`;
      const localData = wx.getStorageSync(localKey) || [];
      const cloudData = cloudClassGrouped[instId] || [];
      const mergedData = mergeArrays(localData, cloudData, 'id');

      wx.setStorageSync(localKey, mergedData);
      keysToSync.push({ key: localKey, data: mergedData });
    });

    // 3. 将合并后的本地数据批量上传，覆盖云端，确保两端一致
    const CLOUD_TO_LOCAL_REVERSE = {};
    Object.entries(CLOUD_TO_LOCAL).forEach(([k, v]) => {
      CLOUD_TO_LOCAL_REVERSE[v] = k;
    });

    const syncPromises = keysToSync.map(item => {
      return new Promise((resolve) => {
        let collName = CLOUD_TO_LOCAL_REVERSE[item.key];
        let syncDataArray = item.data;

        if (!collName && item.key.startsWith('class_records_')) {
          collName = 'classes';
          const instId = item.key.replace('class_records_', '');
          syncDataArray = item.data.map(x => ({ ...x, institution_id: instId }));
        }

        if (!collName || !Array.isArray(syncDataArray) || syncDataArray.length === 0) {
          resolve();
          return;
        }

        request.post('/sync/push', {
          familyId: familyId,
          collection: collName,
          records: syncDataArray
        }).then(() => resolve()).catch(err => {
          console.warn(`[syncMerge] 异步上传 ${collName} 失败:`, err.message || err);
          resolve();
        });
      });
    });

    Promise.all(syncPromises).then(() => {
      wx.hideLoading();
      if (onSuccess) onSuccess();
    }).catch(err => {
      wx.hideLoading();
      console.error('[syncMerge] 并行同步异常:', err);
      if (onSuccess) onSuccess();
    });
  }).catch((err) => {
    wx.hideLoading();
    console.error('[syncMerge] 拉取云端数据合并失败，力行降级并跳过合并:', err.message || err);
    if (onSuccess) onSuccess();
  });
}

/**
 * 通用数组去重合并算法
 */
function mergeArrays(localArr, cloudArr, keyName = 'id') {
  if (!Array.isArray(localArr)) return cloudArr || [];
  if (!Array.isArray(cloudArr)) return localArr || [];

  const mergedMap = new Map();

  // 1. 装载本地数据
  localArr.forEach(item => {
    const key = String(item[keyName] || item.name || '');
    if (key) mergedMap.set(key, item);
  });

  // 2. 用云端数据混合/重写，如果同一ID已存在，则合并字段且以云端优先（因为云端有其他家属的修改）
  cloudArr.forEach(item => {
    const key = String(item[keyName] || item.name || '');
    if (key) {
      if (mergedMap.has(key)) {
        const localItem = mergedMap.get(key);
        const mergedItem = { ...localItem, ...item };
        // 疫苗接种打卡状态特殊处理，任意一方"已接种"都保留"已接种"状态
        if (item.name && item.dose) {
          if (localItem.status === '已接种' || item.status === '已接种') {
            mergedItem.status = '已接种';
            mergedItem.actualDate = localItem.actualDate || item.actualDate;
          }
        }
        mergedMap.set(key, mergedItem);
      } else {
        mergedMap.set(key, item);
      }
    }
  });

  return Array.from(mergedMap.values());
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
  today: getTodayString,
  syncPull,
  syncMerge
};
