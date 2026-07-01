# 围兜日记项目设计与开发文档 (Project Documentation)

欢迎来到围兜日记项目的文档中心。为了方便阅读与后续开发维护，所有设计文档和规格说明已按模块重新整理归类。

---

## 📂 目录结构与文档索引

### 🥦 [01_meal_planning](file:///e:/AAAWork/self/BabyComplementaryFoods/docs/01_meal_planning/) - 宝宝辅食与排餐设计
本目录包含关于宝宝辅食管理、排餐规则以及提示词模版的文档：
* [01_已排敏食材池.md](file:///e:/AAAWork/self/BabyComplementaryFoods/docs/01_meal_planning/01_已排敏食材池.md) — 记录宝宝已顺利通关的食材。
* [02_未排敏食材池.md](file:///e:/AAAWork/self/BabyComplementaryFoods/docs/01_meal_planning/02_未排敏食材池.md) — 记录待排敏、存在风险的食材。
* [03_排餐规则.md](file:///e:/AAAWork/self/BabyComplementaryFoods/docs/01_meal_planning/03_排餐规则.md) — 核心排餐合规性规则说明（铁元素补充频次、粗粮占比、蛋类配额等）。
* [04_周计划-2026W27.md](file:///e:/AAAWork/self/BabyComplementaryFoods/docs/01_meal_planning/04_周计划-2026W27.md) — 当前执行的辅食周计划示例。
* [05_执行备注与替换原则.md](file:///e:/AAAWork/self/BabyComplementaryFoods/docs/01_meal_planning/05_执行备注与替换原则.md) — 食材临时替换及喂食注意事项。
* [06_新增辅食计划提示词模版.md](file:///e:/AAAWork/self/BabyComplementaryFoods/docs/01_meal_planning/06_新增辅食计划提示词模版.md) — 用于自动生成下周计划的 AI 提示词。

---

### 💻 [02_backend_server](file:///e:/AAAWork/self/BabyComplementaryFoods/docs/02_backend_server/) - 自建后端开发与迁移设计
本目录包含从微信云开发迁移到自建 Node.js 后端的全套架构文档：
* [01_database_schema.md](file:///e:/AAAWork/self/BabyComplementaryFoods/docs/02_backend_server/01_database_schema.md) — MySQL 5.7 关系型数据库结构设计。
* [02_backend_architecture.md](file:///e:/AAAWork/self/BabyComplementaryFoods/docs/02_backend_server/02_backend_architecture.md) — Node.js (Express) + Prisma 服务端三层架构设计与部署说明。
* [03_api_specification.md](file:///e:/AAAWork/self/BabyComplementaryFoods/docs/02_backend_server/03_api_specification.md) — 双 JWT 鉴权流程及数据增量拉取/推送 API 详细定义。
* [04_miniprogram_integration.md](file:///e:/AAAWork/self/BabyComplementaryFoods/docs/02_backend_server/04_miniprogram_integration.md) — 小程序前端网络请求库封装及页面代码改写指南。
* [db_sync_guide.md](file:///e:/AAAWork/self/BabyComplementaryFoods/docs/02_backend_server/db_sync_guide.md) — 后端增量数据同步原理及逻辑校验指南。

---

### 📱 [03_miniprogram_frontend](file:///e:/AAAWork/self/BabyComplementaryFoods/docs/03_miniprogram_frontend/) - 微信小程序前端设计
本目录记录了小程序前端原本的设计大纲、页面布局及本地测试种子数据：
* [README.md](file:///e:/AAAWork/self/BabyComplementaryFoods/docs/03_miniprogram_frontend/README.md) — 小程序前端运行与工程配置。
* [changelog_and_spec.md](file:///e:/AAAWork/self/BabyComplementaryFoods/docs/03_miniprogram_frontend/changelog_and_spec.md) — 版本迭代日志及页面功能规范。
* [demand_records.md](file:///e:/AAAWork/self/BabyComplementaryFoods/docs/03_miniprogram_frontend/demand_records.md) — 系统原始开发需求登记表。
* [ui_design.md](file:///e:/AAAWork/self/BabyComplementaryFoods/docs/03_miniprogram_frontend/ui_design.md) — 前端页面原型与交互设计说明。
* [db_seeds/](file:///e:/AAAWork/self/BabyComplementaryFoods/docs/03_miniprogram_frontend/db_seeds/) — 本地开发及首次数据库播种所需的 JSON 种子数据。

---

### 📋 [04_specs_and_guidelines](file:///e:/AAAWork/self/BabyComplementaryFoods/docs/04_specs_and_guidelines/) - 系统概要与设计大纲
本目录包含全系统的功能概览与系统大纲：
* [system_spec.md](file:///e:/AAAWork/self/BabyComplementaryFoods/docs/04_specs_and_guidelines/system_spec.md) — 围兜日记系统详细设计与核心护理板块（疫苗、大事记、视力遮盖等）功能说明。
