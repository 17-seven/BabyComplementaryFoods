const axios = require('axios');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

const getSession = async (code) => {
  const { appId, appSecret } = require('../config/wechat');
  if (!appId || !appSecret) {
    // 离线开发模拟模式：自动基于 code 生成固定前缀的虚拟 openid
    const fakeOpenid = 'fake_openid_' + code.substring(0, 10);
    return { openid: fakeOpenid, session_key: 'fake_session_key' };
  }
  const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appId}&secret=${appSecret}&js_code=${code}&grant_type=authorization_code`;
  const res = await axios.get(url);
  if (res.data.errcode) {
    throw new Error('微信接口错误：' + res.data.errmsg);
  }
  return res.data;
};

const login = async (code, nickname, avatarUrl) => {
  const session = await getSession(code);
  const openid = session.openid;

  // 1. 获取或创建用户记录
  let user = await prisma.user.findUnique({ where: { openid } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        openid,
        nickname: nickname || '看护人',
        avatar_url: avatarUrl || ''
      }
    });
  } else if (nickname || avatarUrl) {
    user = await prisma.user.update({
      where: { openid },
      data: {
        nickname: nickname || user.nickname,
        avatar_url: avatarUrl || user.avatar_url
      }
    });
  }

  // 2. 查找用户是否已经绑定过家庭及宝宝
  const familyMember = await prisma.familyMember.findFirst({
    where: { user_openid: openid },
    include: {
      family: {
        include: {
          baby: true
        }
      }
    }
  });

  let familyId = null;
  let babyId = null;
  let isCreator = false;
  let familyRecord = null;

  if (familyMember && familyMember.family) {
    familyRecord = familyMember.family;
    familyId = familyRecord.id;
    babyId = familyRecord.baby_id;
    isCreator = (familyMember.role === 'CREATOR');
  }

  // 3. 生成 JWT Token
  const accessToken = jwt.sign({ openid }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN
  });
  const refreshToken = jwt.sign({ openid }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN
  });

  return {
    accessToken,
    refreshToken,
    user,
    familyId,
    babyId,
    isCreator,
    familyRecord
  };
};

const refresh = async (refreshToken) => {
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const openid = decoded.openid;

    const accessToken = jwt.sign({ openid }, process.env.JWT_ACCESS_SECRET, {
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN
    });
    const newRefreshToken = jwt.sign({ openid }, process.env.JWT_REFRESH_SECRET, {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN
    });

    return {
      accessToken,
      refreshToken: newRefreshToken
    };
  } catch (err) {
    throw new Error('无效的 Refresh Token');
  }
};

module.exports = {
  login,
  refresh
};
