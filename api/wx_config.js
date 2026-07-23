export default async function handler(req, res) {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'missing url' });

  const appid = process.env.WX_APPID;
  const secret = process.env.WX_SECRET;

  try {
    // 1. 获取 access_token
    const tokenUrl = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appid}&secret=${secret}`;
    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();
    if (tokenData.errcode) {
      return res.status(500).json({ error: '获取token失败', detail: tokenData });
    }
    const access_token = tokenData.access_token;

    // 2. 获取 jsapi_ticket
    const ticketUrl = `https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token=${access_token}&type=jsapi`;
    const ticketRes = await fetch(ticketUrl);
    const ticketData = await ticketRes.json();
    if (ticketData.errcode !== 0) {
      return res.status(500).json({ error: '获取ticket失败', detail: ticketData });
    }
    const ticket = ticketData.ticket;

    // 3. 生成签名
    const noncestr = Math.random().toString(36).substr(2, 15);
    const timestamp = Math.floor(Date.now() / 1000);
    const signStr = `jsapi_ticket=${ticket}&noncestr=${noncestr}&timestamp=${timestamp}&url=${url}`;
    const crypto = require('crypto');
    const signature = crypto.createHash('sha1').update(signStr).digest('hex');

    // 4. 返回所有调试信息（正式使用时可删掉 detail 部分）
    return res.json({
      appId: appid,
      timestamp,
      nonceStr: noncestr,
      signature,
      ticket,
      // 以下为调试信息，确认无误后可移除
      debug: {
        access_token,
        ticket_original: ticket,
        sign_string: signStr,
        url_used: url
      }
    });
  } catch (e) {
    return res.status(500).json({ error: e.message, stack: e.stack });
  }
}
