# 微信小程序开发与移植技术方案说明书

本方案详细梳理了如何将原本基于 Vue 3 + Vite 的 Web 应用移植开发为原生微信小程序。

---

## 一、 开发环境与目录结构规划

### 1. 开发技术选型
* **开发框架**：微信原生小程序框架（WXML + WXSS + JS），不引入额外的编译框架，保证小程序启动速度和首屏渲染性能。
* **图表组件**：采用 [ec-canvas](https://github.com/ecomfe/echarts-weixin) 微信小程序 ECharts 适配组件，用于替换原 Vue 项目中的 Chart.js，实现身高、体重曲线测绘。

### 2. 小程序工程目录结构
```bash
miniprogram/
├── assets/                     # 静态资源 (图标、图片)
├── components/                 # 公共自定义组件 (如环形进度条环)
│   └── progress-ring/          # 今日指标圆环组件
├── ec-canvas/                  # ECharts 图表支持组件
├── pages/                      # 页面目录
│   ├── dashboard/              # 首页概览页
│   ├── mealplan/               # 辅食周计划与校验
│   ├── healthcare/             # 疫苗、儿保、评估、就诊
│   ├── timeline/               # 大事记时间轴
│   ├── vision/                 # 遮盖眼罩计时
│   ├── bowel/                  # 便便记录
│   ├── nutrition/              # 饮奶与水记录
│   ├── allergen/               # 排敏食物管理
│   └── my/                     # 个人我的设置
├── utils/
│   ├── storage.js              # 微信持久化缓存工具
│   └── babyHelper.js           # 纠正月龄计算、日期处理等公共逻辑
├── app.js                      # 小程序入口逻辑 (监听启动、载入种子数据)
├── app.json                    # 小程序全局配置文件 (配置TabBar与页面路由)
└── app.wxss                    # 全局 CSS 样式变量与重置定义
```

---

## 二、 离线存储适配 (Storage Wrapper)

在 Web 端使用的是 `localStorage`。在微信小程序中，需要使用同步缓存 API `wx.getStorageSync` 与 `wx.setStorageSync` 进行平替。

### 微信小程序 `utils/storage.js` 实现代码：
```javascript
// utils/storage.js

/**
 * 读取本地缓存，若不存在则返回默认值
 */
function getStorage(key, defaultValue) {
  try {
    const val = wx.getStorageSync(key);
    if (val === undefined || val === '' || val === null) {
      return defaultValue;
    }
    return val;
  } catch (e) {
    console.error("读取微信缓存失败", e);
    return defaultValue;
  }
}

/**
 * 写入本地同步缓存
 */
function setStorage(key, value) {
  try {
    wx.setStorageSync(key, value);
  } catch (e) {
    console.error("写入微信缓存失败", e);
  }
}

/**
 * 获取今日 ISO 日期格式 (YYYY-MM-DD)
 */
function getTodayString() {
  const d = new Date();
  const year = d.getFullYear();
  let month = d.getMonth() + 1;
  let day = d.getDate();
  if (month < 10) month = '0' + month;
  if (day < 10) day = '0' + day;
  return `${year}-${month}-${day}`;
}

module.exports = {
  getStorage,
  setStorage,
  today: getTodayString
};
```

---

## 三、 核心业务逻辑算法移植

### 1. 纠正月龄与实际月龄计算器
根据王玧初宝宝出生日（`2025-02-18`，早产 `29w+6`，即提前了 **71 天** 出生），在小程序中进行月龄换算：

```javascript
// utils/babyHelper.js

/**
 * 计算实际与纠正月龄
 * @param {string} birthDateStr 生日 (格式 "2025-02-18")
 * @param {number} prematureDays 早产天数 (王玧初为 71 天)
 */
function calculateBabyAge(birthDateStr = "2025-02-18", prematureDays = 71) {
  const birth = new Date(birthDateStr);
  const now = new Date();
  
  // 1. 计算实际相差总天数
  const diffTime = now.getTime() - birth.getTime();
  const actualTotalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  // 2. 实际月龄计算
  const actualAge = getAgeDetailString(actualTotalDays);
  
  // 3. 纠正月龄计算 (减去早产天数)
  const correctedTotalDays = actualTotalDays - prematureDays;
  let correctedAge = "已足月";
  if (correctedTotalDays > 0) {
    correctedAge = getAgeDetailString(correctedTotalDays);
  } else {
    correctedAge = "未到纠正预产期";
  }
  
  return {
    actualAge,
    correctedAge,
    actualTotalDays
  };
}

function getAgeDetailString(totalDays) {
  const months = Math.floor(totalDays / 30.4);
  const remainingDays = Math.floor(totalDays % 30.4);
  return `${months}月${remainingDays}天`;
}
```

### 2. 疫苗补种排班算法 (基于 15 天步长动态滚算)
疫苗在接种某一剂次打卡完成后，需要顺延下一针排程。

```javascript
// pages/healthcare/index.js 中的逻辑函数

function regenerateVaccineSchedule(vaccineList, catchUpStartDate) {
  // 过滤出待补种与推荐接种列表
  const dueVaccines = vaccineList.filter(v => v.status === '需补种' || v.status === '推荐接种');
  const base = new Date(catchUpStartDate);
  
  return dueVaccines.map((v, i) => {
    const plannedDate = new Date(base);
    // 关键核心：第 i 针，顺延 i * 15 天
    plannedDate.setDate(plannedDate.getDate() + i * 15);
    
    const plannedStr = plannedDate.toISOString().slice(0, 10);
    const curr = new Date();
    const diffTime = plannedDate.getTime() - curr.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return {
      ...v,
      plannedDate: plannedStr,
      daysLeft: diffDays > 0 ? diffDays : 0
    };
  });
}
```

---

## 四、 WXSS 自适应适配与布局技巧

### 1. 从 Web CSS 转换为 WXSS
* 原 Vue 项目中使用的 CSS 像素 `px` 单位，应全面使用小程序的自适应物理像素单位 **`rpx`** 替换。
* 微信小程序规定屏幕总宽固定为 **`750rpx`**。
* **转换公式**：在常规 $375\text{px}$ 视觉稿下，$1\text{px} = 2\text{rpx}$。

```css
/* 例如在 Web 端的 Layout 卡片宽度 */
.card {
  width: calc(100% - 32px);
  padding: 16px;
  border-radius: 8px;
}

/* 微信小程序 WXSS 编写 */
.card {
  width: 686rpx; /* (750rpx - 32rpx*2) */
  padding: 32rpx;
  border-radius: 16rpx;
}
```

### 2. 页面适配底部 TabBar 安全距离 (SafeArea)
为了防止各型号 iPhone 底部小黑条遮挡列表操作，在大事记、医疗和食谱计划等滚动底部的页面，样式应追加：
```css
.scroll-container {
  padding-bottom: calc(120rpx + env(safe-area-inset-bottom));
}
```
这能确保在任何手机屏幕下，页面底部的悬浮按钮和列表均不会被 TabBar 遮挡。
