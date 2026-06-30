// pages/mealplan/index.js
const { getStorage, setStorage } = require('../../utils/storage.js');
const { defaultWeekPlans } = require('../../data/mealPlan.js'); // 获取小程序的周种子数据

Page({
  data: {
    weekPlans: [],
    currentWeekIndex: 0,
    currentWeek: null,
    notes: {}, // 每日食谱大备注存储对象
    
    // 规则校验结果
    rules: {
      meatPassed: false,
      meatCount: 0,
      fishShrimpLiverCount: 0,
      fishShrimpLiverPassed: false,
      grainPercent: 0,
      grainPassed: false,
      eggDays: 0,
      eggPassed: false,
      namingPassed: true,
      allergenPassed: true,
      allergenLogs: []
    }
  },

  onShow: function () {
    this.initMealPlans();
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
    }
  },

  initMealPlans: function () {
    // 获取本地周计划列表，没有则用种子数据
    const list = getStorage('baby_week_plans', defaultWeekPlans);
    const activeIndex = this.data.currentWeekIndex;
    const currentWeek = list[activeIndex] || list[0] || null;

    this.setData({
      weekPlans: list,
      currentWeek: currentWeek,
      notes: getStorage('meal_day_notes', {})
    }, () => {
      this.validateRules();
    });
  },

  // 切换不同周
  switchWeek: function (e) {
    const direction = e.currentTarget.dataset.dir;
    let index = this.data.currentWeekIndex;
    if (direction === 'prev' && index > 0) {
      index--;
    } else if (direction === 'next' && index < this.data.weekPlans.length - 1) {
      index++;
    }

    this.setData({
      currentWeekIndex: index,
      currentWeek: this.data.weekPlans[index]
    }, () => {
      this.validateRules();
    });
  },

  // 进行排餐规则校验
  validateRules: function () {
    const week = this.data.currentWeek;
    if (!week) return;

    let redMeatCount = 0;
    let fishShrimpLiverCount = 0;
    let totalMealsCount = 0;
    let grainMealsCount = 0;
    let eggDays = 0;
    let namingPassed = true;
    let allergenPassed = true;
    let allergenLogs = [];

    // 获取当前最新的未排敏食材池，实现与排敏食材管理页面数据的实时打通
    const defaultRiskFoods = [
      { name: '燕麦米' }, { name: '低筋面粉' }, { name: '芋头' }, { name: '芦笋' },
      { name: '白萝卜' }, { name: '紫薯' }, { name: '芹菜' }, { name: '紫甘蓝' },
      { name: '卷心菜' }, { name: '菜花' }, { name: '冬瓜' }, { name: '丝瓜' },
      { name: '苦瓜' }, { name: '梨' }, { name: '蓝莓' }, { name: '桃' },
      { name: '杏' }, { name: '草莓' }, { name: '芒果' }, { name: '猕猴桃' },
      { name: '柑橘' }, { name: '橙子' }, { name: '柚子' }, { name: '西梅' },
      { name: '菠萝' }, { name: '蛋黄' }, { name: '蛋清' }, { name: '鹅肝' },
      { name: '三文鱼' }, { name: '龙利鱼' }, { name: '鲈鱼' }, { name: '带鱼' },
      { name: '黄花鱼' }, { name: '基围虾' }, { name: '螃蟹' }, { name: '豆腐' },
      { name: '奶酪' }, { name: '酸奶' }, { name: '芝麻' }
    ];
    const riskList = getStorage('mp_risk_foods_list', defaultRiskFoods);
    const bannedFoods = riskList.map(f => f.name);

    week.days.forEach(day => {
      let dayHasEgg = false;
      day.meals.forEach(meal => {
        if (!meal.name) return;
        totalMealsCount++;

        // 1. 校验拼写命名 (不能含 + 号)
        if (meal.name.includes('+')) {
          namingPassed = false;
        }

        // 2. 统计红肉 (猪/牛)
        if (meal.name.includes('猪') || meal.name.includes('牛') || meal.name.includes('排骨')) {
          redMeatCount++;
        }

        // 3. 统计鱼/虾/鹅肝
        if (meal.name.includes('鱼') || meal.name.includes('虾') || meal.name.includes('鹅肝')) {
          fishShrimpLiverCount++;
        }

        // 4. 统计粗粮比例
        if (meal.name.includes('小米') || meal.name.includes('胚芽米') || meal.name.includes('燕麦')) {
          grainMealsCount++;
        }

        // 5. 统计鸡蛋
        if (meal.name.includes('蛋') || meal.name.includes('蛋黄') || meal.name.includes('蛋清') || meal.name.includes('蒸糕')) {
          dayHasEgg = true;
        }

        // 6. 排查未排敏违禁食物
        bannedFoods.forEach(banned => {
          if (meal.name.includes(banned)) {
            allergenPassed = false;
            allergenLogs.push(`${day.dayName}：${meal.name} (含未排敏：${banned})`);
          }
        });
      });

      if (dayHasEgg) {
        eggDays++;
      }
    });

    const grainPercent = totalMealsCount > 0 ? Math.round((grainMealsCount / totalMealsCount) * 100) : 0;

    this.setData({
      rules: {
        meatCount: redMeatCount,
        meatPassed: redMeatCount >= 5,
        fishShrimpLiverCount: fishShrimpLiverCount,
        fishShrimpLiverPassed: fishShrimpLiverCount >= 2 && fishShrimpLiverCount <= 6,
        grainPercent: grainPercent,
        grainPassed: grainPercent <= 30,
        eggDays: eggDays,
        eggPassed: eggDays >= 6,
        namingPassed: namingPassed,
        allergenPassed: allergenPassed,
        allergenLogs: allergenLogs
      }
    });
  },

  // 修改每日喂养便签备忘录
  updateNote: function (e) {
    const { date, mealtype } = e.currentTarget.dataset;
    const notes = getStorage('meal_notes', {});
    const val = e.detail.value;

    notes[`${date}_${mealtype}`] = val;
    setStorage('meal_notes', notes);
  },

  // 更新并保存每日大备注
  updateDayNote: function (e) {
    const date = e.currentTarget.dataset.date;
    const val = e.detail.value;
    const notes = { ...this.data.notes };
    notes[date] = val;
    this.setData({ notes });
    setStorage('meal_day_notes', notes);
  },

  // 就地修改特定辅食食谱菜品
  editMeal: function (e) {
    // 未登录不允许编辑
    if (!wx.getStorageSync('user_is_logged_in') && !wx.getStorageSync('user_openid')) {
      wx.showModal({
        title: '请先登录',
        content: '修改辅食菜品需要先登录，以便数据云端同步保存。',
        confirmText: '去登录',
        success: (res) => { if (res.confirm) wx.navigateTo({ url: '/pages/login/index' }); }
      });
      return;
    }
    const { date, mealtype, name } = e.currentTarget.dataset;
    const that = this;

    wx.showModal({
      title: `修改 ${mealtype} 菜品`,
      content: name || '',
      editable: true,
      placeholderText: '请输入辅食菜品名称（如：泥糊状牛肉小米粥）',
      success: (res) => {
        if (res.confirm) {
          const newName = res.content.trim();
          if (!newName) {
            wx.showToast({ title: '菜品名称不能为空', icon: 'none' });
            return;
          }

          // 读取当前所有周计划
          const list = [...that.data.weekPlans];
          const activeIndex = that.data.currentWeekIndex;
          const currentWeek = list[activeIndex];

          if (!currentWeek) return;

          // 寻找对应天和餐别
          const dayObj = currentWeek.days.find(d => d.date === date);
          if (dayObj) {
            const mealObj = dayObj.meals.find(m => m.type === mealtype);
            if (mealObj) {
              mealObj.name = newName;
            } else {
              // 兜底创建餐别
              dayObj.meals.push({ type: mealtype, name: newName });
            }
          }

          // 写回本地缓存
          setStorage('baby_week_plans', list);
          
          // 更新页面状态并重新校验
          that.setData({
            weekPlans: list,
            currentWeek: currentWeek
          }, () => {
            that.validateRules();
            wx.showToast({ title: '菜品已修改', icon: 'success' });
          });
        }
      }
    });
  },

  // 动态创建下周辅食食谱
  addNewWeek: function () {
    const list = [...this.data.weekPlans];
    const lastWeek = list[list.length - 1];
    
    let lastDateStr = '2026-07-12'; // 默认底线日期
    if (lastWeek && lastWeek.days && lastWeek.days.length > 0) {
      lastDateStr = lastWeek.days[lastWeek.days.length - 1].date;
    }

    const lastDate = new Date(lastDateStr);
    const nextDays = [];
    const weekDaysNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    
    for (let i = 1; i <= 7; i++) {
      const nextDate = new Date(lastDate.getTime() + i * 24 * 60 * 60 * 1000);
      const y = nextDate.getFullYear();
      let m = nextDate.getMonth() + 1;
      let d = nextDate.getDate();
      if (m < 10) m = '0' + m;
      if (d < 10) d = '0' + d;
      
      const dateStr = `${y}-${m}-${d}`;
      nextDays.push({
        date: dateStr,
        dayName: weekDaysNames[i - 1],
        eggTarget: 1,
        meals: [
          { type: '午餐', name: '' },
          { type: '晚餐', name: '' }
        ]
      });
    }

    const nextWeekNum = list.length + 1;
    const startPeriod = nextDays[0].date.slice(5).replace('-', '.');
    const endPeriod = nextDays[6].date.slice(5).replace('-', '.');
    
    const newWeekObj = {
      week: `第 ${nextWeekNum} 周辅食计划`,
      period: `${startPeriod}-${endPeriod}`,
      days: nextDays
    };

    list.push(newWeekObj);
    
    // 写回缓存并触发静默同步
    setStorage('baby_week_plans', list);

    this.setData({
      weekPlans: list,
      currentWeekIndex: list.length - 1,
      currentWeek: newWeekObj
    }, () => {
      this.validateRules();
      wx.showToast({ title: '已开通下周食谱', icon: 'success' });
    });
  }
});
