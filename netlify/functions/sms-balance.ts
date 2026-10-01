import axios from 'axios';

export async function handler(event: any) {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      },
      body: '',
    };
  }

  try {
    let rawKey = '56A71A88EC9CA9';

    if (event.httpMethod === 'POST' && event.body) {
      try {
        const body = JSON.parse(event.body);
        if (body.apiKey) rawKey = body.apiKey;
      } catch (e) {}
    } else if (event.queryStringParameters) {
      if (event.queryStringParameters.apiKey) rawKey = event.queryStringParameters.apiKey;
      else if (event.queryStringParameters.key) rawKey = event.queryStringParameters.key;
    }

    if (!rawKey) {
      rawKey = process.env.SMS_PASAL_KEY || '56A71A88EC9CA9';
    }

    const key = String(rawKey).trim();
    const targetUrl = `https://sms.smspasal.com/miscapi/${encodeURIComponent(key)}/getBalance/true/`;

    const apiRes = await axios.get(targetUrl, {
      timeout: 12000,
      validateStatus: () => true
    });

    const resData = apiRes.data;

    if (typeof resData === 'string' && resData.includes('ERR:')) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          success: false,
          error: `SMS Pasal API त्रुटि: ${resData}`,
          raw: resData
        })
      };
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

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: true,
        provider: 'SMSBit / SMS Pasal',
        totalBalance: totalBalance,
        routes: routes,
        raw: resData
      })
    };

  } catch (error: any) {
    console.error('Netlify SMS Balance Check Error:', error.message);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: false,
        error: `SMS ब्यालेन्स चेक गर्न सकिएन: ${error.message}`
      })
    };
  }
}
