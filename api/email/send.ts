import axios from 'axios';

export default async function handler(req: any, res: any) {
  // Support CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const { apiKey, senderAddress, senderName, to, subject, htmlBody } = req.body || {};

    if (!apiKey || !senderAddress || !to || !subject || !htmlBody) {
      return res.status(400).json({ error: "Missing required fields: apiKey, senderAddress, to, subject, and htmlBody are required." });
    }

    const resendUrl = 'https://api.resend.com/emails';
    
    try {
      const response = await axios.post(resendUrl, {
        from: `${senderName || 'Notification'} <${senderAddress}>`,
        to: Array.isArray(to) ? to : [to],
        subject: subject,
        html: htmlBody
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000,
        validateStatus: () => true
      });

      if (response.status >= 200 && response.status < 300) {
        return res.status(200).json({
          success: true,
          id: response.data.id,
          message: "Email successfully sent via Resend!"
        });
      } else {
        // Mask API Key in error response
        const maskedKey = apiKey ? (apiKey.slice(0, 4) + '****' + apiKey.slice(-4)) : '****';
        const responseDataStr = typeof response.data === 'string' ? response.data : JSON.stringify(response.data || '');
        const safeErrorStr = responseDataStr.split(apiKey).join('****');

        return res.status(response.status).json({
          error: `Resend API Error: ${safeErrorStr}`,
          status: response.status
        });
      }
    } catch (apiErr: any) {
      const maskedKey = apiKey ? (apiKey.slice(0, 4) + '****' + apiKey.slice(-4)) : '****';
      const safeErrMessage = (apiErr.message || 'Unknown network error').split(apiKey).join('****');
      
      return res.status(500).json({
        error: `Network Error while calling Resend: ${safeErrMessage}`
      });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal Server Error" });
  }
}
