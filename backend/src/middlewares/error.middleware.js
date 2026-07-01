const { error } = require('../utils/response');

module.exports = (err, req, res, next) => {
  console.error('[Error Middleware] 捕获到全局错误:', err);
  const status = err.status || 500;
  const message = err.message || '服务器内部异常，请稍后重试';
  res.status(status).json(error(status, message));
};
