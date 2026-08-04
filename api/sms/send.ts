import axios from 'axios';

export default async function handler(req: any, res: any) {
  // Support CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const { provider, apiKey, senderId, apiUrl, recipients, message, items, campaign: reqCampaign, routeid: reqRouteid } = req.body || {};

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
        return res.status(200).json({
          success: true,
          provider: "SMSBit / SMS Pasal",
          count: successCount,
          message: `SMSBit (SMS Pasal) गेटवे मार्फत ${successCount} वटा व्यक्तिगत (Customized) SMS सन्देशहरू सफलतापुर्वक पठाइयो!`
        });
      } else {
        const maskedKey = key ? (key.slice(0, 4) + '****' + key.slice(-4)) : '****';
        const safeDataStr = (lastError || 'Unknown Error').split(key).join('****').replace(/(key=)[^&]+/gi, '$1****');
        return res.status(400).json({
          error: `SMS पठाउन असफल भयो (${safeDataStr})`,
          rawError: safeDataStr
        });
      }
    }

    if (!recipients || (Array.isArray(recipients) && recipients.length === 0) || !message) {
      return res.status(400).json({ error: "Recipients and message body are required" });
    }

    // Clean recipient phone numbers (strip non-digits, remove +977 prefix)
    const rawList = Array.isArray(recipients) ? recipients : String(recipients).split(',');
    const cleanedList = rawList
      .map(r => String(r).replace(/\D/g, '').replace(/^977/, ''))
      .filter(p => /^\d{10}$/.test(p));

    if (cleanedList.length === 0) {
      return res.status(400).json({ error: "नेपाली १० अंकको मोबाइल नम्बर भेटिएन (उदा: 9841XXXXXX)" });
    }

    const toStr = cleanedList.join(',');
    const pName = (provider || '').toLowerCase();
    const urlStr = (apiUrl || '').toLowerCase();

    // Route to SMSBit / SMS Pasal by default unless explicitly configured for sparrowsms.com domain
    const isSparrowExplicit = urlStr.includes('sparrowsms') || (pName.includes('sparrow') && !urlStr.includes('smspasal') && apiKey !== '56A71A88EC9CA9');
    const isSmsPasal = !isSparrowExplicit;

    if (isSmsPasal) {
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
        apiRes = await axios.get(targetUrl, {
          params,
          timeout: 15000,
          validateStatus: () => true
        });
      } catch (getErr: any) {
        // Fallback to POST form-urlencoded
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

        return res.status(200).json({
          success: true,
          provider: "SMSBit / SMS Pasal",
          shootId: shootId,
          apiResponse: apiRes.data,
          message: "SMSBit (SMS Pasal) गेटवे मार्फत वास्तविक SMS सन्देश मोवाइलमा सफलतापुर्वक पठाइयो!"
        });
      } else {
        const maskedKey = key ? (key.slice(0, 4) + '****' + key.slice(-4)) : '****';
        const safeDataStr = responseDataStr.split(key).join('****').replace(/(key=)[^&]+/gi, '$1****');

        let userFriendlyError = safeDataStr;
        if (responseDataStr.includes('INVALID API KEY') || responseDataStr.includes('INVALID KEY')) {
          userFriendlyError = `SMSBit API Key (${maskedKey}) अमान्य वा निष्कृय छ। कृपया Super Admin को General Settings मा गएर SMSBit प्यानलको आफ्नो सही API Key राख्नुहोस्। (${safeDataStr})`;
        } else if (responseDataStr.includes('SENDERID') || responseDataStr.includes('INVALID SENDER')) {
          userFriendlyError = `SMSBit मा '${from}' Sender ID स्वीकृत छैन। कृपया आफ्नो प्यानलमा स्वीकृत भएको Sender ID राख्नुहोस्। (${safeDataStr})`;
        } else if (responseDataStr.includes('CREDIT') || responseDataStr.includes('BALANCE')) {
          userFriendlyError = `SMSBit मा सन्देश पठाउन बाँकी SMS Balance/Credit पुगेन। (${safeDataStr})`;
        } else if (responseDataStr.includes('CONTACT')) {
          userFriendlyError = `मोबाइल नम्बर अमान्य छ: (${toStr})। (${safeDataStr})`;
        }

        return res.status(400).json({
          error: userFriendlyError,
          rawError: safeDataStr,
          status: apiRes.status
        });
      }
    }

    // Sparrow SMS or Custom Gateway API
    const token = apiKey || process.env.SPARROW_SMS_TOKEN || process.env.SMS_API_KEY;
    const from = senderId || process.env.SPARROW_SMS_SENDER_ID || process.env.SMS_SENDER_ID || 'Info';
    let targetUrl = apiUrl || process.env.SPARROW_SMS_URL || 'https://api.sparrowsms.com/v2/sms/';

    if (token && token.trim() !== '') {
      const apiRes = await axios.post(targetUrl, {
        token: token.trim(),
        from: from.trim(),
        to: toStr,
        text: message
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000,
        validateStatus: () => true
      });

      if (apiRes.status >= 200 && apiRes.status < 300) {
        return res.status(200).json({
          success: true,
          provider: provider || "Sparrow SMS",
          apiResponse: apiRes.data,
          message: "SMS गेटवे मार्फत वास्तविक सन्देश सफलतापूर्वक पठाइयो!"
        });
      } else {
        const rawErr = apiRes.data;
        let errMsg = "SMS API Error";
        if (typeof rawErr === 'string') {
          errMsg = rawErr;
        } else if (rawErr && typeof rawErr === 'object') {
          errMsg = rawErr.response || rawErr.error || rawErr.message || JSON.stringify(rawErr);
        }
        return res.status(apiRes.status || 500).json({
          error: String(errMsg),
          status: apiRes.status
        });
      }
    } else {
      return res.status(200).json({
        simulated: true,
        success: true,
        message: `[सिम्युलेसन मोड]: ${toStr} मा SMS सन्देश पठाइयो (${message})`
      });
    }
  } catch (err: any) {
    return res.status(500).json({
      error: err.message || "Internal server error"
    });
  }
}
