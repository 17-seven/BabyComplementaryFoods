# 后端服务架构设计方案 (Backend Server Architecture)

本方案设计了一套基于 **Node.js (Express)**、配合 **Prisma ORM** 和 **MySQL 5.7** 的高可用后端架构。架构采用分层式架构设计，对前端开发者直观、易懂且利于长期维护。

---

## 一、 项目目录结构设计 (Directory Structure)

我们将项目命名为 `weidou-diary-backend`。整体设计遵循“高内聚、低耦合”的模块化架构思想。

```text
weidou-diary-backend/
├── .env                    # 环境配置文件 (敏感秘钥不提交)
├── .gitignore              # Git 忽略文件
├── package.json            # 依赖管理及启动脚本
├── pm2.config.js           # PM2 进程守护配置文件
├── prisma/                 # Prisma ORM 专属目录
│   └── schema.prisma       # 数据库模型与关联定义
└── src/
    ├── app.js              # 服务入口文件 (初始化 Express, 中间件注册)
    ├── config/             # 全局配置中心 (微信API凭证、JWT设置等)
    │   ├── db.js           # Prisma Client 初始化与连接
    │   └── wechat.js       # 微信小程序 appid/appsecret 配置
    ├── controllers/        # 控制器层：负责解析请求、数据校验、处理状态码与返回
    │   ├── auth.controller.js
    │   ├── baby.controller.js
    │   ├── sync.controller.js
    │   └── meal.controller.js
    ├── middlewares/        # 中间件层：提取公用切面逻辑
    │   ├── auth.middleware.js # JWT 鉴权与身份提取中间件
    │   └── error.middleware.js# 全局错误捕获中间件
    ├── routes/             # 路由层：定义 RESTful API 端点
    │   ├── index.js        # 汇总导出路由
    │   ├── auth.routes.js
    │   ├── baby.routes.js
    │   ├── sync.routes.js
    │   └── meal.routes.js
    ├── services/           # 业务逻辑层：承载所有核心计算、合规校验与云函数移植逻辑
    │   ├── auth.service.js # 微信授权、JWT 签发及刷新
    │   ├── baby.service.js
    │   ├── sync.service.js # 增量拉取与本地缓存物理冲突合并
    │   └── meal.service.js # 食谱合规分析服务
    └── utils/              # 通用工具类 (如时间格式化、加密算法、常量定义)
        ├── logger.js
        └── response.js     # 统一 API 数据返回格式封装
```

---

## 二、 核心环境配置文件说明 (`.env`)

自建服务端通常会区分本地开发环境、预发环境和生产环境。我们使用 `dotenv` 加载本地系统变量：

```env
# 1. 运行环境与端口配置
NODE_ENV=production
PORT=3000

# 2. 数据库连接串 (Prisma 使用)
# 格式: mysql://用户名:密码@主机地址:端口/数据库名?connection_limit=10
DATABASE_URL="mysql://weidou_user:weidou_password@127.0.0.1:3306/weidou_diary?schema=public&connection_limit=15"

# 3. JWT 签名与失效时长设定
JWT_ACCESS_SECRET="weidou_access_jwt_secret_key_2026"
JWT_REFRESH_SECRET="weidou_refresh_jwt_secret_key_2026"
JWT_ACCESS_EXPIRES_IN="2h"          # Access Token 有效期 2 小时
JWT_REFRESH_EXPIRES_IN="30d"        # Refresh Token 有效期 30 天，用于无感刷新

# 4. 微信开放平台小程序配置
WX_APP_ID="your_wechat_miniprogram_appid"
WX_APP_SECRET="your_wechat_miniprogram_appsecret"

# 5. 文件上传配置 (腾讯云COS / 阿里云OSS 或自建本地静态存储)
UPLOAD_PROVIDER=local               # local | cos | oss
UPLOAD_DIR="./uploads"              # 本地存储上传路径
COS_SECRET_ID="cos_secret_id_xxx"
COS_SECRET_KEY="cos_secret_key_xxx"
COS_BUCKET="weidou-bucket-1250000"
COS_REGION="ap-shanghai"
```

---

## 三、 分层开发规范 (Architecture Layers)

