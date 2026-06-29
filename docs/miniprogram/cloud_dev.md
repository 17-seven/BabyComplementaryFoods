# 微信云开发 (CloudBase) 数据库与服务集成方案

为了支持多家庭成员（爸爸、妈妈、长辈、育儿嫂）**多人协同记账与实时同步**数据，珑珑成长助手小程序将采用微信云开发 (Cloud Development) 作为后端支撑。以下是详细的云开发架构与数据库集合设计。

---

## 一、 初始化与安全架构 (Cloud Init & Security)

### 1. 云环境初始化
在小程序入口文件 `app.js` 中，需引入并开启云开发能力，并记录当前登录用户的 `_openid`：
```javascript
// app.js
App({
  onLaunch: function () {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: 'baby-helper-prod-xxxx', // 替换为真实的云开发环境 ID
        traceUser: true,             // 追踪用户登录
      });
    }
    
    // 获取用户 OpenID
    this.getOpenId();
  },

  globalData: {
    openid: '',
    babyId: 'default_baby_id' // 多家庭协同共享的宝宝ID
  },

  getOpenId: function() {
    wx.cloud.callFunction({
      name: 'login',
      success: res => {
        this.globalData.openid = res.result.openid;
      }
    });
  }
});
```

### 2. 多看护人数据共享设计 (Family Sharing)
早产宝宝的日常照护通常需要全家参与，本方案设计了「家庭房/邀请码」的绑定逻辑：
* **`family_room`** 集合：存放家庭房间记录，内含 `baby_id`、主看护人 `creator_openid` 以及加入的协同看护人数组 `member_openids`。
* **数据安全规则 (Security Rules)**：
  * 对所有包含 `baby_id` 的集合，数据库访问权限配置为：
    `"read": "auth.openid in doc.member_openids", "write": "auth.openid in doc.member_openids"`
  * 这能防止其他家庭越权获取宝宝的历史病历隐私。

---

## 二、 云数据库集合设计 (Cloud DB Collections)

系统使用 NoSQL 类型的云数据库进行建模，共设计 7 个主要集合。

### 1. 大事记集合 (timeline_events)
* **集合属性**：记录大运动、用药、康复、转奶等历史大事。
* **文档字段**：
```json
{
  "_id": "uuid_xxx",
  "_openid": "user_openid_xxx",
  "baby_id": "baby_id_xxx",
  "date": "2026-06-18",
  "category": "日常医疗",
  "title": "斜视遮盖法",
  "content": "开始遵医嘱进行斜视矫正遮盖治疗。第一天遮盖左眼，每天佩戴遮盖眼罩4小时。",
  "media_urls": ["cloud://.../img1.png"], // 存放在云存储中的病历图、药物图
  "create_time": "2026-06-18T08:30:00.000Z"
}
```

### 2. 季度儿保指标 (healthcares)
* **集合属性**：记录身高、体重、头围的随访数值。
* **文档字段**：
```json
{
  "_id": "uuid_xxx",
  "baby_id": "baby_id_xxx",
  "date": "2026-06-18",
  "height": 78.0,
  "weight": 9.85,
  "headCircumference": 45.5,
  "feedback": "儿保体检，各指标发育均符合中位数以上。大腿后侧仍微紧。",
  "doctor": "姜春颖",
  "create_time": "2026-06-18T10:00:00.000Z"
}
```

### 3. 临床门诊就诊卡 (clinical_logs)
* **集合属性**：心脏超声、核磁、脑电图等 25 项精细医疗就诊历史。
* **文档字段**：
```json
{
  "_id": "uuid_xxx",
  "baby_id": "baby_id_xxx",
  "name": "眼睛复查",
  "date": "2026-09-15",
  "desc1": "四院 崔丽红",
  "desc2": "三个月后散瞳复查",
  "result": "散瞳筛查，视网膜发育正常，散瞳通过毕业。",
  "status": "未完成", // "已完成" 或 "未完成"
  "create_time": "2026-06-29T07:00:00.000Z"
}
```

### 4. 遮盖眼罩计时记录 (eyepatch_records)
* **集合属性**：每日视力矫正遮盖时段明细。
```json
{
  "_id": "uuid_xxx",
  "baby_id": "baby_id_xxx",
  "date": "2026-07-01",
  "start_time": "09:41",
  "end_time": "11:51",
  "duration_minutes": 130, // 自动换算出的分钟数
  "type": "timer" // "timer" (计时器生成) 或 "manual" (手动补登)
}
```

