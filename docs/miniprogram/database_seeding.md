# 微信云开发数据库基础数据导入指南

为了让小程序在首次运行时即包含 **61 条大事记**、**24 针疫苗排班**、**7 次季度儿保**、**4 次发育评估** 以及 **25 条就诊记录**，我们需要将这些初始化基础数据（种子数据）导入到微信云数据库中。

以下是三种最常用、最高效的导入方案。

---

## 方案一：云开发控制台直接导入 JSON 文件 (最推荐 ⭐️)

微信云开发控制台提供了可视化的数据导入功能，支持直接上传标准的 **JSON 数组文件**。

### 1. 导入步骤
1. 打开 **微信开发者工具**，点击工具栏顶部的 **“云开发”** 按钮打开云开发控制台。
2. 进入 **“数据库”** 标签页。
3. 点击左侧的 `+` 号创建下列 5 个集合（名称必须完全一致）：
   * `timeline_events` (成长大事记)
   * `vaccines` (疫苗接种表)
   * `healthcares` (季度体检表)
   * `assessments` (发育评估表)
   * `clinical_logs` (临床就诊日志)
4. 选中某个集合（例如 `timeline_events`），点击右侧面板上方的 **“导入”** 按钮。
5. 选择对应的 JSON 文件（下方已为您整理好文件内容），冲突处理选择 **“插入”**（Insert），点击确定即可完成批量导入。

---

### 2. 完整的数据种子文件列表 (JSON 数组)

我们已经在项目本地为您整理并输出了全部的历史基础数据，您可以直接将下列文件导入云数据库：
* 📜 **大事记 (61条)**：[docs/miniprogram/db_seeds/timeline_events.json](db_seeds/timeline_events.json)
* 📜 **疫苗规划 (24针)**：[docs/miniprogram/db_seeds/vaccines.json](db_seeds/vaccines.json)
* 📜 **体检儿保 (7次)**：[docs/miniprogram/db_seeds/healthcares.json](db_seeds/healthcares.json)
* 📜 **发育评估 (4项)**：[docs/miniprogram/db_seeds/assessments.json](db_seeds/assessments.json)
* 📜 **就诊就医卡 (25条)**：[docs/miniprogram/db_seeds/clinical_logs.json](db_seeds/clinical_logs.json)

导入时选择对应的文件上传即可，云开发控制台会自动将数组解析并添加为云数据库的文档记录。

---

## 方案二：编写小程序代码自动插入 (首次运行检测)

如果不想手动导入，也可以在小程序的 `app.js` 的 `onLaunch` 钩子中，检测如果云数据库对应集合为空，则通过代码自动批量添加（适合发布给其他用户使用时进行自动初始化）。

### 示例逻辑代码：
```javascript
// app.js 中的自动播种函数
async function seedCollectionIfEmpty() {
  const db = wx.cloud.database();
  
  // 1. 检测 timeline_events 是否为空
  const countRes = await db.collection('timeline_events').count();
  if (countRes.total === 0) {
    console.log("检测到 timeline_events 集合为空，正在插入初始化数据...");
    
    // 引入种子数组数据
    const defaultEvents = [
      { date: "2026-06-18", category: "日常医疗", title: "斜视遮盖法", content: "每天遮盖左眼4小时" }
      // 更多数据...
    ];
    
    // 循环写入
    for (const item of defaultEvents) {
      await db.collection('timeline_events').add({
        data: {
          ...item,
          baby_id: "default_baby_id",
          create_time: new Date()
        }
      });
    }
    console.log("初始化大事记写入完毕！");
  }
}
```

---

## 方案三：编写一键初始化云函数 (Seeder Cloud Function)

创建一个专门的云函数 `seedDatabase`，在其中使用服务端 Admin SDK 执行批量写入（不受小程序端单次写入条数限制）。

### 云函数代码：
```javascript
// cloudfunctions/seedDatabase/index.js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { babyId } = event;
  
  // 静态导入 24 针疫苗数据
  const defaultVaccines = [
    { name: "乙肝疫苗", dose: "第1剂", status: "已接种", actualDate: "2025-12-12" },
    { name: "乙肝疫苗", dose: "第2剂", status: "已接种", actualDate: "2026-01-30" },
    { name: "乙肝疫苗", dose: "第3剂", status: "需补种", actualDate: null }
    // 其他...
  ];

  try {
    const tasks = defaultVaccines.map(v => {
      return db.collection('vaccines').add({
        data: {
          ...v,
          baby_id: babyId,
          create_time: new Date()
        }
      });
    });
    
    await Promise.all(tasks);
    return { success: true, message: "全量疫苗基础数据成功存入云端！" };
  } catch (e) {
    return { success: false, error: e.message };
  }
};
```
在开发者工具中右键点击该云函数，选择 **“本地调试”** 并运行一次，即可瞬间将所有的基础疫苗规则和历史数据持久化写进微信云数据库中。
