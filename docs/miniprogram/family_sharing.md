# 微信小程序家庭多成员共享与协同记账设计方案

为了让本小程序能够面向所有用户，且支持**家庭协同记账**（例如：您和您爱人登录后都能查看同一个宝宝的数据，任何一方添加的排便、饮奶、就诊记录，另一方只要刷新也能立刻看到），我们需要建立**“家庭组 (Family Group)”**机制，并改造原有的单机或 Creator-Only 存储逻辑。

---

## 🛠️ 一、 核心架构设计

### 1. 核心概念：以 `family_id` 替代 `_openid` 进行数据归属
在默认状态下，微信云开发数据库中所有新增记录都会被自动打上创建者的 `_openid`，并且只有创建者本人可读写。
为了实现共享，我们需要：
* 新增一个 **`families` (家庭信息)** 集合。
* 让所有的宝宝日常记录（大事记、体检、便便、饮水）不再以个人 OpenID 归属，而是全部打上 `family_id` 外键。
* 数据库的安全读写规则从默认的“仅创建者可读写”，修改为**“仅属于该家庭组的成员可读写”**。

---

## 💾 二、 数据库结构扩展 (`families` 集合)

在微信云数据库中创建名为 `families` 的集合，每条记录代表一个家庭：

```json
{
  "_id": "family_xyz123",              // 家庭唯一ID
  "creator_openid": "oXXXXX_husband",  // 创建人 OpenID
  "creator_nickname": "爸爸",          // 创建人微信昵称
  "creator_avatar": "https://...",     // 创建人微信头像
  "baby_name": "王玧初",                // 宝宝名字
  "birth_date": "2025-02-18",          // 宝宝生日
  "premature_days": 71,                // 早产天数
  "members": [                         // 成员 OpenID 列表
    "oXXXXX_husband", 
    "oXXXXX_wife"
  ],
  "members_info": [                    // 看护人真实头像昵称列表（用于协同展示）
    {
      "openid": "oXXXXX_husband",
      "nickName": "爸爸",
      "avatarUrl": "https://..."
    },
    {
      "openid": "oXXXXX_wife",
      "nickName": "妈妈",
      "avatarUrl": "https://..."
    }
  ],
  "create_time": "2026-06-29T16:00:00Z"
}
```

## ☁️ 四、 家庭绑定与写操作云函数实现 (`updateFamily`)

为了防范越权攻击并统一管理家庭组的操作，所有针对 `families` 集合的写操作（如创建家庭、添加成员、更新宝宝档案等）均统一在云端通过 `updateFamily` 云函数执行。

```javascript
// cloudfunctions/updateFamily/index.js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { action, familyId, data } = event;
  const { OPENID } = cloud.getWXContext();

  try {
    if (action === 'create') {
      // 创建新家庭，自动将创建者加入成员列表
      const res = await db.collection('families').add({
        data: {
          ...data,
          members: [OPENID],
          create_time: db.serverDate()
        }
      });
      return { success: true, familyId: res._id };
    }
    
    if (action === 'addMember') {
      // 成员加入：将申请加入人的 openid 原子地追加到该家庭的 members 数组中
      const res = await db.collection('families').doc(familyId).update({
        data: {
          members: _.addToSet(OPENID)
        }
      });
      if (res.stats.updated === 0) {
        return { success: false, message: '同步码不存在' };
      }
      return { success: true };
    }

    if (action === 'update') {
      // 更新宝宝档案或家庭配置
      const res = await db.collection('families').doc(familyId).update({
        data: {
          ...data,
          update_time: db.serverDate()
        }
      });
      return { success: true };
    }
    
    return { success: false, message: '未知操作' };
  } catch (e) {
    return { success: false, error: e.message };
  }
};
```

---

## 📱 五、 小程序端“家庭邀请与协同管理”界面

我们在“家庭协同”管理页面（`pages/family/index`）中提供管理控制板，支持创建家庭组和输入同步码加入共享家庭。并且在重新绑定时，会自动触发本地与云端数据的去重合并。

### 1. 绑定与合并逻辑 JS
```javascript
// pages/family/index.js 核心片段
const { getStorage, setStorage } = require('../../utils/storage.js');

// 1. 创建属于自己的家庭
createFamily: function () {
  const that = this;
  wx.showLoading({ title: '正在开通家庭组...' });
  wx.cloud.callFunction({
    name: 'updateFamily',
    data: {
      action: 'create',
      data: {
        baby_name: '小宝贝',
        birth_date: '2025-02-18',
        premature_days: 71
      }
    },
    success: (res) => {
      wx.hideLoading();
      const familyId = res.result.familyId;
      that.setData({ myFamilyId: familyId }, () => {
        setStorage('user_family_id', familyId);
        
        // 绑定成功后触发双向合并
        const { syncMerge } = require('../../utils/storage.js');
        syncMerge(familyId, () => {
          that.fetchFamilyDetails();
          wx.showModal({
            title: '家庭创建成功',
            content: `您的家庭同步码为：\n\n${familyId}\n\n已自动复制邀请码，爱人输入后即可共享数据。`,
            confirmText: '好 的',
            showCancel: false,
            success: () => { wx.setClipboardData({ data: familyId }); }
          });
        });
      });
    }
  });
},

// 2. 输入别人的邀请码加入家庭
joinFamily: function () {
  const code = this.data.inviteCodeInput;
  const that = this;
  wx.showLoading({ title: '正在加入...' });

  wx.cloud.callFunction({
    name: 'updateFamily',
    data: { action: 'addMember', familyId: code },
    success: (res) => {
      wx.hideLoading();
      if (res.result && res.result.success) {
        setStorage('user_family_id', code);
        that.setData({ myFamilyId: code }, () => {
          // 加入成功后触发双向合并
          const { syncMerge } = require('../../utils/storage.js');
          syncMerge(code, () => {
            that.fetchFamilyDetails();
            wx.showModal({
              title: '绑定协同成功',
              content: '已成功接入家庭组！双方刷新页面即可看到共同数据。',
              showCancel: false
            });
          });
        });
      }
    }
  });
}
```

### 2. 双向数据归集与防丢失机制 (`syncMerge`)
在 `utils/storage.js` 中，当绑定发生时，客户端将自动执行双向数据合并：
*   拉取云数据库的全量业务记录，并与本地缓存的业务数组进行双向比对。
*   通过唯一主键（`id`）或去重键判定是否重复。
*   若存在接种状态不一致（例如本地为“已接种”，云端为“未到时间”），优先保留状态为“已接种”且含有接种日期的版本。
*   将去重合并后的全量记录覆盖本地，并自动触发静默上传同步，使云端与本地同步达到高可用状态。

### 3. 多端实时拉取与刷新机制 (`syncPull` & 下拉刷新)
为了实现协同成员操作的实时可见性，让多端数据始终对齐：
*   **切换页面自动加载最新数据**：在各个主要功能页面的 `onShow` 函数中引入后台静默 `syncPull` 调用，自动拉取最新的云端数据并重新渲染当前页面，保证看护人切换页面时始终能看到其他成员添加的最新数据。
*   **支持下拉刷新强制更新**：在各页面的配置文件 `index.json` 中配置 `"enablePullDownRefresh": true`。在页面的 `onPullDownRefresh` 方法中显式调用 `syncPull`，并在拉取成功后调用 `wx.stopPullDownRefresh()` 停止刷新动画。
