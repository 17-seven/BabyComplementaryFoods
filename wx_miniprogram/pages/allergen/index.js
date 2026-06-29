// pages/allergen/index.js
const { getStorage, setStorage } = require('../../utils/storage.js');

Page({
  data: {
    activeTab: 'safe', // 'safe' | 'banned'
    
    // 已排敏安全食材库
    safeFoods: {
      主食: ['米粉', '米饭', '胚芽米', '碎碎面', '小米', '燕麦米'],
      肉蛋类: ['猪肉', '牛肉', '鸡肉', '蛋黄', '蛋清'],
      水产类: ['鳕鱼', '比目鱼', '甜虾'],
      蔬菜类: ['西红柿', '西兰花', '南瓜', '黄瓜', '山药', '胡萝卜', '土豆', '西葫芦']
    },

    // 尚未排敏的风险食材
    bannedFoods: ['菠菜', '香菇', '三文鱼', '龙利鱼', '鲈鱼', '带鱼', '豆腐', '芝麻', '芹菜', '芒果', '猕猴桃', '柑橘', '橙子', '草莓'],
    
    // 手动录入新食材名称
    newFoodName: '',
    newFoodCat: '主食',
    catOptions: ['主食', '肉蛋类', '水产类', '蔬菜类']
  },

  onShow: function () {
    this.loadAllergenData();
  },

  loadAllergenData: function () {
    const defaultSafe = {
      主食: ['米粉', '米饭', '胚芽米', '碎碎面', '小米', '燕麦米'],
      肉蛋类: ['猪肉', '牛肉', '鸡肉', '蛋黄', '蛋清'],
      水产类: ['鳕鱼', '比目鱼', '甜虾'],
      蔬菜类: ['西红柿', '西兰花', '南瓜', '黄瓜', '山药', '胡萝卜', '土豆', '西葫芦']
    };
    const defaultBanned = ['菠菜', '香菇', '三文鱼', '龙利鱼', '鲈鱼', '带鱼', '豆腐', '芝麻', '芹菜', '芒果', '猕猴桃', '柑橘', '橙子', '草莓'];

    const safe = getStorage('baby_safe_foods', defaultSafe);
    const banned = getStorage('baby_banned_foods', defaultBanned);

    this.setData({
      safeFoods: safe,
      bannedFoods: banned
    });
  },

  switchTab: function (e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab });
  },

  // 1. 将风险食材标记为“已排敏安全”
  markAsSafe: function (e) {
    const food = e.currentTarget.dataset.food;
    const that = this;

    wx.showModal({
      title: '标记为安全食材',
      content: `确定已对 ${food} 完成排敏，并加入安全食材库吗？`,
      success: (res) => {
        if (res.confirm) {
          // 移除
          const banned = that.data.bannedFoods.filter(f => f !== food);
          
          // 选择分类
          wx.showActionSheet({
            itemList: that.data.catOptions,
            success: (actionRes) => {
              const cat = that.data.catOptions[actionRes.tapIndex];
              const safe = { ...that.data.safeFoods };
              if (!safe[cat]) safe[cat] = [];
              if (!safe[cat].includes(food)) {
                safe[cat].push(food);
              }

              that.setData({
                safeFoods: safe,
                bannedFoods: banned
              }, () => {
                setStorage('baby_safe_foods', safe);
                setStorage('baby_banned_foods', banned);
                wx.showToast({ title: '已移入安全库', icon: 'success' });
              });
            }
          });
        }
      }
    });
  },

  // 2. 将安全食材标记为“过敏风险/重新排敏”
  markAsBanned: function (e) {
    const { food, cat } = e.currentTarget.dataset;
    const that = this;

    wx.showModal({
      title: '标记为过敏风险',
      content: `确定要将 ${food} 移出安全食材库，归入未排敏/风险食材库吗？`,
      confirmColor: '#e53e3e',
      success: (res) => {
        if (res.confirm) {
          const safe = { ...that.data.safeFoods };
          safe[cat] = safe[cat].filter(f => f !== food);

          const banned = [...that.data.bannedFoods];
          if (!banned.includes(food)) {
            banned.push(food);
          }

          that.setData({
            safeFoods: safe,
            bannedFoods: banned
          }, () => {
            setStorage('baby_safe_foods', safe);
            setStorage('baby_banned_foods', banned);
            wx.showToast({ title: '已拉黑/移出', icon: 'success' });
          });
        }
      }
    });
  },

  // 输入绑定
  onFoodInput: function (e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [field]: e.detail.value });
  },

  // 新增未知食材
  addNewFood: function () {
    const name = this.data.newFoodName.trim();
    if (!name) return;

    if (this.data.activeTab === 'safe') {
      const cat = this.data.newFoodCat;
      const safe = { ...this.data.safeFoods };
      if (!safe[cat]) safe[cat] = [];
      if (!safe[cat].includes(name)) {
        safe[cat].push(name);
      }
      this.setData({ newFoodName: '' }, () => {
        setStorage('baby_safe_foods', safe);
        wx.showToast({ title: '已录入安全食材' });
      });
    } else {
      const banned = [...this.data.bannedFoods];
      if (!banned.includes(name)) {
        banned.push(name);
      }
      this.setData({ newFoodName: '' }, () => {
        setStorage('baby_banned_foods', banned);
        wx.showToast({ title: '已录入风险库' });
      });
    }
  }
});
