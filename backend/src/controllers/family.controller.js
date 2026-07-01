const familyService = require('../services/family.service');
const { success, error } = require('../utils/response');

exports.handleAction = async (req, res, next) => {
  try {
    const { openid } = req.user;
    const result = await familyService.handleAction(openid, req.body);
    if (result.success) {
      return res.json(success('操作成功', result));
    } else {
      return res.status(400).json(error(400, result.error || '操作失败'));
    }
  } catch (err) {
    next(err);
  }
};
