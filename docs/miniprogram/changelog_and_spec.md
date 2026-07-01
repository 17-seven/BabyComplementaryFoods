# 宝宝辅食与健康管理系统 — 功能全览与变更日志

> 文档生成日期：2026-06-29  
> 项目仓库：https://github.com/17-seven/BabyComplementaryFoods

---

## 一、项目结构总览

```
BabyComplementaryFoods/
├── src/                        # Vue 3 Web 管理后台（PC/平板/手机自适应）
│   ├── views/                  # 页面组件
│   └── utils/storage.js        # LocalStorage 封装
├── wx_miniprogram/             # 微信小程序原生工程
│   ├── app.js / app.json / app.wxss
│   ├── cloudfunctions/         # 云函数（3个）
│   │   ├── login/              # 登录 + 拉取全量数据
│   │   ├── updateFamily/       # families集合写操作
│   │   └── syncData/           # 业务数据批量云同步
│   ├── pages/                  # 13个页面
│   ├── utils/
│   │   ├── storage.js          # 微信缓存封装 + 自动云同步
│   │   └── babyHelper.js       # 纠正月龄计算
│   └── data/                   # 脱敏空白种子数据
└── docs/                       # 业务规划与技术文档
    └── miniprogram/db_seeds/   # 真实历史数据（禁止修改）
```

---

## 二、微信小程序功能模块

### 页面列表（app.json 路由顺序）

| # | 页面路径 | 功能描述 |
|---|---|---|
| 1 | `pages/login/index` | **登录页（默认入口）**：微信一键授权、看护人昵称/头像设置、隐私协议 |
| 2 | `pages/dashboard/index` | **首页概览**：宝宝名片、月龄展示、疫苗/儿保/就诊提醒、今日护理打卡汇总、**近7日奶量/水量/排便趋势图** |
| 3 | `pages/mealplan/index` | **辅食周计划**：周历食谱、菜品就地编辑、营养合规校验报告、每日备注 |
| 4 | `pages/healthcare/index` | **医疗儿保**：24针疫苗管理、季度儿保、发育评估、25条临床就诊记录 |
| 5 | `pages/timeline/index` | **成长大事记**：时间轴瀑布流、按分类筛选、关键字搜索、悬浮新增按钮 |
| 6 | `pages/vision/index` | **护理概览（计时模块）**：支持两种类型——⏱️计时器（开始/停止自动计时）、📅时间段（手动填写开始~结束时间）；用户可自由新增/删除模块 |
| 7 | `pages/sleep/index` | **😴 睡眠记录**：今日睡眠进度卡（12小时目标）、添加睡眠时间段记录、历史列表 |
| 8 | `pages/bowel/index` | **排便记录**：便便颜色/性状/有无出血记录、历史日志 |
| 9 | `pages/nutrition/index` | **饮奶饮水记录**：每日奶量/水量打卡、进度统计 |
| 10 | `pages/allergen/index` | **排敏食材管理**：已排敏/未排敏食材池、食材详情与打卡观察、自定义新增 |
| 11 | `pages/my/index` | **我的**：**看护人头像/昵称可编辑**、宝宝档案快捷入口、宝宝睡眠入口、数据导入（开发者模式）、版本信息 |
| 12 | `pages/album/index` | **宝宝相册**：最多10张照片上传（云存储）、设为宝宝头像 |
| 13 | `pages/family/index` | **家庭协同**：创建家庭组、生成邀请码、爱人加入共享数据 |
| 14 | `pages/baby/index` | **宝宝档案**：姓名、出生日期、早产纠正天数自动计算 |

---

## 三、云函数架构

### 设计原则
微信云数据库安全规则限制客户端直接访问 `families` 集合，所有敏感数据库操作必须通过云函数（管理员权限）执行。

### 三个云函数说明

#### `login` — 登录与数据恢复
- 获取用户真实 OpenID（服务端安全获取）
- 按 OpenID 查询 `families` 集合，找到用户所属家庭组
- 批量拉取该家庭所有业务集合数据（11个集合，每集合最多100条）
- 一次调用返回：`{ openid, familyRecord, businessData }`

