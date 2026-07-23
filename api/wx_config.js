const axios = require('axios');

// 缓存 access_token 和 ticket，减少请求次数（Vercel 函数无状态，但单次冷启动后可复用）
let tokenCache = { value: null, expires: 0 };
let ticketCache = { value: null, expires: 0 };

async function getAccessToken(appid, secret) {
  if (tokenCache.value && Date.now() < tokenCache.expires) {
    return tokenCache.value;
  }
  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appid}&secret=${secret}`;
  const { data } = await axios.get(url);
  tokenCache.value = data.access_token;
  tokenCache.expires = Date.now() + 7200 * 1000 - 300; // 提前5分钟过期
  return data.access_token;
}

async function getJsapiTicket(accessToken) {
  if (ticketCache.value && Date.now() < ticketCache.expires) {
    return ticketCache.value;
  }
  const url = `https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token=${accessToken}&type=jsapi`;
  const { data } = await axios.get(url);
  ticketCache.value = data.ticket;
  ticketCache.expires = Date.now() + 7200 * 1000 - 300;
  return data.ticket;
}

function generateSignature(ticket, noncestr, timestamp, url) {
  const str = `jsapi_ticket=${ticket}&noncestr=${noncestr}&timestamp=${timestamp}&url=${url}`;
  return require('crypto').createHash('sha1').update(str).digest('hex');
}

module.exports = async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'missing url' });
  }

  const appid = process.env.WX_APPID;
  const secret = process.env.WX_SECRET;

  try {
    const token = await getAccessToken(appid, secret);
    const ticket = await getJsapiTicket(token);
    const noncestr = Math.random().toString(36).substr(2, 15);
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = generateSignature(ticket, noncestr, timestamp, url);
    res.json({ appId: appid, timestamp, nonceStr: noncestr, signature });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
