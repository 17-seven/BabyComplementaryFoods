const prisma = require('../config/db');

const COLLECTION_TO_MODEL = {
  'timeline_events':    'timelineEvent',
  'vaccines':           'vaccine',
  'healthcares':        'healthcare',
  'assessments':        'assessment',
  'clinical_logs':      'clinicalLog',
  'meal_plans':         'mealPlan',
  'bowel_records':      'bowelRecord',
  'milk_water_records': 'milkWaterRecord',
  'eyepatch_records':   'eyepatchRecord',
  'growth':             'growthRecord',
  'class_customers':    'classCustomer',
  'classes':            'classRecord',
  'sleep_records':      'sleepRecord'
};

// 格式化不同模型的数据结构，以便正确适配 Prisma 和 SQLite
const formatModelData = (collection, rec, babyId) => {
  const data = { baby_id: babyId };

  switch (collection) {
    case 'timeline_events':
      data.creator_openid = rec.creator_openid || rec._openid || '';
      data.date = rec.date || '';
      data.category = rec.category || '';
      data.title = rec.title || '';
      data.content = rec.content || '';
      data.media_urls = rec.media_urls ? JSON.stringify(rec.media_urls) : null;
      break;

    case 'vaccines':
      data.name = rec.name || '';
      data.dose = rec.dose || '';
      data.status = rec.status || '未到时间';
      data.actual_date = rec.actualDate || null;
      data.planned_date = rec.plannedDate || null;
      break;

    case 'healthcares':
      data.date = rec.date || '';
      data.height = rec.height !== undefined ? parseFloat(rec.height) : null;
      data.weight = rec.weight !== undefined ? parseFloat(rec.weight) : null;
      data.head_circumference = rec.headCircumference !== undefined ? parseFloat(rec.headCircumference) : null;
      data.feedback = rec.feedback || null;
      data.doctor = rec.doctor || null;
      break;

    case 'assessments':
      data.date = rec.date || '';
      data.name = rec.name || '';
      data.doctor = rec.doctor || '';
      data.result = rec.result || '';
      data.intervention = rec.intervention || null;
      break;

    case 'clinical_logs':
      data.name = rec.name || '';
      data.date = rec.date || '';
      data.desc1 = rec.desc1 || null;
      data.desc2 = rec.desc2 || null;
      data.result = rec.result || null;
      data.status = rec.status || 'PENDING';
      break;

    case 'meal_plans':
      data.week_num = rec.week_num || rec.weekNum || '';
      data.start_date = rec.start_date || rec.startDate || '';
      data.end_date = rec.end_date || rec.endDate || '';
      data.validation_report = rec.validation_report ? JSON.stringify(rec.validation_report) : (rec.validationReport ? JSON.stringify(rec.validationReport) : null);
      break;

    case 'bowel_records':
      data.date = rec.date || '';
      data.time = rec.time || null;
      data.color = rec.color || null;
      data.shape = rec.shape || null;
      data.count = rec.count !== undefined ? parseInt(rec.count) : 1;
      data.note = rec.note || null;
      break;

    case 'milk_water_records':
      data.date = rec.date || '';
      data.time = rec.time || null;
      data.type = rec.type || 'milk';
      data.amount = rec.amount !== undefined ? parseInt(rec.amount) : 0;
      data.remark = rec.remark || null;
      break;

    case 'eyepatch_records':
      data.date = rec.date || '';
      data.start_time = rec.start_time || '';
      data.end_time = rec.end_time || '';
      data.duration_minutes = rec.duration_minutes !== undefined ? parseInt(rec.duration_minutes) : 0;
      data.type = rec.type || 'TIMER';
      break;

    case 'growth':
      data.date = rec.date || '';
      data.height = rec.height !== undefined ? parseFloat(rec.height) : null;
      data.weight = rec.weight !== undefined ? parseFloat(rec.weight) : null;
      data.head = rec.head !== undefined ? parseFloat(rec.head) : null;
      data.foot = rec.foot !== undefined ? parseFloat(rec.foot) : null;
      data.note = rec.note || null;
      break;

    case 'class_customers':
      data.name = rec.name || '';
      break;

    case 'classes':
      data.date = rec.date || '';
      data.day_name = rec.dayName || '';
      data.attended = rec.attended !== undefined ? !!rec.attended : true;
      data.teacher = rec.teacher || null;
      data.sessions = rec.sessions !== undefined ? parseFloat(rec.sessions) : 0;
      data.cost = rec.cost !== undefined ? parseFloat(rec.cost) : 0;
      data.topup = rec.topup !== undefined ? parseFloat(rec.topup) : 0;
      data.balance = rec.balance !== undefined ? parseFloat(rec.balance) : 0;
      data.note = rec.note || null;
      data.institution_id = rec.institution_id || 'spring_rain';
      data.institution_name = rec.institution_name || '';
      break;

    case 'sleep_records':
      data.date = rec.date || '';
      data.start_time = rec.start_time || '';
      data.end_time = rec.end_time || '';
      data.duration_minutes = rec.duration_minutes !== undefined ? parseInt(rec.duration_minutes) : 0;
      data.note = rec.note || null;
      break;
  }

  return data;
};

