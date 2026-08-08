import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import { getApps, initializeApp } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";

// Initialize Firebase Admin
try {
  if (getApps().length === 0) {
    initializeApp({
      databaseURL: "https://smart-health-dce40-default-rtdb.asia-southeast1.firebasedatabase.app"
    });
  }
} catch (e: any) {
  console.warn("Firebase Admin Initialization Warning:", e.message);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // HIB Helper to get auth header
  const getHIBAuth = (req: express.Request) => {
    const headerUser = req.headers['x-hib-username'] as string;
    const headerPass = req.headers['x-hib-password'] as string;
    const username = (headerUser && headerUser.trim() !== '') ? headerUser : (process.env.HIB_USERNAME || 'testuser');
    const password = (headerPass && headerPass.trim() !== '') ? headerPass : (process.env.HIB_PASSWORD || 'f/\\N6k@67');
    return Buffer.from(`${username}:${password}`).toString('base64');
  };

  const getHIBHeaders = (req: express.Request) => {
    const remoteUserHeader = req.headers['x-hib-remote-user'] as string;
    const remoteUser = (remoteUserHeader && remoteUserHeader.trim() !== '' && remoteUserHeader !== 'undefined') ? remoteUserHeader : (process.env.HIB_REMOTE_USER || 'hib_testuser_testfhir');
    
    const headers: any = {
      'Authorization': `Basic ${getHIBAuth(req)}`,
      'remote-user': remoteUser,
      'Content-Type': 'application/json'
    };

    const partnerId = req.headers['x-hib-partner-id'] as string;
    const locationId = req.headers['x-hib-location-id'] as string;

    if (partnerId && partnerId.trim() !== '' && partnerId !== 'undefined') {
      headers['partner-id'] = partnerId;
    }
    if (locationId && locationId.trim() !== '' && locationId !== 'undefined') {
      headers['location-id'] = locationId;
    }

    return headers;
  };

  // Debug endpoint to check outbound IP (for HIB Whitelisting)
  app.get("/api/debug/ip", async (req, res) => {
    try {
      console.log("Checking outbound IP via ipify...");
      let ip = '';
      try {
        const response = await axios.get('https://api.ipify.org?format=json', { timeout: 5000 });
        ip = response.data.ip;
      } catch (e) {
        console.warn("ipify failed, trying icanhazip...");
        const response = await axios.get('https://icanhazip.com', { timeout: 5000 });
        ip = response.data.trim();
      }
      
      console.log("Outbound IP detected:", ip);
      res.json({ outboundIp: ip, note: "Provide this IP to HIB for whitelisting." });
    } catch (error: any) {
      console.error("IP check failed:", error.message);
      res.status(500).json({ error: "Failed to fetch outbound IP", details: error.message });
    }
  });

  // HIB API Routes
  app.get("/api/hib/patient/:id", async (req, res) => {
    try {
      const { id } = req.params;
      let baseUrl = (req.headers['x-hib-base-url'] as string);
      if (!baseUrl || baseUrl === 'undefined' || baseUrl.trim() === '') {
        baseUrl = process.env.HIB_BASE_URL || 'https://imislegacy.hib.gov.np/';
      }
      
      // Ensure protocol
      if (!baseUrl.startsWith('http')) {
        baseUrl = `https://${baseUrl}`;
      }

      // Sanitize baseUrl: remove trailing slash if present for consistent joining
      if (baseUrl.endsWith('/')) {
        baseUrl = baseUrl.slice(0, -1);
      }
      
      // Note: Some HIB endpoints are sensitive to trailing slashes before query params
      const targetUrl = `${baseUrl}/api/api_fhir/Patient/?identifier=${id}`;
      console.log(`HIB Search URL: ${targetUrl}`);
      
      const response = await axios.get(targetUrl, {
        headers: getHIBHeaders(req),
        validateStatus: () => true
      });

      // If we get an HTML response (likely an error page or redirect), return error
      if (typeof response.data === 'string' && response.data.includes('<!DOCTYPE html')) {
        console.error("HIB Patient Search returned HTML for ID:", id);
        return res.status(response.status || 500).json({ 
          error: "HIB Server returned an error page instead of patient data.",
          status: response.status,
          url: targetUrl,
          message: "Authentication failed or IP not whitelisted."
        });
      }

      if (response.status === 404) {
        return res.status(404).json({
          error: "HIB Endpoint not found (404)",
          url: targetUrl,
          details: response.data
        });
      }

      res.status(response.status).json(response.data);
    } catch (error: any) {
      const errorData = error.response?.data;
      const status = error.response?.status || 500;
      console.error(`HIB Patient Search Error [${status}]:`, errorData || error.message);
      
      res.status(status).json({
        error: errorData?.message || errorData?.error || error.message || "Failed to search patient",
        details: errorData,
        status: status
      });
    }
  });

  app.get("/api/hib/coverage/:id", async (req, res) => {
    try {
      const { id } = req.params;
      let baseUrl = (req.headers['x-hib-base-url'] as string);
      if (!baseUrl || baseUrl === 'undefined' || baseUrl.trim() === '') {
        baseUrl = process.env.HIB_BASE_URL || 'https://imislegacy.hib.gov.np/';
      }
      
      if (!baseUrl.startsWith('http')) {
        baseUrl = `https://${baseUrl}`;
      }

      if (baseUrl.endsWith('/')) {
        baseUrl = baseUrl.slice(0, -1);
      }

      const targetUrl = `${baseUrl}/api/api_fhir/Coverage/?identifier=${id}`;
      
      const response = await axios.get(targetUrl, {
        headers: getHIBHeaders(req),
        validateStatus: () => true // Handle all status codes
      });
      
      // If we get an HTML response (likely an error page or redirect), return empty bundle or error
      if (typeof response.data === 'string' && response.data.includes('<!DOCTYPE html')) {
        console.error("HIB Coverage returned HTML instead of FHIR bundle for ID:", id);
        // If it's a 401/403, it's an auth error
        if (response.status === 401 || response.status === 403) {
          return res.status(response.status).json({ error: "HIB Authentication Failed. Please check your credentials." });
        }
        return res.json({ resourceType: "Bundle", entry: [] });
      }
      
      res.status(response.status).json(response.data);
    } catch (error: any) {
      console.error("HIB Coverage Search Error:", error.response?.data || error.message);
      res.status(error.response?.status || 500).json(error.response?.data || { error: "Failed to search coverage" });
    }
  });

  app.post("/api/hib/eligibility", async (req, res) => {
    try {
      const baseUrl = (req.headers['x-hib-base-url'] as string) || process.env.HIB_BASE_URL || 'https://imislegacy.hib.gov.np/';
      const response = await axios.post(`${baseUrl}api/api_fhir/EligibilityRequest/`, req.body, {
        headers: getHIBHeaders(req)
      });
      res.json(response.data);
    } catch (error: any) {
      console.error("HIB Eligibility Error:", error.response?.data || error.message);
      res.status(error.response?.status || 500).json(error.response?.data || { error: "Failed to check eligibility" });
    }
  });

  app.post("/api/hib/claim", async (req, res) => {
    try {
      const baseUrl = (req.headers['x-hib-base-url'] as string) || process.env.HIB_BASE_URL || 'https://imislegacy.hib.gov.np/';
      const response = await axios.post(`${baseUrl}api/api_fhir/Claim/`, req.body, {
        headers: getHIBHeaders(req)
      });
      res.json(response.data);
    } catch (error: any) {
      console.error("HIB Claim Error:", error.response?.data || error.message);
      res.status(error.response?.status || 500).json(error.response?.data || { error: "Failed to submit claim" });
    }
  });

  app.get("/api/hib/claim/search", async (req, res) => {
    try {
      const { chfid, date_claimed } = req.query;
      if (!chfid || !date_claimed) {
        return res.status(400).json({ error: "chfid and date_claimed are required query parameters" });
      }

      let baseUrl = (req.headers['x-hib-base-url'] as string);
      if (!baseUrl || baseUrl === 'undefined' || baseUrl.trim() === '') {
        baseUrl = process.env.HIB_BASE_URL || 'https://imislegacy.hib.gov.np/';
      }
      
      if (!baseUrl.startsWith('http')) {
        baseUrl = `https://${baseUrl}`;
      }

      if (baseUrl.endsWith('/')) {
        baseUrl = baseUrl.slice(0, -1);
      }

      const targetUrl = `${baseUrl}/api/api_fhir/claim/code/search/?chfid=${chfid}&date_claimed=${date_claimed}`;
      console.log(`HIB Claim Search URL: ${targetUrl}`);

      const response = await axios.get(targetUrl, {
        headers: getHIBHeaders(req),
        validateStatus: () => true
      });

      if (typeof response.data === 'string' && response.data.includes('<!DOCTYPE html')) {
        console.error("HIB Claim Search returned HTML for chfid:", chfid);
        return res.status(response.status || 500).json({
          error: "HIB Server returned an error page instead of search data.",
          status: response.status,
          url: targetUrl
        });
      }

      res.status(response.status).json(response.data);
    } catch (error: any) {
      console.error("HIB Claim Search Error:", error.response?.data || error.message);
      res.status(error.response?.status || 500).json(error.response?.data || { error: "Failed to search claim code" });
    }
  });

  // DHIS2 Proxy Endpoint
  app.post("/api/dhis2/push", async (req, res) => {
    try {
      const { payload, baseUrl, username, password } = req.body;
      
      if (!baseUrl || !username || !password || !payload) {
        return res.status(400).json({ error: "Missing required DHIS2 configuration or payload" });
      }

      const auth = Buffer.from(`${username}:${password}`).toString('base64');
      
      // Ensure target URL is correct
      let targetUrl = baseUrl;
      if (!targetUrl.endsWith('/')) targetUrl += '/';
      targetUrl += 'api/dataValueSets';

      console.log(`Pushing to DHIS2: ${targetUrl}`);

      const response = await axios.post(targetUrl, payload, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout for DHIS2
      });

      res.status(response.status).json(response.data);
    } catch (error: any) {
      const status = error.response?.status || 500;
      const errorData = error.response?.data;
      console.error(`DHIS2 Proxy Error [${status}]:`, errorData || error.message);
      
      res.status(status).json({
        error: errorData?.message || errorData?.description || error.message || "DHIS2 push failed",
        details: errorData,
        status: status
      });
    }
  });

  // Universal SMS Proxy Endpoint (SMS Pasal / Sparrow SMS / Custom)
  app.all("/api/sms/balance", async (req, res) => {
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
  });

  app.post("/api/sms/send", async (req, res) => {
    try {
      const { provider, apiKey, senderId, apiUrl, recipients, message, items } = req.body;

      // Handle items array if individual bulk messages are provided
      if (Array.isArray(items) && items.length > 0) {
        const pName = (provider || '').toLowerCase();
        const urlStr = (apiUrl || '').toLowerCase();
        const isSparrowExplicit = urlStr.includes('sparrowsms') || (pName.includes('sparrow') && !urlStr.includes('smspasal') && apiKey !== '56A71A88EC9CA9');
        const isSmsPasal = !isSparrowExplicit;

        const key = apiKey || process.env.SMS_PASAL_KEY || '56A71A88EC9CA9';
        const targetUrl = (apiUrl && apiUrl.includes('http')) ? apiUrl : 'https://sms.smspasal.com/smsapi/index.php';
        const from = senderId || process.env.SMS_PASAL_SENDER || 'SMSBit';
        const campaign = req.body.campaign || process.env.SMS_PASAL_CAMPAIGN || '9674';
        const routeid = req.body.routeid || process.env.SMS_PASAL_ROUTEID || '10259';

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
          return res.json({
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
        const campaign = req.body.campaign || process.env.SMS_PASAL_CAMPAIGN || '9674';
        const routeid = req.body.routeid || process.env.SMS_PASAL_ROUTEID || '10259';

        console.log(`Sending SMS via SMSBit / SMS Pasal (${targetUrl}) to: ${toStr}`);

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
          console.warn("GET failed, trying POST to SMSBit...", getErr.message);
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

        console.log("SMS Pasal Response:", apiRes.status, apiRes.data);

        const responseDataStr = typeof apiRes.data === 'string' ? apiRes.data : JSON.stringify(apiRes.data || '');

        if (apiRes.status >= 200 && apiRes.status < 300 && !responseDataStr.includes('ERR:')) {
          let shootId = '';
          if (responseDataStr.includes('SMS-SHOOT-ID/')) {
            shootId = responseDataStr.split('SMS-SHOOT-ID/')[1]?.trim() || '';
          }

          return res.json({
            success: true,
            provider: "SMSBit / SMS Pasal",
            shootId: shootId,
            apiResponse: apiRes.data,
            message: "SMSBit (SMS Pasal) गेटवे मार्फत वास्तविक SMS सन्देश मोवाइलमा सफलतापुर्वक पठाइयो!"
          });
        } else {
          const maskedKey = key ? (key.slice(0, 4) + '****' + key.slice(-4)) : '****';
          const safeDataStr = responseDataStr.split(key).join('****').replace(/(key=)[^&]+/gi, '$1****');

          // Parse friendly error for common SMSBit error messages
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

      console.log(`Sending SMS via ${provider || 'Gateway'} to: ${toStr}`);

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

        console.log("SMS Gateway Response Code:", apiRes.status, apiRes.data);

        if (apiRes.status >= 200 && apiRes.status < 300) {
          return res.json({
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
        console.log("No SMS API key found in settings. Operating in simulation mode.");
        return res.json({
          success: true,
          simulated: true,
          message: "SMS API Token प्राप्त नभएकाले सिम्युलेसन मोडमा चलाइएको हो।"
        });
      }
    } catch (error: any) {
      console.error("SMS Proxy Error:", error.response?.data || error.message);
      const rawData = error.response?.data;
      let errStr = "SMS पठाउन असफल भयो।";
      if (typeof rawData === 'string') {
        errStr = rawData;
      } else if (rawData && typeof rawData === 'object') {
        errStr = rawData.response || rawData.error || JSON.stringify(rawData);
      } else if (error.message) {
        errStr = error.message;
      }

      res.status(error.response?.status || 500).json({
        error: String(errStr)
      });
    }
  });

  // Email Proxy Endpoint (Resend API)
  app.post("/api/email/send", async (req, res) => {
    try {
      let { apiKey, senderAddress, senderName, to, subject, htmlBody, attachments } = req.body;

      // Secure: If apiKey is missing, fetch from Firebase Admin
      if (!apiKey || !senderAddress) {
        try {
          const snapshot = await getDatabase().ref("organizationSettings/config").once("value");
          const config = snapshot.val() || {};
          apiKey = apiKey || config.emailApiKey;
          senderAddress = senderAddress || config.emailSenderAddress;
          senderName = senderName || config.emailSenderName;
          console.log("Fetched Email Config from Firebase");
        } catch (dbErr: any) {
          console.error("Failed to fetch email config from Firebase:", dbErr.message);
        }
      }

      if (!apiKey || !senderAddress || !to || !subject || !htmlBody) {
        return res.status(400).json({ error: "Missing required fields: apiKey, senderAddress, to, subject, and htmlBody are required." });
      }

      const resendUrl = 'https://api.resend.com/emails';
      console.log(`Sending Email via Resend to: ${to}`);

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

          console.error(`Resend API Error [${response.status}]:`, safeErrorStr);

          return res.status(response.status).json({
            error: `Resend API Error: ${safeErrorStr}`,
            status: response.status
          });
        }
      } catch (apiErr: any) {
        const maskedKey = apiKey ? (apiKey.slice(0, 4) + '****' + apiKey.slice(-4)) : '****';
        const safeErrMessage = (apiErr.message || 'Unknown network error').split(apiKey).join('****');
        console.error("Resend Network Error:", safeErrMessage);
        
        return res.status(500).json({
          error: `Network Error while calling Resend: ${safeErrMessage}`
        });
      }
    } catch (err: any) {
      console.error("Email API Handler Error:", err.message);
      return res.status(500).json({ error: err.message || "Internal Server Error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
