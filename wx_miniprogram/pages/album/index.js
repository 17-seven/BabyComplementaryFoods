// pages/album/index.js
const { getStorage, setStorage } = require('../../utils/storage.js');

Page({
  data: {
    photos: [],
    avatarUrl: '/assets/avatar_default.png',
    maxCount: 10
  },

  onShow: function () {
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

        // A. 尝试使用微信云存储上传文件
        const cloudPath = `baby_album/photo_${Date.now()}_${Math.floor(Math.random() * 1000)}.jpg`;
        
        wx.cloud.uploadFile({
          cloudPath: cloudPath,
          filePath: tempFilePath,
          success: (uploadRes) => {
            wx.hideLoading();
            const fileId = uploadRes.fileID; // 微信云存储提供的真实云端可访问 URL
            
            const updatedList = [...list];
            updatedList.push({
              id: Date.now(),
              url: fileId
            });

            that.setData({ photos: updatedList }, () => {
              setStorage('baby_album_photos', updatedList);
              // 同步云端相册列表
              that._syncCloudAlbum(updatedList);
              wx.showToast({ title: '已成功上传云端', icon: 'success' });
            });
          },
          fail: (err) => {
            // B. 离线/未开通云开发时，使用本地临时路径兜底缓存
            wx.hideLoading();
            console.warn("未开通云开发或网络错误，采用本地路径兜底", err);
            
            const updatedList = [...list];
            updatedList.push({
              id: Date.now(),
              url: tempFilePath // 离线缓存路径
            });

            that.setData({ photos: updatedList }, () => {
              setStorage('baby_album_photos', updatedList);
              wx.showToast({ title: '已暂存本地相册', icon: 'success' });
            });
          }
        });
      }
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

          // 同步宝宝头像至云端数据库 families 记录里
          const familyId = getStorage('user_family_id', '');
          if (familyId && wx.cloud) {
            try {
              const db = wx.cloud.database();
              db.collection('families').doc(familyId).update({
                data: {
                  baby_avatar: url
                },
                success: () => {
                  console.log("宝宝头像云端同步成功！");
                }
              });
            } catch(e) {}
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
                  
                  // 同步照片删除至云端数据库
                  that._syncCloudAlbum(list);

                  // 如果被删除的图片恰好是头像，恢复为默认头像
                  if (that.data.avatarUrl === url) {
                    setStorage('baby_custom_avatar', '/assets/avatar_default.png');
                    that.setData({ avatarUrl: '/assets/avatar_default.png' });

                    // 同步修改云端头像为默认头像
                    const familyId = getStorage('user_family_id', '');
                    if (familyId && wx.cloud) {
                      try {
                        const db = wx.cloud.database();
                        db.collection('families').doc(familyId).update({
                          data: {
                            baby_avatar: '/assets/avatar_default.png'
                          }
                        });
                      } catch(e) {}
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

  // 内部辅助方法：同步相册数组至云数据库
  _syncCloudAlbum: function (photosList) {
    const familyId = getStorage('user_family_id', '');
    if (familyId && wx.cloud) {
      try {
        const db = wx.cloud.database();
        db.collection('families').doc(familyId).update({
          data: {
            album_photos: photosList
          },
          success: () => {
            console.log("云端相册照片同步更新成功！");
          },
          fail: (err) => {
            console.warn("同步云端相册照片失败：", err);
          }
        });
      } catch (e) {
        console.warn("微信云数据库调用异常：", e);
      }
    }
  }
});
