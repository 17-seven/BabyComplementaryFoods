const syncService = require('../services/sync.service');
const { success } = require('../utils/response');

exports.pull = async (req, res, next) => {
  try {
    const { openid } = req.user;
    const { collections } = req.body;
    const data = await syncService.pull(openid, collections);
    return res.json(success('数据拉取成功', {
      syncTime: new Date().toISOString(),
      ...data
    }));
  } catch (err) {
    next(err);
  }
};

exports.push = async (req, res, next) => {
  try {
    const { openid } = req.user;
    const { familyId, collection, records } = req.body;
    if (!familyId || !collection || !Array.isArray(records)) {
      return res.status(400).json({ code: 400, message: '参数缺失' });
    }
    const data = await syncService.push(openid, familyId, collection, records);
    return res.json(success('同步成功', data));
  } catch (err) {
    next(err);
  }
};
