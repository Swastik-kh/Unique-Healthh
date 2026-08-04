import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import axios from "axios";

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
  app.post("/api/sms/send", async (req, res) => {
    try {
      const { provider, apiKey, senderId, apiUrl, recipients, message } = req.body;

      if (!recipients || (Array.isArray(recipients) && recipients.length === 0) || !message) {
        return res.status(400).json({ error: "Recipients and message body are required" });
      }

      // Clean recipient phone numbers (strip non-digits, remove +977 prefix)
      const rawList = Array.isArray(recipients) ? recipients : String(recipients).split(',');
      const cleanedList = rawList
        .map(r => String(r).replace(/\D/g, '').replace(/^977/, ''))
        .filter(p => p.length >= 10);

      if (cleanedList.length === 0) {
        return res.status(400).json({ error: "नेपाली १० अंकको मोबाइल नम्बर भेटिएन (उदा: 9841XXXXXX)" });
      }

      const toStr = cleanedList.join(',');
      const pName = (provider || '').toLowerCase();
      const urlStr = (apiUrl || '').toLowerCase();

      // Check if provider is SMS Pasal / SMSBit or if URL points to smspasal.com or if no custom provider specified
      const isSmsPasal = pName.includes('pasal') || pName.includes('smsbit') || urlStr.includes('smspasal') || (!provider && !apiUrl) || provider === 'SMS Pasal' || provider === 'SMSBit';

      if (isSmsPasal) {
        const key = apiKey || process.env.SMS_PASAL_KEY || '56A71A88EC9CA9';
        const targetUrl = apiUrl || process.env.SMS_PASAL_URL || 'https://sms.smspasal.com/smsapi/index.php';
        const from = senderId || process.env.SMS_PASAL_SENDER || 'SMSBit';
        const campaign = req.body.campaign || process.env.SMS_PASAL_CAMPAIGN || '9674';
        const routeid = req.body.routeid || process.env.SMS_PASAL_ROUTEID || '10259';

        console.log(`Sending SMS via SMSBit (${targetUrl}) to: ${toStr}`);

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
          // Parse friendly error for common SMSBit error messages
          let userFriendlyError = responseDataStr;
          if (responseDataStr.includes('INVALID API KEY') || responseDataStr.includes('INVALID KEY')) {
            userFriendlyError = `SMSBit API Key (${key}) अमान्य वा निष्कृय छ। कृपया Super Admin को General Settings मा गएर SMSBit प्यानलको आफ्नो सही API Key राख्नुहोस्। (${responseDataStr})`;
          } else if (responseDataStr.includes('SENDERID') || responseDataStr.includes('INVALID SENDER')) {
            userFriendlyError = `SMSBit मा '${from}' Sender ID स्वीकृत छैन। कृपया आफ्नो प्यानलमा स्वीकृत भएको Sender ID राख्नुहोस्। (${responseDataStr})`;
          } else if (responseDataStr.includes('CREDIT') || responseDataStr.includes('BALANCE')) {
            userFriendlyError = `SMSBit मा सन्देश पठाउन बाँकी SMS Balance/Credit पुगेन। (${responseDataStr})`;
          } else if (responseDataStr.includes('CONTACT')) {
            userFriendlyError = `मोबाइल नम्बर अमान्य छ: (${toStr})। (${responseDataStr})`;
          }

          return res.status(400).json({
            error: userFriendlyError,
            rawError: responseDataStr,
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
          return res.status(apiRes.status || 500).json({
            error: typeof apiRes.data === 'string' ? apiRes.data : (apiRes.data?.response || apiRes.data?.error || "SMS API Error"),
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