const pull = async (openid, collections) => {
  // 1. 查找用户所在的家庭
  const memberRelation = await prisma.familyMember.findFirst({
    where: { user_openid: openid },
    include: {
      family: {
        include: {
          baby: true,
          members: {
            include: {
              user: true
            }
          }
        }
      }
    }
  });

  if (!memberRelation || !memberRelation.family) {
    return { familyRecord: null, businessData: {} };
  }

  const family = memberRelation.family;
  const baby = family.baby;

  // 2. 组装 familyRecord
  const familyRecord = {
    _id: family.id,
    baby_name: baby.name,
    birth_date: baby.birth_date,
    due_date: baby.due_date,
    premature_days: baby.premature_days,
    premature_desc: baby.premature_desc,
    baby_avatar: family.baby_avatar || baby.avatar_url || '/assets/avatar_default.png',
    album_photos: JSON.parse(family.album_photos || '[]'),
    timer_items: JSON.parse(family.timer_items || '[]'),
    timeline_categories: JSON.parse(family.timeline_categories || '[]'),
    meal_day_notes: JSON.parse(family.meal_day_notes || '{}'),
    creator_openid: family.creator_openid,
    members: family.members.map(m => m.user_openid),
    members_info: family.members.map(m => ({
      openid: m.user_openid,
      nickName: m.user.nickname,
      avatarUrl: m.user.avatar_url || '/assets/avatar_default.png'
    }))
  };

  // 3. 筛选并查询需要的业务集合
  const targetCols = collections && collections.length > 0 ? collections : Object.keys(COLLECTION_TO_MODEL).concat(['safe_foods', 'risk_foods']);
  const businessData = {};

  const queryPromises = targetCols.map(async (coll) => {
    try {
      if (coll === 'safe_foods') {
        const res = await prisma.allergenPool.findMany({
          where: { baby_id: baby.id, status: 'ALLOWED' }
        });
        businessData[coll] = res.map(x => ({ name: x.food_name, status: x.status }));
      } else if (coll === 'risk_foods') {
        const res = await prisma.allergenPool.findMany({
          where: { baby_id: baby.id, status: 'BANNED' }
        });
        businessData[coll] = res.map(x => ({ name: x.food_name, status: x.status }));
      } else {
        const modelName = COLLECTION_TO_MODEL[coll];
        if (!modelName) return;

        let queryArgs = { where: { baby_id: baby.id } };

        // 针对 meal_plans 自动关联查询 days
        if (coll === 'meal_plans') {
          queryArgs.include = { days: true };
        }

        const res = await prisma[modelName].findMany(queryArgs);
        
        // 映射出 NoSQL 兼容字段
        businessData[coll] = res.map(item => {
          const formatted = { ...item };
          
          // 将 String ID 转换为原始类型 (针对成长记录 growth 原本为 Int 自增 id)
          if (coll === 'growth') {
            // SQLite 保存时使用 autoincrement 整数，因此 formatted.id 已经是数字，无需转换
          }

          // 将 JSON 字符串解析为数组/对象
          if (coll === 'timeline_events' && formatted.media_urls) {
            formatted.media_urls = JSON.parse(formatted.media_urls);
          }
          if (coll === 'meal_plans') {
            formatted.validation_report = formatted.validation_report ? JSON.parse(formatted.validation_report) : null;
            // 把 days 关联子表转换回 NoSQL 的 days 数组
            formatted.days = formatted.days.map(d => ({
              date: d.date,
              day_name: d.day_name,
              meals: {
                breakfast: d.breakfast,
                lunch: d.lunch,
                dinner: d.dinner,
                snack: d.snack
              },
              note: d.note
            }));
          }

          return formatted;
        });
      }
    } catch (e) {
      console.warn(`[Sync Pull] 查询集合 ${coll} 失败:`, e.message);
    }
  });

  await Promise.all(queryPromises);

  return { familyRecord, businessData };
};

