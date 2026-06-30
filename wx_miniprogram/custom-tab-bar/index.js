// custom-tab-bar/index.js
Component({
  data: {
    selected: 0,
    list: [
      { name: '首页',   emoji: '🏠', url: '/pages/dashboard/index'  },
      { name: '辅食',   emoji: '🥗', url: '/pages/mealplan/index'   },
      { name: '医疗',   emoji: '🩺', url: '/pages/healthcare/index' },
      { name: '大事记', emoji: '📋', url: '/pages/timeline/index'   },
      { name: '我的',   emoji: '👤', url: '/pages/my/index'         }
    ],
    bounceIndex: -1
  },
  methods: {
    switchTab(e) {
      const idx = parseInt(e.currentTarget.dataset.index);
      const url = this.data.list[idx].url;
      this.setData({ selected: idx, bounceIndex: idx });
      setTimeout(() => this.setData({ bounceIndex: -1 }), 400);
      wx.switchTab({ url });
    }
  }
});
