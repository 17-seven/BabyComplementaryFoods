// wx_miniprogram/data/mealPlan.js

// 脱敏处理：将辅食食谱变更为空白模板，用户可通过轻触餐别卡片随时随地自主规划与编辑
const defaultWeekPlans = [
  {
    week: '第 1 周辅食计划',
    period: '请设置辅食周期',
    note: '点击膳食行可直接录入或修改辅食菜品',
    days: [
      {
        date: '2026-06-29', dayName: '周一', eggTarget: 1,
        meals: [
          { type: '午餐', name: '' },
          { type: '晚餐', name: '' }
        ]
      },
      {
        date: '2026-06-30', dayName: '周二', eggTarget: 1,
        meals: [
          { type: '午餐', name: '' },
          { type: '晚餐', name: '' }
        ]
      },
      {
        date: '2026-07-01', dayName: '周三', eggTarget: 1,
        meals: [
          { type: '午餐', name: '' },
          { type: '晚餐', name: '' }
        ]
      },
      {
        date: '2026-07-02', dayName: '周四', eggTarget: 1,
        meals: [
          { type: '午餐', name: '' },
          { type: '晚餐', name: '' }
        ]
      },
      {
        date: '2026-07-03', dayName: '周五', eggTarget: 1,
        meals: [
          { type: '午餐', name: '' },
          { type: '晚餐', name: '' }
        ]
      },
      {
        date: '2026-07-04', dayName: '周六', eggTarget: 1,
        meals: [
          { type: '午餐', name: '' },
          { type: '晚餐', name: '' }
        ]
      },
      {
        date: '2026-07-05', dayName: '周日', eggTarget: 1,
        meals: [
          { type: '午餐', name: '' },
          { type: '晚餐', name: '' }
        ]
      }
    ]
  }
];

module.exports = {
  defaultWeekPlans
};
