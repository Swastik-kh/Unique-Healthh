import axios from 'axios';
import { getApps, initializeApp } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import { applyCorsHeaders, authenticateServerlessRequest } from '../../lib/apiSecurity';

// Initialize Firebase Admin
if (getApps().length === 0) {
  try {
    initializeApp({
      databaseURL: process.env.FIREBASE_DATABASE_URL || "https://smart-health-dce40-default-rtdb.asia-southeast1.firebasedatabase.app"
    });
  } catch (e) {
    console.error("Firebase Admin Init Error:", e);
  }
}

const EMAIL_ROLES = ["SUPER_ADMIN", "ADMIN", "STAFF", "ACCOUNT", "HEALTH_SECTION", "APPROVAL", "STOREKEEPER", "ANONYMOUS"];

export default async function handler(req: any, res: any) {
  if (!applyCorsHeaders(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const authResult = await authenticateServerlessRequest(req, res, EMAIL_ROLES);
  if (!authResult.authorized) return;

  try {
    let { apiKey, senderAddress, senderName, to, subject, htmlBody, attachments } = req.body || {};

    // Secure: Fetch from Firebase if missing
    if (!apiKey || !senderAddress) {
      try {
        const snapshot = await getDatabase().ref("organizationSettings/config").once("value");
        const config = snapshot.val() || {};
        apiKey = apiKey || config.emailApiKey;
        senderAddress = senderAddress || config.emailSenderAddress;
        senderName = senderName || config.emailSenderName;
      } catch (dbErr: any) {
        console.error("DB Fetch Error:", dbErr.message);
      }
    }

    if (!apiKey || !senderAddress || !to || !subject || !htmlBody) {
      return res.status(400).json({ error: "Missing required fields: apiKey, senderAddress, to, subject, and htmlBody are required." });
    }

    const resendUrl = 'https://api.resend.com/emails';
    
    try {
      const response = await axios.post(resendUrl, {
        from: `${senderName || 'Notification'} <${senderAddress}>`,
        to: Array.isArray(to) ? to : [to],
        subject: subject,
        html: htmlBody,
        attachments: attachments || []
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
