# 微信小程序 — 需求开发记录

> 文档最后更新：2026-07-01  
> 文档目的：记录和管理用户提出的各项需求细节、修改方案以及在微信小程序端的落地实现情况。

---

## 📊 一、 2026-07-01 需求修改记录

### 1. 家庭协同解绑与重新绑定数据合并防丢失
*   **需求描述**：当看护人解绑家庭组后，重新创建或加入新的家庭组时，本地已产生的打卡数据不能丢失，需与新家庭组云端数据无损归集。
*   **解决方案**：
    *   在 `storage.js` 中新增通用合并方法 `syncMerge`，采用 `mergeArrays` 算法依据唯一主键去重合并本地与云端数组。
    *   针对敏感的疫苗接种表，在合并时如果状态冲突，高优先保留“已接种”记录，避免已接种的疫苗被覆盖为“未接种”。
    *   在 `pages/family/index.js` 的 `createFamily` 和 `joinFamily` 云开发绑定回调中接入该合并逻辑，并在合并后回写缓存和上传云端。
*   **关联文件**：
    *   [utils/storage.js](file:///e:/AAAWork/self/BabyComplementaryFoods/wx_miniprogram/utils/storage.js)
    *   [pages/family/index.js](file:///e:/AAAWork/self/BabyComplementaryFoods/wx_miniprogram/pages/family/index.js)

### 2. 协同成员数据实时更新与主动下拉刷新
*   **需求描述**：家庭成员 A 新增或删除打卡记录后，成员 B 进入页面或刷新首页/小程序应能实时看到最新数据。并且解决不同设备登录同一微信号时数据同步延迟的问题。
*   **解决方案**：
    *   **底层云函数调整**：修改 `login` 云函数（`cloudfunctions/login`），保证集合在云数据库中为空时也返回空数组 `[]`，以便客户端同步清空。
    *   **本地恢复改进**：修改 `pages/login/index.js` 登录页的数据恢复逻辑，支持恢复包含空数组在内的全量配置。
    *   **静默同步引入**：在 9 个核心业务页面（`dashboard`、`bowel`、`nutrition`、`classes`、`mealplan`、`healthcare`、`timeline`、`growth`、`vision`）的 `onShow` 生命周期中引入后台静默 `syncPull` 全量更新覆盖。
    *   **开启下拉刷新**：在这些页面的 `.json` 配置中开启 `enablePullDownRefresh: true`，并在页面的 `onPullDownRefresh` 中执行主动调用 `syncPull` 并停止刷新动画。
*   **关联文件**：
    *   云函数 [cloudfunctions/login/index.js](file:///e:/AAAWork/self/BabyComplementaryFoods/wx_miniprogram/cloudfunctions/login/index.js)
    *   [pages/login/index.js](file:///e:/AAAWork/self/BabyComplementaryFoods/wx_miniprogram/pages/login/index.js)
    *   各业务页面 JS 与 JSON 配置文件。

### 3. 辅食计划周标题命名格式规范化
*   **需求描述**：取消复杂的 W28 格式，新生成的周标题统一格式为“第X周辅食计划”，并且文字和数字之间不可有空格，下周计划的标题中数字前后不可有空格。
*   **解决方案**：
    *   更新 [data/mealPlan.js](file:///e:/AAAWork/self/BabyComplementaryFoods/wx_miniprogram/data/mealPlan.js) 中的首周种子数据为“第1周辅食计划”。
    *   修改 [pages/mealplan/index.js](file:///e:/AAAWork/self/BabyComplementaryFoods/wx_miniprogram/pages/mealplan/index.js) 中 `addNewWeek` 周生成正则，匹配已有周数并加一，输出 `"第${nextWeekNum}周辅食计划"`。
*   **关联文件**：
    *   [data/mealPlan.js](file:///e:/AAAWork/self/BabyComplementaryFoods/wx_miniprogram/data/mealPlan.js)
    *   [pages/mealplan/index.js](file:///e:/AAAWork/self/BabyComplementaryFoods/wx_miniprogram/pages/mealplan/index.js)

### 4. 疫苗接种记录引入唯一 ID 并去重
*   **需求描述**：解决多剂次同名疫苗（如乙肝疫苗）在上传时由于没有唯一 ID 发生互相覆盖，导致下载到客户端时数据错乱的 Bug；且需要物理清除由于旧逻辑产生的云端重复疫苗数据。
*   **解决方案**：
    *   为 [data/healthcare.js](file:///e:/AAAWork/self/BabyComplementaryFoods/wx_miniprogram/data/healthcare.js) 及 `db_seeds/vaccines.json` 种子数据的 24 针疫苗对象补齐唯一且固定的 `id` 属性 (`vac_01` ~ `vac_24`)。
    *   在 [pages/healthcare/index.js](file:///e:/AAAWork/self/BabyComplementaryFoods/wx_miniprogram/pages/healthcare/index.js) 初始化阶段增加数据恢复和 ID 自动补全迁移逻辑，恢复可能已被去重裁剪的记录。
    *   改进数据同步云函数 `syncData`，在构建同步映射时自动识别云端重复文档，并进行物理 `remove` 清理。
*   **关联文件**：
    *   [data/healthcare.js](file:///e:/AAAWork/self/BabyComplementaryFoods/wx_miniprogram/data/healthcare.js)
    *   [pages/healthcare/index.js](file:///e:/AAAWork/self/BabyComplementaryFoods/wx_miniprogram/pages/healthcare/index.js)
    *   云函数 [cloudfunctions/syncData/index.js](file:///e:/AAAWork/self/BabyComplementaryFoods/wx_miniprogram/cloudfunctions/syncData/index.js)
    *   种子数据 `docs/miniprogram/db_seeds/vaccines.json`

### 5. 季度儿保下次时间自动推算与 iOS 兼容性修复
*   **需求描述**：下次儿保时间基于上次实际儿保的日期加 3 个月，在 iOS 真机上要正常运行不能出现 `NaN`，并且修正时区差导致的倒计时少一天的 Bug。
*   **解决方案**：
    *   重构 `pages/healthcare/index.js` 的 `calculateNextCheckup` 以及 `pages/dashboard/index.js` 中的对应提醒。
    *   在所有涉及 `new Date(dateStr)` 转换的逻辑中，使用 `.replace(/-/g, '/')` 替换横杠为斜杠，解决 iOS hyphen bug。
    *   使用本地时间零点对比两端时间戳来计算天数差，不再以 `d.toISOString()` 这种 UTC 时区的方式做时间加减，杜绝时差。
*   **关联文件**：
    *   [pages/healthcare/index.js](file:///e:/AAAWork/self/BabyComplementaryFoods/wx_miniprogram/pages/healthcare/index.js)
    *   [pages/dashboard/index.js](file:///e:/AAAWork/self/BabyComplementaryFoods/wx_miniprogram/pages/dashboard/index.js)
    *   [utils/babyHelper.js](file:///e:/AAAWork/self/BabyComplementaryFoods/wx_miniprogram/utils/babyHelper.js)
    *   [pages/baby/index.js](file:///e:/AAAWork/self/BabyComplementaryFoods/wx_miniprogram/pages/baby/index.js)

### 6. 就诊记录卡片天数提醒与历史台账倒序排列
*   **需求描述**：就诊提醒卡片需显示倒计时天数；门诊病历、儿保轨迹、发育评估记录展示时最新添加的内容在最上方，且需去除可能产生的重复卡片。
*   **解决方案**：
    *   在 `calculateNextClinical` 提醒卡片逻辑中，增加 `daysLeft` 属性计算，计算方法同上，对 iOS 完美兼容。
    *   在加载及新增就诊、儿保、发育评估记录时，对数据数组统一调用降序排列（`b.date.localeCompare(a.date)`）。
*   **关联文件**：
    *   [pages/healthcare/index.js](file:///e:/AAAWork/self/BabyComplementaryFoods/wx_miniprogram/pages/healthcare/index.js)

### 7. 数据拉取性能优化 — 实现按需加载局部集合数据
*   **需求描述**：避免进入或刷新任意页面都拉取 14 个集合的全部业务数据。需要各个页面仅刷新与自身强相关的集合，降低高数据量下的加载卡顿、网络流量与云开发数据库的并发开销。
*   **解决方案**：
    *   修改 `login` 云函数，使其接收 `collections` 过滤参数，仅对指定范围内的数据库集合执行 `get` 查询并返回，保持空参全量同步的向后兼容。
    *   改造 `utils/storage.js` 中的 `syncPull` 接口，支持指定局部集合名称并仅覆盖更新本地对应的 LocalStorage 缓存，在局部更新时避免重置宝宝基础档案等静态信息。
    *   修改各页面 `onShow` 与 `onPullDownRefresh`（除 `dashboard` 外），只传递对应的单/多集合（例如排便页拉取 `bowel_records`，饮食页拉取 `milk_water_records`，大事记页拉取 `timeline_events` 等）。
*   **关联文件**：
    *   云函数 [cloudfunctions/login/index.js](file:///e:/AAAWork/self/BabyComplementaryFoods/wx_miniprogram/cloudfunctions/login/index.js)
    *   [utils/storage.js](file:///e:/AAAWork/self/BabyComplementaryFoods/wx_miniprogram/utils/storage.js)
    *   各业务页面 JS 文件。

### 8. 家庭共享协同体验升级 — 扫码绑定、同步码二维码生成与看护人昵称头像展示
*   **需求描述**：家庭协同页面没有展示出其他绑定的成员，需要直观展示所有成员的微信头像及昵称；并提供同步码对应的二维码展示弹窗，以及摄像头一键扫码绑定功能。
*   **解决方案**：
    *   在 `families` 数据库模型中新增 `members_info` 成员头像昵称明细数组。
    *   修改 `updateFamily` 云函数，在创建、加入以及修改个人资料时，自动更新 `members_info`，并针对普通看护人隔离了对创建者 `creator_` 字段的覆盖风险。
    *   小程序家庭共享页面（`pages/family/index`）的看护人列表中以 `members_info` 渲染头像和昵称。
    *   页面增加弹窗组件，以公用 API 生成并展示绑定二维码；增加扫码绑定按钮，集成 `wx.scanCode` API，支持相机扫描后自动提取 `familyId` 并完成协同加入。
*   **关联文件**：
    *   [pages/family/index.wxml](file:///e:/AAAWork/self/BabyComplementaryFoods/wx_miniprogram/pages/family/index.wxml)
    *   [pages/family/index.js](file:///e:/AAAWork/self/BabyComplementaryFoods/wx_miniprogram/pages/family/index.js)
    *   [pages/family/index.wxss](file:///e:/AAAWork/self/BabyComplementaryFoods/wx_miniprogram/pages/family/index.wxss)
    *   [cloudfunctions/updateFamily/index.js](file:///e:/AAAWork/self/BabyComplementaryFoods/wx_miniprogram/cloudfunctions/updateFamily/index.js)


