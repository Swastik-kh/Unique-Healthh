import axios from 'axios';

export const handler = async (event: any, context: any) => {
  // Support CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed. Use POST.' })
    };
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { apiKey, senderAddress, senderName, to, subject, htmlBody } = body;

    if (!apiKey || !senderAddress || !to || !subject || !htmlBody) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: "Missing required fields: apiKey, senderAddress, to, subject, and htmlBody are required." })
      };
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
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({
            success: true,
            id: response.data.id,
            message: "Email successfully sent via Resend!"
          })
        };
      } else {
        // Mask API Key in error response
        const maskedKey = apiKey ? (apiKey.slice(0, 4) + '****' + apiKey.slice(-4)) : '****';
        const responseDataStr = typeof response.data === 'string' ? response.data : JSON.stringify(response.data || '');
        const safeErrorStr = responseDataStr.split(apiKey).join('****');

        return {
          statusCode: response.status,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({
            error: `Resend API Error: ${safeErrorStr}`,
            status: response.status
          })
        };
      }
    } catch (apiErr: any) {
      const maskedKey = apiKey ? (apiKey.slice(0, 4) + '****' + apiKey.slice(-4)) : '****';
      const safeErrMessage = (apiErr.message || 'Unknown network error').split(apiKey).join('****');
      
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({
          error: `Network Error while calling Resend: ${safeErrMessage}`
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
