const prisma = require('../config/db');

const handleAction = async (openid, payload) => {
  const { action, familyId, data, targetOpenid } = payload;

  if (action === 'create') {
    // 1. 创建全新的宝宝记录
    const baby = await prisma.baby.create({
      data: {
        name: data.baby_name || '小宝贝',
        birth_date: data.birth_date || '',
        is_premature: data.premature_days > 0,
        due_date: data.due_date || null,
        premature_days: data.premature_days ? parseInt(data.premature_days) : 0,
        premature_desc: data.premature_desc || null,
        avatar_url: data.creator_avatar || null
      }
    });

    // 2. 生成随机 12 位同步码
    const generatedFamilyId = 'fam_' + Math.random().toString(36).substring(2, 8) + Date.now().toString().substring(8, 12);

    // 3. 创建家庭组
    const family = await prisma.family.create({
      data: {
        id: generatedFamilyId,
        baby_id: baby.id,
        creator_openid: openid,
        baby_avatar: data.creator_avatar || null
      }
    });

    // 4. 将创建者加入家庭成员关联表
    await prisma.familyMember.create({
      data: {
        family_id: family.id,
        user_openid: openid,
        role: 'CREATOR'
      }
    });

    // 5. 初始化该宝宝的默认接种计划记录（避免无数据）
    const VACCINE_SEEDS = [
      { name: "乙肝疫苗", dose: "第1剂", status: "已接种", actual_date: data.birth_date || null },
      { name: "卡介苗", dose: "第1剂", status: "已接种", actual_date: data.birth_date || null }
    ];
    for (const vac of VACCINE_SEEDS) {
      await prisma.vaccine.create({
        data: {
          baby_id: baby.id,
          ...vac
        }
      });
    }

    return { success: true, familyId: family.id };

  } else if (action === 'addMember') {
    const family = await prisma.family.findUnique({
      where: { id: familyId },
      include: { baby: true }
    });

    if (!family) {
      return { success: false, error: '同步码不存在' };
    }

    // 将用户加入到家庭成员表中 (存在即跳过，不存在即创建)
    const existing = await prisma.familyMember.findUnique({
      where: { family_id_user_openid: { family_id: familyId, user_openid: openid } }
    });

    if (!existing) {
      await prisma.familyMember.create({
        data: {
          family_id: familyId,
          user_openid: openid,
          role: 'MEMBER'
        }
      });
    }

    return { success: true, familyId };

  } else if (action === 'update') {
    const family = await prisma.family.findUnique({ where: { id: familyId } });
    if (!family) {
      return { success: false, error: '家庭记录不存在' };
    }

    const isCreator = (family.creator_openid === openid);
    const updateData = {};

    // 如果包含宝宝的基础档案数据更新，同步更新宝宝信息
    if (data.baby_name || data.birth_date || data.premature_days !== undefined) {
      await prisma.baby.update({
        where: { id: family.baby_id },
        data: {
          name: data.baby_name,
          birth_date: data.birth_date,
          due_date: data.due_date,
          premature_days: data.premature_days !== undefined ? parseInt(data.premature_days) : undefined,
          premature_desc: data.premature_desc
        }
      });
    }

    // 映射 NoSQL 中的各种字段到 family 的 JSON/String 存储字段中
    if (data.baby_avatar) updateData.baby_avatar = data.baby_avatar;
    if (data.album_photos) updateData.album_photos = JSON.stringify(data.album_photos);
    if (data.timer_items) updateData.timer_items = JSON.stringify(data.timer_items);
    if (data.timeline_categories) updateData.timeline_categories = JSON.stringify(data.timeline_categories);
    if (data.meal_day_notes) updateData.meal_day_notes = JSON.stringify(data.meal_day_notes);

    if (Object.keys(updateData).length > 0) {
      await prisma.family.update({
        where: { id: familyId },
        data: updateData
      });
    }

    return { success: true, familyId };

  } else if (action === 'removeMember') {
    const family = await prisma.family.findUnique({ where: { id: familyId } });
    if (!family) {
      return { success: false, error: '家庭记录不存在' };
    }

    const target = targetOpenid || openid;
    const isCreator = (family.creator_openid === openid);

    // 只有创建者可以移出别人，用户本人可以随时退出
    if (target !== openid && !isCreator) {
      return { success: false, error: '无权移出其他成员' };
    }

    await prisma.familyMember.delete({
      where: { family_id_user_openid: { family_id: familyId, user_openid: target } }
    });

    return { success: true, familyId };

  } else if (action === 'dismissFamily') {
    const family = await prisma.family.findUnique({ where: { id: familyId } });
    if (!family) {
      return { success: false, error: '家庭记录不存在' };
    }

    if (family.creator_openid !== openid) {
      return { success: false, error: '非创建者无权解散家庭组' };
    }

    // 物理级联删除绑定的宝宝，由于 Prisma 级联设置，家庭表、成员关联表等均会自动一并清空
    await prisma.baby.delete({ where: { id: family.baby_id } });

    return { success: true };
  }

  throw new Error('未知 action: ' + action);
};

module.exports = {
  handleAction
};
