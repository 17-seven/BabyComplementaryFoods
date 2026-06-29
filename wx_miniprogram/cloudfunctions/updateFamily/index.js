// cloudfunctions/updateFamily/index.js
// 所有对 families 集合的写操作必须走此云函数，以绕过客户端安全规则限制
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

/**
 * 统一处理 families 集合的创建与更新
 *
 * event 参数：
 *   - action: 'update' | 'create'
 *   - familyId: string (action='update' 时必填)
 *   - data: object (要写入的字段)
 *
 * 返回：{ success: true, familyId }
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const db = cloud.database();
  const _ = db.command;

  const { action, familyId, data } = event;

  try {
    if (action === 'update' && familyId) {
      // 更新已有家庭组记录
      await db.collection('families').doc(familyId).update({ data });
      return { success: true, familyId };

    } else if (action === 'create') {
      // 创建新家庭组，自动带上当前用户的 openid 到 members
      const newData = Object.assign({}, data, {
        members: [openid],
        creator_openid: openid,
        create_time: new Date()
      });
      const res = await db.collection('families').add({ data: newData });
      return { success: true, familyId: res._id };

    } else if (action === 'addMember') {
      // 将新成员 openid 加入 members 数组（joinFamily 场景）
      await db.collection('families').doc(familyId).update({
        data: { members: _.addToSet(openid) }
      });
      return { success: true, familyId };

    } else {
      return { success: false, error: '未知 action: ' + action };
    }
  } catch (e) {
    console.error('[updateFamily] 操作失败:', e);
    return { success: false, error: e.message || String(e) };
  }
};
