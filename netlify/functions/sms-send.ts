import axios from 'axios';

export const handler = async (event: any, context: any) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { provider, apiKey, senderId, apiUrl, recipients, message, items, campaign: reqCampaign, routeid: reqRouteid } = body;

    if (Array.isArray(items) && items.length > 0) {
      const pName = (provider || '').toLowerCase();
      const urlStr = (apiUrl || '').toLowerCase();
      const isSparrowExplicit = urlStr.includes('sparrowsms') || (pName.includes('sparrow') && !urlStr.includes('smspasal') && apiKey !== '56A71A88EC9CA9');
      const isSmsPasal = !isSparrowExplicit;

      const key = apiKey || process.env.SMS_PASAL_KEY || '56A71A88EC9CA9';
      const targetUrl = (apiUrl && apiUrl.includes('http')) ? apiUrl : 'https://sms.smspasal.com/smsapi/index.php';
      const from = senderId || process.env.SMS_PASAL_SENDER || 'SMSBit';
      const campaign = reqCampaign || process.env.SMS_PASAL_CAMPAIGN || '9674';
      const routeid = reqRouteid || process.env.SMS_PASAL_ROUTEID || '10259';

      let successCount = 0;
      let lastError = '';

      await Promise.all(items.map(async (item: any) => {
        const rawTo = item.recipient || item.to;
        const itemMsg = item.message;
        if (!rawTo || !itemMsg) return;

        const cleanedTo = String(rawTo).replace(/\D/g, '').replace(/^977/, '');
        if (!/^\d{10}$/.test(cleanedTo)) return;

        if (isSmsPasal) {
          const params = {
            key: key.trim(),
            campaign: campaign.trim(),
            routeid: routeid.trim(),
            type: 'text',
            responsetype: 'json',
            contacts: cleanedTo,
            senderid: from.trim(),
            msg: itemMsg
          };

          try {
            const apiRes = await axios.get(targetUrl, { params, timeout: 15000, validateStatus: () => true });
            const resStr = typeof apiRes.data === 'string' ? apiRes.data : JSON.stringify(apiRes.data || '');
            if (apiRes.status >= 200 && apiRes.status < 300 && !resStr.includes('ERR:')) {
              successCount++;
            } else {
              lastError = resStr;
            }
          } catch (err: any) {
            lastError = err.message;
          }
        }
      }));

      if (successCount > 0) {
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({
            success: true,
            provider: "SMSBit / SMS Pasal",
            count: successCount,
            message: `SMSBit (SMS Pasal) गेटवे मार्फत ${successCount} वटा व्यक्तिगत (Customized) SMS सन्देशहरू सफलतापुर्वक पठाइयो!`
          })
        };
      } else {
        const maskedKey = key ? (key.slice(0, 4) + '****' + key.slice(-4)) : '****';
        const safeDataStr = (lastError || 'Unknown Error').split(key).join('****').replace(/(key=)[^&]+/gi, '$1****');
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({
            error: `SMS पठाउन असफल भयो (${safeDataStr})`,
            rawError: safeDataStr
          })
        };
      }
    }

    if (!recipients || (Array.isArray(recipients) && recipients.length === 0) || !message) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Recipients and message body are required" })
      };
    }

    const rawList = Array.isArray(recipients) ? recipients : String(recipients).split(',');
    const cleanedList = rawList
      .map(r => String(r).replace(/\D/g, '').replace(/^977/, ''))
      .filter(p => /^\d{10}$/.test(p));

    if (cleanedList.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "नेपाली १० अंकको मोबाइल नम्बर भेटिएन (उदा: 9841XXXXXX)" })
      };
    }

    const toStr = cleanedList.join(',');
    const key = apiKey || process.env.SMS_PASAL_KEY || '56A71A88EC9CA9';
    const targetUrl = (apiUrl && apiUrl.includes('http')) ? apiUrl : 'https://sms.smspasal.com/smsapi/index.php';
    const from = senderId || process.env.SMS_PASAL_SENDER || 'SMSBit';
    const campaign = reqCampaign || process.env.SMS_PASAL_CAMPAIGN || '9674';
    const routeid = reqRouteid || process.env.SMS_PASAL_ROUTEID || '10259';

    const params = {
      key: key.trim(),
      campaign: campaign.trim(),
      routeid: routeid.trim(),
      type: 'text',
      responsetype: 'json',
      contacts: toStr,
      senderid: from.trim(),
      msg: message
    };

    let apiRes;
    try {
      apiRes = await axios.get(targetUrl, { params, timeout: 15000, validateStatus: () => true });
    } catch (getErr: any) {
      const formData = new URLSearchParams();
      formData.append('key', key.trim());
      formData.append('campaign', campaign.trim());
      formData.append('routeid', routeid.trim());
      formData.append('type', 'text');
      formData.append('responsetype', 'json');
      formData.append('contacts', toStr);
      formData.append('senderid', from.trim());
      formData.append('msg', message);

      apiRes = await axios.post(targetUrl, formData.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 15000,
        validateStatus: () => true
      });
    }

    const responseDataStr = typeof apiRes.data === 'string' ? apiRes.data : JSON.stringify(apiRes.data || '');

    if (apiRes.status >= 200 && apiRes.status < 300 && !responseDataStr.includes('ERR:')) {
      let shootId = '';
      if (responseDataStr.includes('SMS-SHOOT-ID/')) {
        shootId = responseDataStr.split('SMS-SHOOT-ID/')[1]?.trim() || '';
      }

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          success: true,
          provider: "SMSBit / SMS Pasal",
          shootId: shootId,
          apiResponse: apiRes.data,
          message: "SMSBit (SMS Pasal) गेटवे मार्फत वास्तविक SMS सन्देश मोवाइलमा सफलतापुर्वक पठाइयो!"
        })
      };
    } else {
      const maskedKey = key ? (key.slice(0, 4) + '****' + key.slice(-4)) : '****';
      const safeDataStr = responseDataStr.split(key).join('****').replace(/(key=)[^&]+/gi, '$1****');

      let userFriendlyError = safeDataStr;
      if (responseDataStr.includes('INVALID API KEY') || responseDataStr.includes('INVALID KEY')) {
        userFriendlyError = `SMSBit API Key (${maskedKey}) अमान्य वा निष्कृय छ। (${safeDataStr})`;
      }

      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          error: userFriendlyError,
          rawError: safeDataStr,
          status: apiRes.status
        })
      };
    }
  } catch (err: any) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message || "Internal Server Error" })
    };
  }
};