```
businessData 包含：
timeline_events / vaccines / healthcares / assessments /
clinical_logs / safe_foods / risk_foods / meal_plans /
bowel_records / milk_water_records / eyepatch_records
```

#### `updateFamily` — families 集合写操作
- `action: 'create'`：创建新家庭组（自动带入 openid 到 members）
- `action: 'update'`：更新家庭组字段（宝宝档案、头像、看护人昵称等）
- `action: 'addMember'`：将新成员 openid 加入 members 数组

#### `syncData` — 业务数据批量同步
- 接收 `{ collection, familyId, records[] }` 参数
- 按 `sync_id`（record.id 或 record.name）做 upsert
- 被 `utils/storage.js` 的 `triggerAutoCloudSync` 自动调用

---

## 四、数据云同步机制

### 本地 Storage Key → 云集合 映射

| 本地 Key | 云集合 | 触发时机 |
|---|---|---|
| `bowel_records` | `bowel_records` | 新增/删除排便记录 |
| `milk_water_records` | `milk_water_records` | 饮奶/饮水打卡 |
| `eyepatch_records` | `eyepatch_records` | 眼罩计时保存 |
| `baby_timeline_events` | `timeline_events` | 大事记新增/删除 |
| `baby_vaccines_list` | `vaccines` | 疫苗状态更新 |
| `baby_healthcares` | `healthcares` | 儿保记录保存 |
| `baby_clinical_logs` | `clinical_logs` | 就诊记录编辑 |
| `mp_safe_foods_list` | `safe_foods` | 食材排敏/新增 |
| `mp_risk_foods_list` | `risk_foods` | 食材移入风险池 |
| `baby_week_plans` | `meal_plans` | 辅食周计划编辑 |
| `baby_assessments` | `assessments` | 发育评估保存 |

### 云数据库安全规则配置

**`families` 集合**（禁止客户端直接读写）：
```json
{ "read": false, "write": false }
```

**其余11个业务集合**（按家庭组成员校验）：
```json
{
  "read": "auth.openid in get('database.families.' + doc.family_id).members",
  "write": "auth.openid in get('database.families.' + doc.family_id).members"
}
```

---

## 五、登录与缓存恢复流程

```
扫码进入小程序
    ↓
pages/login/index（默认入口）
    ↓
点击微信一键登录 → 调用 login 云函数
    ↓
云函数返回 { openid, familyRecord, businessData }
    ↓
有 familyRecord.creator_nickname？
    ├── 是 → 写入所有基础数据 + 11个业务集合到本地Storage
    │         → 跳转 pages/dashboard/index
    └── 否 → 检查本地缓存 → 有则直接登录
              → 无则弹出填写看护人资料抽屉
                  → submitProfile → 保存本地 + 通过updateFamily云函数同步到云端
```

### 清除缓存后重新登录
Dashboard `onShow` 检测到未登录 → `wx.reLaunch` 到登录页 → 正常走上述流程，数据从云端完整恢复。

---

## 六、本次开发变更日志

### 2026-07-01 — 协同解绑重绑无损合并、多页面实时静默同步与下拉刷新、疫苗唯一ID与去重、iOS日期NaN兼容

#### 功能增强与修复

