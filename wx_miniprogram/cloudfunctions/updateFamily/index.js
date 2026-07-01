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
      // 获取当前家庭组记录来局部更新 members_info
      const doc = await db.collection('families').doc(familyId).get();
      if (doc.data) {
        const family = doc.data;
        let membersInfo = family.members_info || [];
        
        const isCreator = (family.creator_openid === openid);
        const nickName = data.creator_nickname;
        const avatarUrl = data.creator_avatar;
        
        // 如果不是创建者，不允许覆写全局的 creator_nickname 和 creator_avatar
        if (!isCreator) {
          delete data.creator_nickname;
          delete data.creator_avatar;
        }

        if (nickName || avatarUrl) {
          const idx = membersInfo.findIndex(m => m.openid === openid);
          if (idx >= 0) {
            if (nickName) membersInfo[idx].nickName = nickName;
            if (avatarUrl) membersInfo[idx].avatarUrl = avatarUrl;
          } else {
            membersInfo.push({
              openid: openid,
              nickName: nickName || '看护人',
              avatarUrl: avatarUrl || '/assets/avatar_default.png'
            });
          }
          data.members_info = membersInfo;
        }
      }

      // 更新已有家庭组记录
      await db.collection('families').doc(familyId).update({ data });
      return { success: true, familyId };

    } else if (action === 'create') {
      // 创建新家庭组，自动带上当前用户的 openid 到 members
      const creatorNickname = data.creator_nickname || '群主';
      const creatorAvatar = data.creator_avatar || '/assets/avatar_default.png';

      const newData = Object.assign({}, data, {
        members: [openid],
        members_info: [
          { openid: openid, nickName: creatorNickname, avatarUrl: creatorAvatar }
        ],
        creator_openid: openid,
        create_time: new Date()
      });
      const res = await db.collection('families').add({ data: newData });
      return { success: true, familyId: res._id };

    } else if (action === 'addMember') {
      // 将新成员 openid 加入 members 数组，并更新 members_info
      const doc = await db.collection('families').doc(familyId).get();
      if (!doc.data) {
        return { success: false, error: '同步码不存在' };
      }
      const family = doc.data;
      let members = family.members || [];
      let membersInfo = family.members_info || [];
      
      const memberNickname = (data && data.nickName) || '协同看护人';
      const memberAvatar = (data && data.avatarUrl) || '/assets/avatar_default.png';

      if (!members.includes(openid)) {
        members.push(openid);
      }

      const idx = membersInfo.findIndex(m => m.openid === openid);
      if (idx >= 0) {
        membersInfo[idx].nickName = memberNickname;
        membersInfo[idx].avatarUrl = memberAvatar;
      } else {
        membersInfo.push({ openid: openid, nickName: memberNickname, avatarUrl: memberAvatar });
      }

      await db.collection('families').doc(familyId).update({
        data: {
          members,
          members_info: membersInfo
        }
      });
      return { success: true, familyId };

    } else if (action === 'removeMember') {
      // 成员解绑：可由操作人自己退组，也可由创建者将他人移出家庭组
      const doc = await db.collection('families').doc(familyId).get();
      if (!doc.data) {
        return { success: false, error: '同步码不存在' };
      }
      const family = doc.data;
      let members = family.members || [];
      let membersInfo = family.members_info || [];

      // 获取待移除的 openid (若未传入，默认移除当前调用者自己)
      const targetOpenid = event.targetOpenid || openid;

      members = members.filter(m => m !== targetOpenid);
      membersInfo = membersInfo.filter(m => m.openid !== targetOpenid);

      await db.collection('families').doc(familyId).update({
        data: {
          members,
          members_info: membersInfo
        }
      });
      return { success: true, familyId };

    } else if (action === 'dismissFamily') {
      // 解散家庭组：只有创建者才有权限删除对应的家庭组文档
      const doc = await db.collection('families').doc(familyId).get();
      if (!doc.data) {
        return { success: false, error: '同步码不存在' };
      }
      const family = doc.data;
      const creatorOpenid = family.creator_openid || family._openid || (family.members && family.members[0]);
      if (creatorOpenid !== openid) {
        return { success: false, error: '非创建者无权解散家庭组' };
      }

      await db.collection('families').doc(familyId).remove();
      return { success: true };

    } else {
      return { success: false, error: '未知 action: ' + action };
    }
  } catch (e) {
    console.error('[updateFamily] 操作失败:', e);
    return { success: false, error: e.message || String(e) };
  }
};
