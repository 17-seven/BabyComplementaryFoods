// cloudfunctions/login/index.js
const cloud = require('wx-server-sdk');

// 初始化云函数（管理员权限，绕过安全规则）
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

// 业务集合 → 本地 Storage key 映射（云函数端使用集合名即可）
const BUSINESS_COLLECTIONS = [
  'timeline_events',
  'vaccines',
  'healthcares',
  'assessments',
  'clinical_logs',
  'safe_foods',
  'risk_foods',
  'meal_plans',
  'bowel_records',
  'milk_water_records',
  'eyepatch_records',
  'growth',
  'classes',
  'class_customers'
];

/**
 * 获取用户 OpenID，并顺带查询该用户所属的家庭组及所有业务数据
 * 云函数拥有管理员权限，可绕过数据库安全规则限制
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const db = cloud.database();

  // 1. 查询家庭组记录
  let familyRecord = null;
  try {
    // 先用 elemMatch 精确匹配数组元素
    let res = await db.collection('families').where({
      members: db.command.elemMatch(db.command.eq(openid))
    }).limit(1).get();

    if (!res.data || res.data.length === 0) {
      // 兼容旧版：members 字段直接存 openid 字符串（非嵌套）
      res = await db.collection('families').where({
        members: openid
      }).limit(1).get();
    }

    if (res.data && res.data.length > 0) {
      familyRecord = res.data[0];
    }
  } catch (e) {
    console.warn('查询 families 失败（集合可能尚未创建）:', e.message || e);
  }

  // 2. 如果有家庭组，根据需求拉取对应的业务数据
  const businessData = {};
  if (familyRecord) {
    const familyId = familyRecord._id;
    let targetCollections = BUSINESS_COLLECTIONS;
    if (event.collections) {
      const filterCols = Array.isArray(event.collections) ? event.collections : [event.collections];
      targetCollections = BUSINESS_COLLECTIONS.filter(c => filterCols.includes(c));
    }

    await Promise.all(
      targetCollections.map(async (collName) => {
        try {
          const result = await db.collection(collName).where({
            family_id: familyId
          }).limit(1000).get(); // 提高限制到 1000 条，防止长数据（如 classes 有 125 条）被截断丢失
          businessData[collName] = result.data || [];
        } catch (e) {
          // 集合不存在或无数据时静默跳过
          console.warn(`拉取 ${collName} 失败:`, e.message || e);
        }
      })
    );
  }

  return {
    openid,
    appid: wxContext.APPID,
    unionid: wxContext.UNIONID,
    env: wxContext.ENV,
    familyRecord,   // null 表示未创建家庭组
    businessData    // { collection_name: [...records] }
  };
};