| 模块/页面 | 变更内容 |
|---|---|
| `utils/storage.js` | 1. 新增 `syncMerge` 双向数据去重合并机制，支持在重置家庭组后将本地与云端业务记录合并，高优先保留接种过的疫苗状态。<br>2. 新增 `syncPull` 支持多页面全量拉取云端覆盖写入本地。<br>3. **优化**：重构 `syncPull` 支持可选传入单/多业务集合名称，在局部刷新时仅覆盖刷新本地对应缓存，不干扰其他配置。 |
| `pages/family/index.js` | 在创建家庭与加入家庭成功的回调函数中引入 `syncMerge` 双向合并，防止用户更换绑定时数据丢失。 |
| `cloudfunctions/login` | 1. 改进 `login` 云函数，使空集合在云数据库中返回 `[]`，以便客户端同步删除多端已废弃的数据；并在 `pages/login/index.js` 登录恢复流程中适配空数组覆盖。<br>2. **优化**：支持可选的 `collections` 参数，仅对请求的指定数据库集合执行查询并返回，大幅减轻数据库并发压力。 |
| `onShow & 下拉刷新` | 1. 在 `dashboard`、`bowel`、`nutrition`、`classes`、`mealplan`、`healthcare`、`timeline`、`growth`、`vision` 的 `onShow` 中增加静默后台 `syncPull`。<br>2. 在各个页面的 `.json` 配置中开启 `enablePullDownRefresh` 并添加 `onPullDownRefresh` 强制刷新。<br>3. **优化**：将 `dashboard` 外所有页面的 `syncPull` 均修改为局部的按需传参调用，杜绝任何页面切换刷新都查询 14 个云数据库集合的大流量开销。 |
| `pages/mealplan/index.js` | 规范辅食周计划标题命名，首周为“第1周辅食计划”，新增周计划正则自动剥离空格，命名为 `"第${nextWeekNum}周辅食计划"`。 |
| `data/healthcare.js` | 为 24 针疫苗对象补齐唯一的 `id` 主键 (`vac_01` ~ `vac_24`)，解决由于同名疫苗在云端上传合并时被覆盖造成的数据严重错乱问题。 |
| `cloudfunctions/syncData` | 针对云数据库由于旧 Bug 产生的重复 `sync_id` 文档，在同步运行前执行物理扫描与批量清理。 |
| `Date 转换 (iOS 兼容)` | 针对所有 `new Date(dateStr)` 日期实例化的场景（年龄计算、儿保下次推算、就诊卡片倒计时等），在 parsing 之前将横杠 `-` 统一替换为 `/`，解决 iOS 真机 `NaN` 问题；并统一基于本地时间零点对比，避免时差少一天。 |
| `pages/healthcare/index.js` | 1. `initData` 阶段加入针对低版本疫苗数据的唯一 ID 补全及因去重裁剪数据的自动恢复。<br>2. 就诊提醒支持倒计时 `daysLeft` 属性计算。<br>3. 门诊就诊、儿保轨迹、发育评估记录在加载/新增后自动按日期和 `id` 降序排列。 |

### 2026-06-30 — 新功能：睡眠记录 / 趋势图 / 看护人编辑 / 护理概览扩展

#### 新增页面

| 页面 | 变更 |
|---|---|
| `pages/sleep/index`（新建） | 独立睡眠记录页：今日睡眠进度卡（目标12小时）、折叠式添加表单（日期+入睡/醒来时间选择器+备注）、历史列表可删除、跨夜自动处理（结束时间≤开始时间时+24h）、`onShow` 未登录守卫 |

#### 功能增强

| 文件 | 变更 |
|---|---|
| `pages/dashboard/index.js` | `loadBabyStatus` 新增本周（周一~周日）统计计算：根据当天日期定位本周一，生成7天日期列表，读取 `milk_water_records`/`bowel_records` 聚合奶量/水量/排便次数，归一化柱高（最大值映射80rpx），写入 `weekStats` 数组；标签固定为"一二三四五六日" |
| `pages/dashboard/index.wxml` | 在量仪格栅与大事记之间插入"📊 近7日趋势"条形图区块（奶量/水量/排便三行，每行7列） |
| `pages/dashboard/index.wxss` | 新增 `.week-chart-card`、`.wc-row`、`.wc-bars`、`.wc-col`、`.wc-bar-wrap`、`.wc-bar`、`.wc-milk/.wc-water/.wc-bowel`、`.wc-day`、`.wc-val` 等图表样式 |
| `pages/my/index.js` | data 新增 `showEditModal/editNickname/editAvatarTemp` 字段；新增 `openEditModal`、`closeEditModal`、`onChooseAvatar`、`onEditNicknameInput`、`saveEditProfile` 函数（头像保存至 `USER_DATA_PATH`，昵称同步写 Storage + `app.globalData`） |
| `pages/my/index.wxml` | 头像区包裹 `.avatar-edit-wrap` + 右下角编辑徽标 + `bindtap="openEditModal"`；昵称行新增"编辑"链接；文件末尾增加编辑看护人弹窗（`open-type="chooseAvatar"` 换头像 + 昵称输入） |
| `pages/my/index.wxss` | 新增 `.avatar-edit-wrap`、`.avatar-edit-badge`、`.edit-profile-link`、`.edit-avatar-section`、`.edit-avatar-img`、`.edit-avatar-btn` 样式 |
| `pages/my/index.wxml` | "宝宝睡眠记录"菜单项 `data-page` 由 `vision` 改为 `sleep` |
| `pages/vision/index.js` | 新增 `type` 字段支持（`timer` 计时器 / `range` 时间段）；`loadAllTimers` 排除默认 `eyepatch` 模块；`saveNewTimer` 写入 `type` 字段并调用 `updateFamily` 云函数同步 |

