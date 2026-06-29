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
  let successCount = 0;
  const errors = [];

  for (const item of records) {
    // 唯一标识：优先 id 字段，其次用 name（食材等场景）
    const rawId = item.id !== undefined ? item.id : item.name;
    const syncId = rawId !== undefined && rawId !== null ? String(rawId) : null;

    try {
      if (syncId) {
        // 查询是否已存在同步记录
        const existing = await db.collection(collection).where({
          family_id: familyId,
          sync_id: syncId
        }).limit(1).get();

        if (existing.data && existing.data.length > 0) {
          await db.collection(collection).doc(existing.data[0]._id).update({
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
  }

  return {
    success: errors.length === 0,
    count: successCount,
    errors: errors.length > 0 ? errors : undefined
  };
};
