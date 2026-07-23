// api/wx_config.js
export default async function handler(req, res) {
  let { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'missing url' });
  }

  url = url.replace(/\/$/, '');  // 去除末尾斜杠

  const appid = process.env.WX_APPID;
  const secret = process.env.WX_SECRET;

  try {
    // 获取 access_token
    const tokenRes = await fetch(
      `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appid}&secret=${secret}`
    );
    const tokenData = await tokenRes.json();
    const access_token = tokenData.access_token;

    // 获取 jsapi_ticket
    const ticketRes = await fetch(
      `https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token=${access_token}&type=jsapi`
    );
    const ticketData = await ticketRes.json();
    const ticket = ticketData.ticket;

    // 生成签名
    const noncestr = Math.random().toString(36).substr(2, 15);
    const timestamp = Math.floor(Date.now() / 1000);
    const string = `jsapi_ticket=${ticket}&noncestr=${noncestr}&timestamp=${timestamp}&url=${url}`;
    const crypto = require('crypto');
    const signature = crypto.createHash('sha1').update(string).digest('hex');

    // 返回结果（包含 ticket 用于调试）
    return res.json({
      appId: appid,
      timestamp,
      nonceStr: noncestr,
      signature,
      ticket: ticket      // <-- 加了这一行
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
