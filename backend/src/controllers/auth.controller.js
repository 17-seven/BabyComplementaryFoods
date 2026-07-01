const authService = require('../services/auth.service');
const { success, error } = require('../utils/response');

exports.login = async (req, res, next) => {
  try {
    const { code, nickname, avatarUrl } = req.body;
    if (!code) {
      return res.status(400).json(error(400, '参数错误：code 不能为空'));
    }
    const data = await authService.login(code, nickname, avatarUrl);
    return res.json(success('登录成功', data));
  } catch (err) {
    next(err);
  }
};

exports.refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json(error(400, '参数错误：refreshToken 不能为空'));
    }
    const data = await authService.refresh(refreshToken);
    return res.json(success('Token 刷新成功', data));
  } catch (err) {
    next(err);
  }
};
