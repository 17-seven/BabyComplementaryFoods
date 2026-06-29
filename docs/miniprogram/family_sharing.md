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
  "_id": "family_xyz123",            // 家庭唯一ID (也作为 baby_id 绑定主键)
  "creator_openid": "oXXXXX_husband",// 创建人 (如丈夫的) OpenID
  "baby_name": "王珑初",              // 宝宝名字
  "birth_date": "2025-02-18",        // 宝宝生日
  "premature_days": 71,              // 早产天数
  "members": [                       // 授权可协同记账的家庭成员 OpenID 列表
    "oXXXXX_husband", 
    "oXXXXX_wife"
  ],
  "create_time": "2026-06-29T16:00:00Z"
}
```

---

## 🔒 三、 微信云数据库“安全规则 (Security Rules)”配置

微信云开发数据库支持配置**安全规则 JSON**，使系统能够直接在数据库层面判定权限，无需通过复杂的云函数鉴权。
请在微信云开发控制台中，将 `timeline_events`、`vaccines`、`healthcares`、`clinical_logs`、`bowel_records`、`milk_water_records`、`eyepatch_records` 的安全规则修改为以下配置：

```json
{
  "read": "auth.openid in get('database.families.' + doc.family_id).members",
  "write": "auth.openid in get('database.families.' + doc.family_id).members"
}
```
> [!NOTE]
> **规则解释**：只有当发起请求的用户的 `openid` 包含在对应 `families` 记录中的 `members` 列表中时，该用户才被允许读取 (read) 或写入 (write) 该记录。这完美解决了丈夫和妻子共同读写同一条宝宝数据的需求。

---

## ☁️ 四、 家庭绑定云函数实现 (`joinFamily`)

为了防范越权攻击，成员的添加应该在云端通过云函数执行。创建云函数 `joinFamily`：

```javascript
// cloudfunctions/joinFamily/index.js
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { familyId } = event; // 要加入的家庭 ID
  const { OPENID } = cloud.getWXContext(); // 申请加入人的 OpenID

  try {
    // 将该成员的 openid 原子地追加到该家庭的 members 数组中
    const res = await db.collection('families').doc(familyId).update({
      data: {
        members: _.addToSet(OPENID)
      }
    });

    if (res.stats.updated === 0) {
      return { success: false, message: '家庭ID不存在' };
    }

    return { success: true, message: '成功加入家庭组，已同步宝宝数据！' };
  } catch (e) {
    return { success: false, error: e.message };
  }
};
```

---

## 📱 五、 小程序端“家庭邀请与协同管理”界面

我们在个人中心页面（`my/index`）或单独页面中，为看护人提供**“家庭管理”**控制板，支持“创建家庭并获取邀请码”与“扫码或手动输入邀请码加入家庭”。

### 1. 页面逻辑 JS
```javascript
// pages/family/index.js
const { getStorage, setStorage } = require('../../utils/storage.js');

Page({
  data: {
    isLoggedIn: false,
    myFamilyId: '',
    inviteCodeInput: '',
    familyMembersCount: 1
  },

  onShow: function () {
    const familyId = getStorage('user_family_id', '');
    this.setData({
      isLoggedIn: !!getApp().globalData.openid,
      myFamilyId: familyId
    });
    if (familyId) {
      this.checkFamilyMembers();
    }
  },

  // 1. 创建属于自己的家庭 (并生成宝宝邀请码)
  createFamily: function () {
    const db = wx.cloud.database();
    const that = this;
    
    wx.showLoading({ title: '正在开通家庭组...' });
    
    db.collection('families').add({
      data: {
        baby_name: '小宝贝',
        birth_date: '2025-02-18',
        premature_days: 71,
        members: [getApp().globalData.openid],
        create_time: new Date()
      },
      success: (res) => {
        wx.hideLoading();
        const familyId = res._id;
        that.setData({ myFamilyId: familyId });
        setStorage('user_family_id', familyId);
        
        wx.showModal({
          title: '家庭创建成功',
          content: `您的专属家庭同步码为：\n${familyId}\n\n爱人登录小程序后，输入此码即可共享协同记账。`,
          confirmText: '复制邀请码',
          success: (modalRes) => {
            if (modalRes.confirm) {
              wx.setClipboardData({ data: familyId });
            }
          }
        });
      }
    });
  },

  // 2. 扫码或手动输入别人的邀请码加入家庭
  onInviteInput: function (e) {
    this.setData({ inviteCodeInput: e.detail.value.trim() });
  },

  joinFamily: function () {
    const code = this.data.inviteCodeInput;
    if (!code) {
      wx.showToast({ title: '请输入邀请码', icon: 'error' });
      return;
    }

    const that = this;
    wx.showLoading({ title: '正在加入...' });

    wx.cloud.callFunction({
      name: 'joinFamily',
      data: { familyId: code },
      success: (res) => {
        wx.hideLoading();
        if (res.result.success) {
          setStorage('user_family_id', code);
          that.setData({ myFamilyId: code });
          wx.showModal({
            title: '绑定成功',
            content: '已成功接入爱人的家庭共享组！刷新页面即可查看共同的宝宝记录。',
            showCancel: false
          });
        } else {
          wx.showToast({ title: res.result.message, icon: 'error' });
        }
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '绑定失败，请检查邀请码', icon: 'none' });
      }
    });
  }
});
```

### 2. 多端同步拉取数据逻辑（刷新自动同步）
在各记录页面（如便便、饮奶、大事记）中，将原来直接从本地缓存读取，改为在 `onShow` 时向云数据库请求：
```javascript
// 以拉取大事记页面为例
loadEventsFromCloud: function () {
  const familyId = wx.getStorageSync('user_family_id');
  if (!familyId) {
    // 离线使用本地缓存
    return this.loadEventsFromLocal();
  }

  const db = wx.cloud.database();
  wx.showNavigationBarLoading();
  
  // 按 family_id 查询，而不是 openid
  db.collection('timeline_events')
    .where({ family_id: familyId })
    .orderBy('date', 'desc')
    .get({
      success: (res) => {
        wx.hideNavigationBarLoading();
        this.setData({
          events: res.data
        });
        // 覆盖本地缓存做离线备份
        wx.setStorageSync('baby_timeline_events', res.data);
      },
      fail: (err) => {
        wx.hideNavigationBarLoading();
        console.error("云端加载失败，使用本地离线数据", err);
        this.loadEventsFromLocal();
      }
    });
}
```
利用这种机制，当妻子在她的手机上添加便便打卡时，记录写入云数据库，带有 `family_id`。当您在您的手机上打开页面或下拉刷新，触发 `loadEventsFromCloud` 查询同样的 `family_id`，就能瞬间加载并显示妻子刚刚添加的全新数据，达成完美协同记账！
