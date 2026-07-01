const jwt = require('jsonwebtoken');
const { error } = require('../utils/response');

module.exports = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json(error(401, '未授权访问：缺少令牌'));
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json(error(401, '未授权访问：无效的令牌格式'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = decoded; // 将解密后的用户信息挂载到 req.user，通常包含 openid
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json(error(401, '未授权访问：令牌已过期'));
    }
    return res.status(401).json(error(401, '未授权访问：令牌验证失败'));
  }
};
