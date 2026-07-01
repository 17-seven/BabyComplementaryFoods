const prisma = require('../config/db');

const validateWeeklyPlan = async (babyId, days) => {
  // 1. 获取宝宝的违禁/已排敏食材池
  const allergenPool = await prisma.allergenPool.findMany({
    where: { baby_id: babyId }
  });

  const bannedFoods = allergenPool.filter(x => x.status === 'BANNED').map(x => x.food_name);

  let report = {
    redMeatCount: 0,
    grainPercent: 0,
    eggDays: 0,
    hasBannedFood: false,
    formatError: false,
    bannedDetails: []
  };

  let totalMealsCount = 0;
  let grainMealsCount = 0;
  let eggCount = 0;

  // 2. 遍历每天的餐次进行检查
  days.forEach(day => {
    let dayHasEgg = false;
    const meals = day.meals || {};
    
    Object.values(meals).forEach(mealText => {
      if (!mealText) return;
      totalMealsCount++;

      // 校验是否有 "+" 拼接符号命名 (原规则中可能检测此格式)
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

      // 拦截未排敏/违禁过敏食材
      bannedFoods.forEach(food => {
        if (mealText.includes(food)) {
          report.hasBannedFood = true;
          report.bannedDetails.push({
            food,
            meal: mealText,
            date: day.date
          });
        }
      });
    });

    if (dayHasEgg) eggCount++;
  });

  report.grainPercent = totalMealsCount > 0 ? Math.round((grainMealsCount / totalMealsCount) * 100) : 0;
  report.eggDays = eggCount;

  return report;
};

module.exports = {
  validateWeeklyPlan
};
