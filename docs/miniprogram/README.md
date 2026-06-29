# 微信小程序移植与开发文档库

本目录包含了将本宝宝辅食与健康管理系统移植至**微信小程序原生框架（含微信云开发）**的全套技术规范设计文档。

---

## 📑 文档索引

1. **[UI 与界面交互规范 (ui_design.md)](ui_design.md)**：
   * 基于 9 页设计稿的原型细分拆解。
   * 规定了首页概览、辅食合规红绿灯校验、疫苗补种打卡卡片、视力矫正计时环、便便及饮水快捷记账等界面的 WXML 节点排版与样式规范。
2. **[小程序开发移植方案 (implementation_plan.md)](implementation_plan.md)**：
   * 规定了原生微信小程序的文件工程结构定义。
   * 提供了将浏览器 LocalStorage API 平替为微信同步缓存 API 的工具库封装 (`utils/storage.js`)。
   * 提供了实际/纠正月龄计算函数、疫苗15天滚动步长排班核心 JavaScript 代码。
3. **[微信云开发集成方案 (cloud_dev.md)](cloud_dev.md)**：
   * 针对多看护人协同记账与家庭云同步需求，设计了云数据库安全访问规则。
   * 定义了 `timeline_events`、`healthcares`、`clinical_logs`、`eyepatch_records` 和 `meal_plans` 5 大云端 NoSQL 集合数据字段。
   * 提供了双端数据同步合并 `syncBabyData`、以及云端食谱合规拦截校验 `validateWeeklyPlan` 的 Node.js 云函数开发模板。
4. **[云数据库初始化导入指南 (database_seeding.md)](database_seeding.md)**：
   * 提供了如何使用 JSON 数组一键导入 61 条大事记、24 针疫苗、7 次季度儿保和 25 条就诊历史种子数据到微信云开发控制台的详细图文手册。
   * 包含符合导入格式的精选 JSON 数组块及 app.js 首次运行自检 Seeding JS 代码。
5. **[网站与小程序项目共存指南 (project_coexistence.md)](project_coexistence.md)**：
   * 详细说明了如何使用“同库子项目结构”将 Vue 3 网站项目和小程序原生项目独立隔离共存，共享一份 Git 仓库和开发文档而不产生依赖冲突。
6. **[家庭多看护人协同记账共享方案 (family_sharing.md)](family_sharing.md)**：
   * 详细阐述了针对多用户共享、夫妻协同记账的需求，如何配置微信云开发的安全规则（Security Rules）、实现家庭绑定云函数，以及小程序端如何通过家庭同步码动态刷新获取共同的宝宝数据。