### 5. 辅食周计划食谱 (meal_plans)
```json
{
  "_id": "uuid_xxx",
  "baby_id": "baby_id_xxx",
  "week_num": "2026W27",
  "start_date": "2026-06-29",
  "end_date": "2026-07-05",
  "days": [
    {
      "date": "2026-06-29",
      "day_name": "周一",
      "meals": {
        "breakfast": "蛋黄 + 小米粥",
        "lunch": "猪肉香菇青菜烩饭",
        "dinner": "鳕鱼西兰花南瓜泥",
        "snack": "苹果泥"
      },
      "note": "今天大便正常"
    }
  ],
  "validation_report": {
    "red_meat_count": 5,
    "grain_percent": 26,
    "egg_days": 7,
    "allergen_passed": true,
    "naming_format_passed": true
  }
}
```

---

## 三、 微信云函数接口 (Cloud Functions)

### 1. 云函数：`syncBabyData` (同步拉取与多端冲突合并)
家庭成员记账可能存在并发情况，云函数从云端拉取最新记录，并执行时间戳优先的合并。

```javascript
// cloudfunctions/syncBabyData/index.js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { babyId, lastSyncTime } = event;
  const _ = db.command;

  try {
    // 1. 查询此同步时间戳之后由其他看护人更新的所有记录
    const updatedEvents = await db.collection('timeline_events')
      .where({
        baby_id: babyId,
        create_time: _.gt(new Date(lastSyncTime))
      })
      .orderBy('create_time', 'desc')
      .get();

    return {
      success: true,
      syncTime: new Date().toISOString(),
      dataList: updatedEvents.data
    };
  } catch (e) {
    return { success: false, errMsg: e.message };
  }
};
```

### 2. 云函数：`validateWeeklyPlan` (辅食食谱自动化合规检查)
由于辅食计划涉及过敏源拦截及红肉营养周频次校验，将这些密集逻辑运算放到云函数端，不仅能分担手机端负荷，还能动态更新排敏规则数据库：

```javascript
// cloudfunctions/validateWeeklyPlan/index.js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { weekPlanData, babyId } = event;
  
  // 1. 获取该宝宝通过的已排敏食材池和未排敏食材池
  const babyDoc = await db.collection('baby_allergen_pools').doc(babyId).get();
  const allowedFoods = babyDoc.data.allowed_foods || [];
  const bannedFoods = babyDoc.data.banned_foods || [];

  let report = {
    redMeatCount: 0,
    grainPercent: 0,
    eggDays: 0,
    hasBannedFood: false,
    formatError: false,
    bannedDetails: []
  };

  // 2. 遍历 7 天餐次文本分析
  let totalMealsCount = 0;
  let grainMealsCount = 0;
  let eggCount = 0;

  weekPlanData.days.forEach(day => {
    let dayHasEgg = false;
    Object.values(day.meals).forEach(mealText => {
      if (!mealText) return;
      totalMealsCount++;

      // 校验是否有 "+" 拼接符号命名
      if (mealText.includes('+')) {
        report.formatError = true;
      }

      // 统计红肉 (猪/牛)
      if (mealText.includes('猪') || mealText.includes('牛')) {
        report.redMeatCount++;
      }

      // 统计粗粮餐次
      if (mealText.includes('小米') || mealText.includes('胚芽米') || mealText.includes('燕麦')) {
        grainMealsCount++;
      }

      // 统计鸡蛋频次
      if (mealText.includes('蛋') || mealText.includes('蛋白') || mealText.includes('蛋黄')) {
        dayHasEgg = true;
      }

      // 拦截未排敏违禁食材
      bannedFoods.forEach(food => {
        if (mealText.includes(food)) {
          report.hasBannedFood = true;
          report.bannedDetails.push({ food, meal: mealText, date: day.date });
        }
      });
    });
    
    if (dayHasEgg) eggCount++;
  });

  report.grainPercent = Math.round((grainMealsCount / totalMealsCount) * 100);
  report.eggDays = eggCount;

  return {
    success: true,
    validationReport: report
  };
};
```

---

## 四、 云存储利用 (Cloud Storage)

在大事记记录（如药物外包装、用药处方、湿疹图片）或就诊报告上传时，必须将本地图片转换为云文件 ID `cloud://`：

```javascript
// 小程序上传逻辑示例
wx.chooseImage({
  count: 1,
  success: (res) => {
    const filePath = res.tempFilePaths[0];
    const cloudPath = `medical-attachments/baby_${Date.now()}_${Math.random() * 1000}.png`;
    
    wx.cloud.uploadFile({
      cloudPath,
      filePath,
      success: uploadRes => {
        console.log("上传成功，云文件ID为:", uploadRes.fileID);
        // 保存 uploadRes.fileID 到大事记或临床日志文档中
      }
    });
  }
});
```
通过云存储，所有照护成员在查看历史病历卡时，均可以点击加载缩略图，极大地增强了协同就诊的便利性。
