// pages/allergen/index.js
const { getStorage, setStorage, today } = require('../../utils/storage.js');

// 初始默认数据
const defaultSafeFoods = [
  { name: '高铁米粉', category: '主食', icon: '🥣' },
  { name: '胚芽米', category: '主食', icon: '🌾' },
  { name: '碎碎面', category: '主食', icon: '🍜' },
  { name: '疙瘩汤 (面粉)', category: '主食', icon: '🍲' },
  { name: '蒸糕', category: '主食', icon: '🍰' },
  { name: '胡萝卜', category: '蔬菜', icon: '🥕' },
  { name: '山药', category: '蔬菜', icon: '🍠' },
  { name: '土豆', category: '蔬菜', icon: '🥔' },
  { name: '西葫芦', category: '蔬菜', icon: '🥒' },
  { name: '黄瓜', category: '蔬菜', icon: '🥒' },
  { name: '南瓜', category: '蔬菜', icon: '🎃' },
  { name: '苹果', category: '水果', icon: '🍎' },
  { name: '香蕉', category: '水果', icon: '🍌' },
  { name: '牛油果', category: '水果', icon: '🥑' },
  { name: '红心火龙果', category: '水果', icon: '🍉' },
  { name: '鸡肉', category: '动物蛋白', icon: '🍗' },
  { name: '猪肉', category: '动物蛋白', icon: '🥩' },
  { name: '牛肉', category: '动物蛋白', icon: '🍖' },
  { name: '红豆', category: '豆类及坚果', icon: '🥜' },
  { name: '核桃油', category: '油脂与调味', icon: '🍾' },
  { name: '猪油', category: '油脂与调味', icon: '🧈' }
];

const defaultRiskFoods = [
  { name: '燕麦米', category: '主食', icon: '🌾' },
  { name: '低筋面粉', category: '主食', icon: '🌾' },
  { name: '芋头', category: '蔬菜', icon: '🍠' },
  { name: '芦笋', category: '蔬菜', icon: '🥬' },
  { name: '白萝卜', category: '蔬菜', icon: '🥬' },
  { name: '紫薯', category: '蔬菜', icon: '🍠' },
  { name: '芹菜', category: '蔬菜', icon: '🥬' },
  { name: '紫甘蓝', category: '蔬菜', icon: '🥬' },
  { name: '卷心菜', category: '蔬菜', icon: '🥬' },
  { name: '菜花', category: '蔬菜', icon: '🥦' },
  { name: '冬瓜', category: '蔬菜', icon: '🍈' },
  { name: '丝瓜', category: '蔬菜', icon: '🥒' },
  { name: '苦瓜', category: '蔬菜', icon: '🥒' },
  { name: '梨', category: '水果', icon: '🍐' },
  { name: '蓝莓', category: '水果', icon: '🍇' },
  { name: '桃', category: '水果', icon: '🍑' },
  { name: '杏', category: '水果', icon: '🍑' },
  { name: '草莓', category: '水果', icon: '🍓' },
  { name: '芒果', category: '水果', icon: '🥭' },
  { name: '猕猴桃', category: '水果', icon: '🥝' },
  { name: '柑橘', category: '水果', icon: '🍊' },
  { name: '橙子', category: '水果', icon: '🍊' },
  { name: '柚子', category: '水果', icon: '🍊' },
  { name: '西梅', category: '水果', icon: '🍒' },
  { name: '菠萝', category: '水果', icon: '🍍' },
  { name: '蛋黄', category: '动物蛋白', icon: '🥚' },
  { name: '蛋清', category: '动物蛋白', icon: '🥚' },
  { name: '鹅肝', category: '动物蛋白', icon: '🥩' },
  { name: '三文鱼', category: '动物蛋白', icon: '🐟' },
  { name: '龙利鱼', category: '动物蛋白', icon: '🐟' },
  { name: '鲈鱼', category: '动物蛋白', icon: '🐟' },
  { name: '基围虾', category: '动物蛋白', icon: '🍤' },
  { name: '螃蟹', category: '动物蛋白', icon: '🦀' },
  { name: '豆腐', category: '豆类及坚果', icon: '🥛' },
  { name: '芝麻', category: '豆类及坚果', icon: '🥜' },
  { name: '碧欧奇酱油', category: '油脂与调味', icon: '🍯' }
];

