// pages/mealplan/index.js
const { getStorage, setStorage } = require('../../utils/storage.js');
const { defaultWeekPlans } = require('../../data/mealPlan.js'); // 获取小程序的周种子数据

Page({
  data: {
    weekPlans: [],
    currentWeekIndex: 0,
    currentWeek: null,
    
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
  },

  initMealPlans: function () {
    // 获取本地周计划列表，没有则用种子数据
    const list = getStorage('baby_week_plans', defaultWeekPlans);
    const activeIndex = this.data.currentWeekIndex;
    const currentWeek = list[activeIndex] || list[0] || null;

    this.setData({
      weekPlans: list,
      currentWeek: currentWeek
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

    // 获取未排敏食材池
    const defaultBanned = [
      '芋头','芦笋','白萝卜','紫薯','芹菜','紫甘蓝','卷心菜','菜花','冬瓜','丝瓜',
      '苦瓜','梨','蓝莓','桃','杏','草莓','芒果','猕猴桃','柑橘','橙子','柚子',
      '西梅','菠萝','三文鱼','龙利鱼','鲈鱼','带鱼','黄花鱼','基围虾','螃蟹',
      '豆腐','奶酪','酸奶','芝麻'
    ];
    const bannedFoods = getStorage('baby_banned_foods', defaultBanned);

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

  // 就地修改特定辅食食谱菜品
  editMeal: function (e) {
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
  }
});