### 1. 路由层 (Routes)
* 职责：仅定义 API 地址与支持的 HTTP Method (GET, POST, PUT, DELETE)，并挂载对应的安全鉴权中间件。
* 示例：
```javascript
// src/routes/baby.routes.js
const express = require('express');
const router = express.Router();
const babyController = require('../controllers/baby.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.get('/profile', authMiddleware, babyController.getProfile);
router.put('/profile', authMiddleware, babyController.updateProfile);

module.exports = router;
```

### 2. 控制器层 (Controllers)
* 职责：负责接收前端的 `req.body`, `req.query`, `req.params` 参数；调用相应的服务层获取数据；最后通过统一响应工具包装，以标准的 HTTP 状态码回传给前端。
* 规则：**不在此层书写任何 SQL 查询或业务规则。**
* 示例：
```javascript
// src/controllers/baby.controller.js
const babyService = require('../services/baby.service');
const { success, error } = require('../utils/response');

exports.getProfile = async (req, res, next) => {
  try {
    const { openid } = req.user; // 从 JWT 鉴权中间件中获取已解密的用户身份
    const babyProfile = await babyService.getBabyByOpenid(openid);
    return res.json(success('获取宝宝档案成功', babyProfile));
  } catch (err) {
    next(err); // 投递给全局错误处理器
  }
};
```

### 3. 业务服务层 (Services)
* 职责：服务层是**最重要**的逻辑核心。在这里执行如“排敏规则过滤”、“周食谱红肉频次统计”或“多设备同步冲突处理”。直接使用 Prisma Client 读写 MySQL 数据库。
* 示例：
```javascript
// src/services/baby.service.js
const prisma = require('../config/db');

exports.getBabyByOpenid = async (openid) => {
  // 联合查询用户加入的家庭，进而找到宝宝的档案
  const memberRelation = await prisma.familyMember.findFirst({
    where: { user_openid: openid },
    include: {
      family: {
        include: {
          baby: true
        }
      }
    }
  });
  
  if (!memberRelation || !memberRelation.family) {
    return null;
  }
  return memberRelation.family.baby;
};
```

---

## 四、 生产部署建议 (PM2 Configuration)

在自建 Linux (CentOS / Ubuntu) 服务器上，采用 **PM2** 进行 Node.js 应用的生命周期管理，实现进程守护、负载均衡（Cluster 模式）、内存过载自启以及零停机平滑重启 (Graceful Reload)。

### 1. PM2 配置文件示例 (`pm2.config.js`)
在项目根目录下创建该文件，部署时可直接通过 `pm2 start pm2.config.js` 启动：

```javascript
module.exports = {
  apps: [
    {
      name: 'weidou-diary-api',
      script: './src/app.js',
      instances: 'max',            // 根据 CPU 核心数自动开启最大集群实例
      exec_mode: 'cluster',        // 开启集群模式，最大化利用 CPU 核心
      watch: false,                // 生产环境关闭热重载，防止日志写入引起无限自启
      max_memory_restart: '1G',    // 单个实例内存消耗达到 1G 时自动重启，防止内存泄漏
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/pm2-err.log',   // 错误日志输出路径
      out_file: './logs/pm2-out.log',     // 标准输出日志路径
      merge_logs: true,                   // 集群模式下合并所有实例日志
      autorestart: true,                  // 异常退出时自动重启
      min_uptime: '15s',
      listen_timeout: 8000,
      kill_timeout: 3000
    }
  ]
};
```

### 2. 部署步骤与常用命令

```bash
# 1. 在服务器克隆代码并安装依赖 (仅生产依赖)
npm install --production

# 2. 同步并生成 Prisma 数据库客户端
npx prisma generate
npx prisma db push # 首次部署将 schema 映射到 MySQL 

# 3. 启动应用
pm2 start pm2.config.js --env production

# 4. 设置 PM2 开机自启动 (保障服务器断电重启后自动恢复服务)
pm2 save
pm2 startup

# 5. 常用运维管理命令
pm2 status                  # 查看各集群节点内存/CPU健康状态
pm2 log weidou-diary-api    # 实时查看输出日志
pm2 reload all              # 零停机热重启服务 (用于代码更新上线)
pm2 stop weidou-diary-api   # 停止服务
```
