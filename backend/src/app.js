require('dotenv').config();
const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const errorMiddleware = require('./middlewares/error.middleware');

const app = express();
const PORT = process.env.PORT || 3000;

// 配置跨域中间件
app.use(cors());

// 配置 JSON 解析中间件
app.use(express.json());

// 挂载路由
app.use('/api', routes);

// 默认健康检查端点
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 全局异常处理中间件
app.use(errorMiddleware);

app.listen(PORT, () => {
  console.log(`========================================`);
  console.log(`  围兜日记后端服务已成功启动！`);
  console.log(`  运行端口: http://localhost:${PORT}`);
  console.log(`  数据库源: ${process.env.DATABASE_URL}`);
  console.log(`========================================`);
});