const push = async (openid, familyId, collection, records) => {
  // 1. 验证看护人家庭权限并获取宝宝 ID
  const memberRelation = await prisma.familyMember.findFirst({
    where: { family_id: familyId, user_openid: openid },
    include: { family: true }
  });

  if (!memberRelation || !memberRelation.family) {
    throw new Error('未授权同步当前家庭组的数据');
  }

  const babyId = memberRelation.family.baby_id;

  // 2. 物理删除处理：删除云端存在但客户端已删除的记录
  if (collection === 'safe_foods' || collection === 'risk_foods') {
    const activeNames = records.map(r => r.name).filter(Boolean);
    const status = (collection === 'safe_foods') ? 'ALLOWED' : 'BANNED';
    await prisma.allergenPool.deleteMany({
      where: {
        baby_id: babyId,
        status: status,
        food_name: { notIn: activeNames }
      }
    });
  } else {
    const activeSyncIds = records.map(r => String(r.id || r.name || '')).filter(Boolean);
    const modelName = COLLECTION_TO_MODEL[collection];
    if (modelName) {
      await prisma[modelName].deleteMany({
        where: {
          baby_id: babyId,
          id: { notIn: activeSyncIds }
        }
      });
    }
  }

  // 3. 增量保存更新 (Upsert)
  let successCount = 0;

  if (collection === 'safe_foods' || collection === 'risk_foods') {
    const status = (collection === 'safe_foods') ? 'ALLOWED' : 'BANNED';
    for (const rec of records) {
      const foodName = rec.name;
      if (!foodName) continue;
      await prisma.allergenPool.upsert({
        where: { baby_id_food_name: { baby_id: babyId, food_name: foodName } },
        update: { status },
        create: { baby_id: babyId, food_name: foodName, status }
      });
      successCount++;
    }
  } else {
    const modelName = COLLECTION_TO_MODEL[collection];
    if (modelName) {
      for (const rec of records) {
        const syncId = String(rec.id || rec.name || '');
        if (!syncId) continue;

        const data = formatModelData(collection, rec, babyId);

        if (collection === 'meal_plans') {
          // 针对食谱周计划，做级联处理（先删除旧明细，再保存新明细）
          const { days, ...planData } = data;
          await prisma.mealPlan.upsert({
            where: { id: syncId },
            update: planData,
            create: { id: syncId, ...planData }
          });

          await prisma.mealPlanDay.deleteMany({ where: { meal_plan_id: syncId } });
          
          if (rec.days && Array.isArray(rec.days)) {
            const dayInserts = rec.days.map(d => ({
              meal_plan_id: syncId,
              date: d.date || '',
              day_name: d.day_name || '',
              breakfast: d.meals ? d.meals.breakfast : null,
              lunch: d.meals ? d.meals.lunch : null,
              dinner: d.meals ? d.meals.dinner : null,
              snack: d.meals ? d.meals.snack : null,
              note: d.note || null
            }));

            // 使用 createMany 批量插入（Prisma 对 SQLite 仅支持循环或 create 嵌套，在此循环插入）
            for (const d of dayInserts) {
              await prisma.mealPlanDay.create({ data: d });
            }
          }
        } else {
          // 普通打卡数据，直接 upsert
          await prisma[modelName].upsert({
            where: { id: syncId },
            update: data,
            create: { id: syncId, ...data }
          });
        }
        successCount++;
      }
    }
  }

  return { successCount };
};

module.exports = {
  pull,
  push
};