Page({
  data: {
    // 视图控制状态：'overview' (食材排敏管理) | 'safe_list' (已排敏食材) | 'risk_list' (未排敏食材) | 'detail' (食材详情)
    viewState: 'overview',
    
    // 全量数据
    safeFoods: [],
    riskFoods: [],
    
    // 页面列表渲染数据 (按分类分组后的数据)
    groupedSafe: {},
    groupedRisk: {},

    // 各大分类统计与收起状态
    categories: ['主食', '蔬菜', '水果', '动物蛋白', '豆类及坚果', '油脂与调味', '籽类'],
    catOptions: ['主食', '蔬菜', '水果', '动物蛋白', '豆类及坚果', '油脂与调味', '籽类'],
    categoryCounts: {}, // { '主食': { safe: 5, risk: 2 } }
    collapsedCategories: {}, // { '主食': false }

    // 主分类筛选：'全部' 或 具体分类名称
    activeFilterTag: '全部',

    // 搜索关键字
    searchKeyword: '',

    // 选中的食材详情
    selectedFood: null,
    foodDetailTimeline: [], // 排敏打卡记录

    // 添加食材弹窗表单
    showAddDialog: false,
    addFoodName: '',
    addFoodCategory: '主食',
    addFoodType: 'safe', // 'safe' 已排敏 | 'risk' 未排敏
  },

  onShow: function () {
    this.loadAllergenData();
  },

  loadAllergenData: function () {
    const safe = getStorage('mp_safe_foods_list', defaultSafeFoods);
    const risk = getStorage('mp_risk_foods_list', defaultRiskFoods);

    this.setData({
      safeFoods: safe,
      riskFoods: risk
    }, () => {
      this.rebuildGroupedData();
    });
  },

  // 组合计算：过滤、搜索、按大类分组、折叠配置
  rebuildGroupedData: function () {
    const safe = this.data.safeFoods;
    const risk = this.data.riskFoods;
    const filter = this.data.activeFilterTag;
    const keyword = this.data.searchKeyword.trim().toLowerCase();

    // 1. 初始化分类计数
    const counts = {};
    this.data.categories.forEach(cat => {
      counts[cat] = {
        safe: safe.filter(f => f.category === cat).length,
        risk: risk.filter(f => f.category === cat).length
      };
    });

    // 2. 过滤已排敏列表
    let filteredSafe = safe;
    if (filter !== '全部') filteredSafe = filteredSafe.filter(f => f.category === filter);
    if (keyword) filteredSafe = filteredSafe.filter(f => f.name.toLowerCase().includes(keyword));

    // 3. 过滤未排敏列表
    let filteredRisk = risk;
    if (filter !== '全部') filteredRisk = filteredRisk.filter(f => f.category === filter);
    if (keyword) filteredRisk = filteredRisk.filter(f => f.name.toLowerCase().includes(keyword));

    // 4. 按大类聚合
    const groupedSafe = {};
    const groupedRisk = {};
    this.data.categories.forEach(cat => {
      groupedSafe[cat] = filteredSafe.filter(f => f.category === cat);
      groupedRisk[cat] = filteredRisk.filter(f => f.category === cat);
    });

    this.setData({
      groupedSafe,
      groupedRisk,
      categoryCounts: counts
    });
  },

  // 切换视图状态
  switchViewState: function (e) {
    const state = e.currentTarget.dataset.state;
    const tag = e.currentTarget.dataset.tag || '全部';
    this.setData({
      viewState: state,
      activeFilterTag: tag,
      searchKeyword: ''
    }, () => {
      this.rebuildGroupedData();
    });
  },

  // 切换标签筛选
  selectFilterTag: function (e) {
    const tag = e.currentTarget.dataset.tag;
    this.setData({ activeFilterTag: tag }, () => {
      this.rebuildGroupedData();
    });
  },

  // 搜索框输入
  onSearchInput: function (e) {
    this.setData({ searchKeyword: e.detail.value }, () => {
      this.rebuildGroupedData();
    });
  },

  // 切换手风琴收起状态
  toggleCollapse: function (e) {
    const cat = e.currentTarget.dataset.cat;
    const collapsed = { ...this.data.collapsedCategories };
    collapsed[cat] = !collapsed[cat];
    this.setData({ collapsedCategories: collapsed });
  },

  // ==================== 核心逻辑：食材状态划拨 ====================

  // A. 将未排敏食材“标记快捷移入已排敏中”
  markAsSafeQuick: function (e) {
    const name = e.currentTarget.dataset.name;
    const that = this;

    wx.showModal({
      title: '排敏确认',
      content: `确认将“${name}”标记为已排敏食材吗？`,
      success: (res) => {
        if (res.confirm) {
          // 在未排敏数组中找到该食材并移除
          const riskList = [...that.data.riskFoods];
          const idx = riskList.findIndex(f => f.name === name);
          if (idx === -1) return;
          
          const foodItem = riskList.splice(idx, 1)[0];
          
          // 加到已排敏数组中
          const safeList = [...that.data.safeFoods];
          if (!safeList.some(f => f.name === name)) {
            safeList.push(foodItem);
          }

          that.setData({
            safeFoods: safeList,
            riskFoods: riskList
          }, () => {
            setStorage('mp_safe_foods_list', safeList);
            setStorage('mp_risk_foods_list', riskList);
            that.loadAllergenData();
            wx.showToast({ title: '已标记为安全', icon: 'success' });
          });
        }
      }
    });
  },

  // B. 已排敏食材“删除”自动退回未排敏库中
  markAsRiskQuick: function (e) {
    const name = e.currentTarget.dataset.name;
    const that = this;

    wx.showModal({
      title: '移回未排敏',
      content: `确定要将“${name}”从已排敏库中移出，退回到未排敏库中吗？`,
      confirmColor: '#e53e3e',
      success: (res) => {
        if (res.confirm) {
          // 从已排敏库移除
          const safeList = [...that.data.safeFoods];
          const idx = safeList.findIndex(f => f.name === name);
          if (idx === -1) return;

          const foodItem = safeList.splice(idx, 1)[0];

          // 移回风险库
          const riskList = [...that.data.riskFoods];
          if (!riskList.some(f => f.name === name)) {
            riskList.push(foodItem);
          }

          // 如果当前正好在详情页，返回上一页
          const nextState = that.data.viewState === 'detail' ? 'overview' : that.data.viewState;

          that.setData({
            safeFoods: safeList,
            riskFoods: riskList,
            viewState: nextState
          }, () => {
            setStorage('mp_safe_foods_list', safeList);
            setStorage('mp_risk_foods_list', riskList);
            that.loadAllergenData();
            wx.showToast({ title: '已移回未排敏', icon: 'success' });
          });
        }
      }
    });
  },

  // ==================== 详情与排敏测试流水记录 ====================
  showFoodDetail: function (e) {
    const { name, type } = e.currentTarget.dataset;
    const sourceList = type === 'safe' ? this.data.safeFoods : this.data.riskFoods;
    const food = sourceList.find(f => f.name === name);

    if (!food) return;

    // 拉取该食物的测试日志
    const key = `allergen_logs_${name}`;
    const logs = getStorage(key, []);

    this.setData({
      viewState: 'detail',
      selectedFood: {
        ...food,
        type: type // 方便标记是safe还是risk
      },
      foodDetailTimeline: logs
    });
  },

  // 手动为详情页中的食材添加一条观察打卡
  addObserveLog: function () {
    const name = this.data.selectedFood.name;
    const that = this;

    wx.showModal({
      title: '排敏记录打卡',
      content: '请描述今日进食后的排便/皮肤等过敏反应观察：',
      editable: true,
      placeholderText: '无过敏表现，大便正常',
      success: (res) => {
        if (res.confirm) {
          const content = res.content.trim() || '进食观察：状态良好，无明显过敏反应。';
          const key = `allergen_logs_${name}`;
          const logs = getStorage(key, []);
          
          logs.push({
            id: Date.now(),
            date: today(),
            content: content
          });

          setStorage(key, logs);
          that.setData({
            foodDetailTimeline: logs
          });
          wx.showToast({ title: '已添加记录' });
        }
      }
    });
  },

  // 详情页快捷标记按钮
  detailToggleSafe: function () {
    const food = this.data.selectedFood;
    if (food.type === 'risk') {
      this.markAsSafeQuick({ currentTarget: { dataset: { name: food.name } } });
    } else {
      this.markAsRiskQuick({ currentTarget: { dataset: { name: food.name } } });
    }
  },

  // 物理彻底删除食材
  deleteFoodItem: function () {
    const food = this.data.selectedFood;
    const that = this;

    wx.showModal({
      title: '彻底删除',
      content: `确定要将食材“${food.name}”从系统中彻底删除吗？（注意：这不会退回到另一侧）`,
      confirmColor: '#e53e3e',
      success: (res) => {
        if (res.confirm) {
          let list = [];
          let key = '';
          if (food.type === 'safe') {
            list = that.data.safeFoods.filter(f => f.name !== food.name);
            key = 'mp_safe_foods_list';
          } else {
            list = that.data.riskFoods.filter(f => f.name !== food.name);
            key = 'mp_risk_foods_list';
          }

          setStorage(key, list);
          that.setData({
            viewState: 'overview'
          }, () => {
            that.loadAllergenData();
            wx.showToast({ title: '删除成功' });
          });
        }
      }
    });
  },

  // ==================== 录入自定义食材弹窗 ====================
  openAddDialog: function (e) {
    const type = e.currentTarget.dataset.type || 'safe';
    this.setData({
      showAddDialog: true,
      addFoodType: type,
      addFoodName: '',
      addFoodCategory: '主食'
    });
  },

  closeAddDialog: function () {
    this.setData({ showAddDialog: false });
  },

  onAddInput: function (e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [field]: e.detail.value });
  },

  saveCustomFood: function () {
    const name = this.data.addFoodName.trim();
    const cat = this.data.addFoodCategory;
    const type = this.data.addFoodType;

    if (!name) {
      wx.showToast({ title: '请输入名字', icon: 'error' });
      return;
    }

    const emojis = {
      '主食': '🍚', '蔬菜': '🥬', '水果': '🍎',
      '动物蛋白': '🥩', '豆类及坚果': '🥜', '油脂与调味': '🥑', '籽类': '⚫'
    };

    const newItem = {
      name,
      category: cat,
      icon: emojis[cat] || '🥗'
    };

    if (type === 'safe') {
      const list = [...this.data.safeFoods];
      if (!list.some(f => f.name === name)) list.push(newItem);
      setStorage('mp_safe_foods_list', list);
    } else {
      const list = [...this.data.riskFoods];
      if (!list.some(f => f.name === name)) list.push(newItem);
      setStorage('mp_risk_foods_list', list);
    }

    this.setData({ showAddDialog: false }, () => {
      this.loadAllergenData();
      wx.showToast({ title: '食材添加成功', icon: 'success' });
    });
  }
});
