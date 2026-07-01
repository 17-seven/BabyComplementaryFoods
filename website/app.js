document.addEventListener('DOMContentLoaded', () => {
  // 1. 动态计算宝宝月龄
  calculateBabyAge();
  
  // 2. 模拟今日护理面板数据交互
  setupInteractiveDashboard();

  // 3. 导航栏滚动毛玻璃效果
  setupHeaderScroll();
});

/**
 * 依据宝宝出生日期 (2025-02-18) 动态计算并展示宝宝的实际月龄
 */
function calculateBabyAge() {
  const birthDate = new Date('2025-02-18');
  const now = new Date();
  
  let years = now.getFullYear() - birthDate.getFullYear();
  let months = now.getMonth() - birthDate.getMonth();
  let days = now.getDate() - birthDate.getDate();
  
  if (days < 0) {
    months -= 1;
    // 获取上个月的最后一天
    const prevMonthLastDay = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    days += prevMonthLastDay;
  }
  
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  
  const totalMonths = years * 12 + months;
  const ageSpan = document.getElementById('baby-age-val');
  
  if (ageSpan) {
    if (totalMonths > 0) {
      ageSpan.textContent = `${totalMonths}个月 ${days}天`;
    } else {
      ageSpan.textContent = `${days}天`;
    }
  }
}

/**
 * 智能今日指标控制看板交互逻辑
 */
function setupInteractiveDashboard() {
  const indicators = {
    milk: { current: 360, target: 500, unit: 'ml', id: 'val-milk', step: 50 },
    water: { current: 90, target: 120, unit: 'ml', id: 'val-water', step: 20 },
    bowel: { current: 1, target: 2, unit: '次', id: 'val-bowel', step: 1 },
    vision: { current: 2.5, target: 4, unit: '小时', id: 'val-vision', step: 0.5 }
  };

  // 获取所有互动点击卡片
  Object.keys(indicators).forEach(key => {
    const card = document.getElementById(`card-${key}`);
    const valText = document.getElementById(indicators[key].id);
    const actionBtn = card ? card.querySelector('.btn-indicator-action') : null;
    
    if (card && valText) {
      const updateValue = () => {
        const item = indicators[key];
        item.current += item.step;
        
        // 如果是单次/数值累计
        if (key === 'bowel') {
          valText.textContent = `${item.current} ${item.unit}`;
        } else {
          valText.textContent = `${item.current}/${item.target}${item.unit}`;
        }

        // 达成目标变绿
        if (item.current >= item.target) {
          valText.style.color = 'var(--secondary)';
          if (actionBtn) actionBtn.textContent = '🎉 已达标';
        } else {
          valText.style.color = 'var(--primary)';
        }

        // 加上动画缩放效果
        valText.style.transform = 'scale(1.15)';
        valText.style.transition = 'transform 0.15s ease';
        setTimeout(() => {
          valText.style.transform = 'scale(1)';
        }, 150);
      };

      if (actionBtn) {
        actionBtn.addEventListener('click', (e) => {
          e.stopPropagation(); // 阻止冒泡
          updateValue();
        });
      }
      
      card.addEventListener('click', updateValue);
    }
  });
}

/**
 * 滚动头部透明度转换
 */
function setupHeaderScroll() {
  const header = document.querySelector('header');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      header.style.boxShadow = 'var(--shadow-sm)';
      header.style.background = 'rgba(250, 247, 242, 0.95)';
    } else {
      header.style.boxShadow = 'none';
      header.style.background = 'rgba(250, 247, 242, 0.8)';
    }
  });
}
