// pages/album/index.js
const { getStorage, setStorage } = require('../../utils/storage.js');

Page({
  data: {
    photos: [],
    avatarUrl: '/assets/avatar_default.png',
    maxCount: 10
  },

  onShow: function () {
    if (!wx.getStorageSync('user_is_logged_in') && !wx.getStorageSync('user_openid')) {
      wx.showModal({ title: '请先登录', content: '此功能需要登录才能使用。', confirmText: '去登录', cancelText: '返回',
        success: (res) => {
          if (res.confirm) wx.redirectTo({ url: '/pages/login/index' });
          else wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/dashboard/index' }) });
        }
      });
      return;
    }
    this.loadAlbumData();
  },

  loadAlbumData: function () {
    // 载入相册照片列表
    const list = getStorage('baby_album_photos', []);
    
    // 载入宝宝当前的头像
    const avatar = getStorage('baby_custom_avatar', '/assets/avatar_default.png');

    this.setData({
      photos: list,
      avatarUrl: avatar
    });
  },

  // 调取相机/相册选择媒体并上传
  uploadPhoto: function () {
    const list = this.data.photos;
    if (list.length >= this.data.maxCount) {
      wx.showModal({
        title: '上传受限',
        content: '为了保证系统轻量运行，宝宝相册限制最多只能上传 10 张图片。您可以删除不需要的图片以释放空间。',
        showCancel: false
      });
      return;
    }

    const that = this;
    // 使用微信 chooseMedia 选择图片
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        wx.showLoading({ title: '正在存入相册...' });
        wx.hideLoading();
        const updatedList = [...list];
        updatedList.push({
          id: Date.now(),
          url: tempFilePath // 暂存本地路径，后续接入自建后端的OSS服务后再行配置
        });

        that.setData({ photos: updatedList }, () => {
          setStorage('baby_album_photos', updatedList);
          // 同步自建服务器相册列表
          that._syncCloudAlbum(updatedList);
          wx.showToast({ title: '已添加到相册', icon: 'success' });
        });      }
    });
  },

  // 轻触单张照片触发操作菜单
  onPhotoTap: function (e) {
    const { url, id } = e.currentTarget.dataset;
    const that = this;

    const actionOpts = ['🔍 查看高清大图', '👶 设为宝宝当前头像', '🗑️ 删除该照片'];
    wx.showActionSheet({
      itemList: actionOpts,
      success: (res) => {
        const idx = res.tapIndex;
        if (idx === 0) {
          // 查看大图
          wx.previewImage({
            urls: that.data.photos.map(p => p.url),
            current: url
          });
        } else if (idx === 1) {
          // 设为头像
          setStorage('baby_custom_avatar', url);
          that.setData({ avatarUrl: url });

          // 同步宝宝头像至自建服务器 families 记录
          const familyId = getStorage('user_family_id', '');
          if (familyId) {
            const request = require('../../utils/request.js');
            request.post('/family/update-action', {
              action: 'update',
              familyId: familyId,
              data: { baby_avatar: url }
            }).catch(err => {
              console.warn('同步宝宝头像失败:', err);
            });
          }
          wx.showToast({ title: '已成功设置为宝宝头像', icon: 'success' });
        } else if (idx === 2) {
          // 删除图片
          wx.showModal({
            title: '删除照片',
            content: '确定要将该张图片从相册中彻底删除吗？',
            confirmColor: '#e53e3e',
            success: (modalRes) => {
              if (modalRes.confirm) {
                const list = that.data.photos.filter(p => p.id !== id);
                that.setData({ photos: list }, () => {
                  setStorage('baby_album_photos', list);
                  that._syncCloudAlbum(list);

                  // 如果被删除的图片恰好是头像，恢复为默认头像
                  if (that.data.avatarUrl === url) {
                    setStorage('baby_custom_avatar', '/assets/avatar_default.png');
                    that.setData({ avatarUrl: '/assets/avatar_default.png' });
                    const familyId2 = getStorage('user_family_id', '');
                    if (familyId2) {
                      const request = require('../../utils/request.js');
                      request.post('/family/update-action', {
                        action: 'update',
                        familyId: familyId2,
                        data: { baby_avatar: '/assets/avatar_default.png' }
                      }).catch(err => {
                        console.warn('恢复宝宝默认头像失败:', err);
                      });
                    }
                  }
                  wx.showToast({ title: '删除成功' });
                });
              }
            }
          });
        }
      }
    });
  },

  // 同步相册数组至自建服务器 families 记录
  _syncCloudAlbum: function (photosList) {
    const familyId = getStorage('user_family_id', '');
    if (familyId) {
      const request = require('../../utils/request.js');
      request.post('/family/update-action', {
        action: 'update',
        familyId: familyId,
        data: { album_photos: photosList }
      }).catch(err => {
        console.warn('同步相册至服务器失败:', err);
      });
    }
  }
});

