# 微信云开发数据库基础数据导入指南

本文档说明如何将您的个人历史数据（种子数据）批量导入微信云数据库。这些数据文件存放在 `docs/miniprogram/db_seeds/` 目录中，仅在您本人的云环境中使用，**不会随小程序代码包分发给其他用户**。

---

## 一、种子数据文件清单

| # | 集合名称 | 种子文件 | 内容说明 |
|---|---------|---------|---------|
| 1 | `timeline_events` | [timeline_events.json](db_seeds/timeline_events.json) | 成长大事记（61 条） |
| 2 | `vaccines` | [vaccines.json](db_seeds/vaccines.json) | 疫苗接种记录（24 针） |
| 3 | `healthcares` | [healthcares.json](db_seeds/healthcares.json) | 季度儿保体检（7 次） |
| 4 | `assessments` | [assessments.json](db_seeds/assessments.json) | 发育评估报告（4 项） |
| 5 | `clinical_logs` | [clinical_logs.json](db_seeds/clinical_logs.json) | 临床就诊记录（25 条） |
| 6 | `safe_foods` | [safe_foods.json](db_seeds/safe_foods.json) | 已排敏食材库 |
| 7 | `risk_foods` | [risk_foods.json](db_seeds/risk_foods.json) | 待排敏食材库 |
| 8 | `meal_plans` | [meal_plans.json](db_seeds/meal_plans.json) | 每周辅食菜单 |

> **⚠️ 隐私提醒**：上述文件包含您宝宝的真实医疗与生活数据，请勿将其提交至公开仓库或分享给无关人员。小程序代码包中的种子文件（`wx_miniprogram/data/`）已全部脱敏清空，新用户打开小程序默认为空白状态。

---

## 二、导入方案

### 方案一：云开发控制台直接导入 JSON 文件（最推荐 ⭐️）

微信云开发控制台提供了可视化的数据导入功能，支持直接上传标准的 **JSON 数组文件**。

#### 操作步骤

1. 打开 **微信开发者工具**，点击工具栏顶部的 **"云开发"** 按钮打开云开发控制台。
2. 进入 **"数据库"** 标签页。
3. 点击左侧的 `+` 号，依次创建上表中列出的 **8 个集合**（名称必须与表中 `集合名称` 完全一致）。
4. 选中某个集合（例如 `timeline_events`），点击右侧面板上方的 **"导入"** 按钮。
5. 选择 `db_seeds/` 目录下对应的 JSON 文件，冲突处理选择 **"插入"（Insert）**，点击确定。
6. 对其余 7 个集合重复步骤 4-5 即可。

> **💡 提示**：导入完成后，您通过微信登录小程序即可自动从云端拉取并展示这些历史数据。

---

### 方案二：小程序首次启动自动播种（代码自检）

如果不想手动导入，也可以在小程序的 `app.js` 的 `onLaunch` 钩子中，检测云数据库对应集合是否为空，若为空则通过代码自动批量添加。

```javascript
// app.js 中的自动播种函数示例
async function seedCollectionIfEmpty(collectionName, seedData, babyId) {
  const db = wx.cloud.database();

  // 检测集合是否为空
  const countRes = await db.collection(collectionName).count();
  if (countRes.total === 0) {
    console.log(`检测到 ${collectionName} 集合为空，正在插入初始化数据...`);

    for (const item of seedData) {
      await db.collection(collectionName).add({
        data: {
          ...item,
          baby_id: babyId,
          create_time: new Date()
        }
      });
    }

    console.log(`${collectionName} 初始化写入完毕！共 ${seedData.length} 条记录。`);
  }
}
```

---

### 方案三：编写一键初始化云函数（Seeder Cloud Function）

创建一个专门的云函数 `seedDatabase`，在其中使用服务端 Admin SDK 执行批量写入（不受小程序端单次写入条数限制）。

```javascript
// cloudfunctions/seedDatabase/index.js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { babyId, collectionName, seedData } = event;

  try {
    const tasks = seedData.map(item => {
      return db.collection(collectionName).add({
        data: {
          ...item,
          baby_id: babyId,
          create_time: new Date()
        }
      });
    });

    await Promise.all(tasks);
    return { success: true, message: `${collectionName} 成功导入 ${seedData.length} 条记录！` };
  } catch (e) {
    return { success: false, error: e.message };
  }
};
```

在开发者工具中右键点击该云函数，选择 **"本地调试"** 并运行一次，即可瞬间将基础数据持久化写入微信云数据库。

---

## 三、数据更新与追加

当您有新的数据需要导入时（例如新的一周辅食菜单），只需：

1. 编辑对应的 JSON 种子文件（如 `meal_plans.json`），在数组中追加新记录。
2. 回到云开发控制台，选择对应集合，点击 **"导入"**，选择更新后的 JSON 文件。
3. 冲突处理选择 **"插入"（Insert）**，新增数据会自动追加到已有记录之后。

> **💡 提示**：导入是追加操作，不会覆盖已有数据。如果需要替换某条记录，请先在控制台手动删除旧记录后再导入。
