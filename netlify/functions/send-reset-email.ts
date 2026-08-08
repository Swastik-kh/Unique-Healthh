import axios from 'axios';

export const handler = async (event: any) => {
  // CORS Handling
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
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
    const { email, code, fullName } = JSON.parse(event.body || '{}');

    if (!email || !code) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'email र code आवश्यक छ' })
      };
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Email सेवा कन्फिगर भएको छैन' })
      };
    }

    // Send email via Resend
    await axios.post('https://api.resend.com/emails', {
      from: process.env.RESET_EMAIL_FROM || 'onboarding@resend.dev',
      to: [email],
      subject: 'पासवर्ड रिसेट कोड',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #333;">पासवर्ड रिसेट कोड</h2>
          <p>नमस्ते ${fullName || ''},</p>
          <p>तपाईंको पासवर्ड रिसेट कोड यहाँ छ:</p>
          <div style="background: #f4f4f4; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <b style="font-size: 32px; letter-spacing: 5px; color: #4F46E5;">${code}</b>
          </div>
          <p style="color: #666; font-size: 14px;">यो कोड १० मिनेटमा समाप्त हुनेछ। तपाईंले यो अनुरोध नगर्नुभएको हो भने यो इमेल बेवास्ता गर्नुहोस्।</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #999;">यो एउटा स्वचालित इमेल हो, कृपया यसको जवाफ नदिनुहोस्।</p>
        </div>
      `
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ success: true })
    };
  } catch (err: any) {
    console.error('Email send error:', err.response?.data || err.message);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ error: err.message || 'Internal Server Error' })
    };
  }
};
