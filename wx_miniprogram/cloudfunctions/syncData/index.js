// cloudfunctions/syncData/index.js
// 统一处理业务数据集合的批量云端同步（绕过客户端安全规则）
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

/**
 * event 参数：
 *   - collection: string  目标集合名
 *   - familyId:   string  家庭组 ID
 *   - records:    array   要同步的数据数组
 */
exports.main = async (event, context) => {
  const { collection, familyId, records } = event;

  if (!collection || !familyId || !Array.isArray(records) || records.length === 0) {
    return { success: false, error: '参数缺失或 records 为空' };
  }

  const db = cloud.database();
  const _ = db.command;
  let successCount = 0;
  const errors = [];

  // 1. 同步物理删除：删除云端存在但客户端已删除的历史数据
  try {
    const activeSyncIds = records
      .map(item => {
        const rawId = item.id !== undefined ? item.id : item.name;
        return rawId !== undefined && rawId !== null ? String(rawId) : null;
      })
      .filter(Boolean);

    if (activeSyncIds.length > 0) {
      await db.collection(collection).where({
        family_id: familyId,
        sync_id: _.nin(activeSyncIds)
      }).remove();
    } else {
      // 客户端如果数据全删，则清空云端该家庭的对应记录
      await db.collection(collection).where({
        family_id: familyId
      }).remove();
    }
  } catch (err) {
    console.warn('[syncData] 同步物理删除失败:', err);
  }

  // 2. 一次性获取云端该家庭在该集合的所有记录，构建 sync_id -> _id 的映射，并剔除重复文档
  let existingMap = new Map();
  const duplicatesToDelete = [];
  try {
    // 考虑数据可能较多，云函数端一次性 get 限制为 1000 条，对种子数据同步完全足够
    const res = await db.collection(collection).where({
      family_id: familyId
    }).limit(1000).get();
    
    if (res.data) {
      for (const rec of res.data) {
        if (rec.sync_id) {
          const syncIdStr = String(rec.sync_id);
          if (existingMap.has(syncIdStr)) {
            // 发现重复文档，收集重复文档的 _id 以便清理
            duplicatesToDelete.push(rec._id);
          } else {
            existingMap.set(syncIdStr, rec._id);
          }
        }
      }
    }
  } catch (err) {
    console.warn('[syncData] 批量获取已有记录失败:', err);
  }

  // 3. 物理清理云端数据库中的重复记录
  if (duplicatesToDelete.length > 0) {
    try {
      const removePromises = duplicatesToDelete.map(docId => {
        return db.collection(collection).doc(docId).remove();
      });
      await Promise.all(removePromises);
      console.log(`[syncData] 成功物理清理了 ${duplicatesToDelete.length} 条重复数据`);
    } catch (cleanErr) {
      console.warn('[syncData] 清理重复记录失败:', cleanErr);
    }
  }

  // 3. 分批并行执行添加或更新操作，避免一次性并发过多请求导致底层数据库连接池阻塞
  const BATCH_SIZE = 20;
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const batchTasks = batch.map(async (item) => {
      const rawId = item.id !== undefined ? item.id : item.name;
      const syncId = rawId !== undefined && rawId !== null ? String(rawId) : null;

      try {
        if (syncId) {
          const existingDocId = existingMap.get(syncId);
          if (existingDocId) {
            await db.collection(collection).doc(existingDocId).update({
              data: { ...item, family_id: familyId, sync_id: syncId, sync_time: new Date() }
            });
          } else {
            await db.collection(collection).add({
              data: { ...item, family_id: familyId, sync_id: syncId, sync_time: new Date() }
            });
          }
        } else {
          // 无唯一标识，直接追加
          await db.collection(collection).add({
            data: { ...item, family_id: familyId, sync_time: new Date() }
          });
        }
        successCount++;
      } catch (e) {
        errors.push({ syncId, error: e.message || String(e) });
      }
    });

    // 等待当前批次完成，再进行下一批，确保平稳高效
    await Promise.all(batchTasks);
  }

  return {
    success: errors.length === 0,
    count: successCount,
    errors: errors.length > 0 ? errors : undefined
  };
};