#### Bug 修复

| 文件 | 变更 |
|---|---|
| `pages/bowel/index.js` | `loadBowelLogs` 移除硬编码默认假数据，改为 `getStorage('bowel_records', [])` |

#### 路由注册

| 文件 | 变更 |
|---|---|
| `app.json` | 在 `pages/vision/index` 后新增 `pages/sleep/index` |

---

### 2026-06-29 — 登录/权限/数据恢复

| 提交 | 变更内容 |
|---|---|
| feat | 新增小程序登录页、数据同步模块及资源文件 |
| fix | 清缓存后自动跳登录页；修复昵称云同步缺失 |
| fix | **将 families 查询和数据恢复移入 login 云函数**，彻底绕过客户端权限限制（`-502003`） |
| fix | **新增 updateFamily 云函数**，将所有 families 集合写操作从客户端迁移到云函数 |
| fix | **新增 syncData 云函数**，修复全量数据云同步（之前客户端直接查库被权限拦截） |
| fix | storage.js `triggerAutoCloudSync` 改为调用 syncData 云函数；补全食材/周计划 key |
| fix | app.json 将 login 页设为小程序默认入口 |

### 2026-06-29 — UI / 交互修复

| 提交 | 变更内容 |
|---|---|
| fix | **大事记弹窗不显示**：将 `floating-btn` 和 `modal-overlay` 移出 `.page-transition` 容器（`will-change: transform` 导致 `position:fixed` 相对容器而非视口定位） |
| fix | **食材管理弹窗不显示**：同上，allergen 页 modal 移出容器 |
| fix | **分类 picker 取值错误**：timeline 和 allergen 页的 `mode=selector` picker 返回 index，修复为通过专用 handler 转成名称 |
| fix | Dashboard 宝宝头像 `onAvatarTap`：有图→大图预览；默认图→跳相册页 |
| fix | album 页设为头像/删照片/同步相册改为调用 updateFamily 云函数 |
| fix | baby 页保存档案改为调用 updateFamily 云函数 |
| fix | family 页创建家庭组/加入家庭改为调用 updateFamily 云函数；创建时带入 creator_nickname |
| fix | login submitProfile 昵称同步改为调用 updateFamily 云函数 |

---

## 七、开发者数据导入说明

数据导入入口隐藏在"我的"页面：
1. 连续点击**版本号 10 次**解锁开发者面板
2. 选择 `docs/miniprogram/db_seeds/` 目录下的 JSON 文件（支持多选）
3. 系统自动写入本地 Storage + 同步到对应云数据库集合

支持的文件名（模糊匹配）：
`timeline_events` / `vaccines` / `healthcares` / `assessments` /
`clinical_logs` / `safe_foods` / `risk_foods` / `meal_plans`

> ⚠️ `docs/miniprogram/db_seeds/` 内的 JSON 文件包含真实医疗数据，**严禁 AI 或开发者修改**

---

## 八、云函数部署清单（每次更新代码后需重新部署）

在微信开发者工具中，右键对应目录 → **上传并部署：云端安装依赖**

- [ ] `cloudfunctions/login`
- [ ] `cloudfunctions/updateFamily`
- [ ] `cloudfunctions/syncData`
