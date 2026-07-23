// api/wx_config.js
// 使用 Node.js 内置模块，无需安装任何第三方依赖

async function getAccessToken(appid, secret) {
  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appid}&secret=${secret}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.access_token;
}

async function getJsapiTicket(accessToken) {
  const url = `https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token=${accessToken}&type=jsapi`;
  const res = await fetch(url);
  const data = await res.json();
  return data.ticket;
}

export default async function handler(req, res) {
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
    const str = `jsapi_ticket=${ticket}&noncestr=${noncestr}&timestamp=${timestamp}&url=${url}`;
    const signature = require('crypto').createHash('sha1').update(str).digest('hex');

    return res.json({
      appId: appid,
      timestamp,
      nonceStr: noncestr,
      signature
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
