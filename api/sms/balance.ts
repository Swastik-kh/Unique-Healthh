import axios from 'axios';

export default async function handler(req: any, res: any) {
  // Support CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const rawKey = req.body?.apiKey || req.query?.apiKey || req.query?.key || process.env.SMS_PASAL_KEY || '56A71A88EC9CA9';
    const key = String(rawKey).trim();

    if (!key) {
      return res.status(400).json({ error: 'API Key (Token) आवश्यक छ।' });
    }

    const targetUrl = `https://sms.smspasal.com/miscapi/${encodeURIComponent(key)}/getBalance/true/`;

    const apiRes = await axios.get(targetUrl, {
      timeout: 12000,
      validateStatus: () => true
    });

    const resData = apiRes.data;

    if (typeof resData === 'string' && resData.includes('ERR:')) {
      return res.status(400).json({
        success: false,
        error: `SMS Pasal API त्रुटि: ${resData}`,
        raw: resData
      });
    }

    let totalBalance = 0;
    let routes: Array<{ routeId?: number | string; routeName?: string; balance: number }> = [];

    if (Array.isArray(resData)) {
      routes = resData.map((r: any) => ({
        routeId: r.ROUTE_ID || r.route_id,
        routeName: r.ROUTE || r.route,
        balance: Number(r.BALANCE ?? r.balance ?? 0)
      }));
      totalBalance = routes.reduce((acc, curr) => acc + (isNaN(curr.balance) ? 0 : curr.balance), 0);
    } else if (typeof resData === 'object' && resData !== null) {
      totalBalance = Number(resData.balance ?? resData.BALANCE ?? 0);
      routes = [{ balance: totalBalance }];
    } else if (!isNaN(Number(resData))) {
      totalBalance = Number(resData);
      routes = [{ balance: totalBalance }];
    }

    return res.status(200).json({
      success: true,
      provider: 'SMSBit / SMS Pasal',
      totalBalance: totalBalance,
      routes: routes,
      raw: resData
    });

  } catch (error: any) {
    console.error('SMS Balance Check Error:', error.message);
    return res.status(500).json({
      success: false,
      error: `SMS ब्यालेन्स चेक गर्न सकिएन: ${error.message}`
    });
  }
}
