import axios from 'axios';
import { applyCorsHeaders, authenticateServerlessRequest } from '../../lib/apiSecurity';

export default async function handler(req: any, res: any) {
  if (!applyCorsHeaders(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const authResult = await authenticateServerlessRequest(req, res, ['SUPER_ADMIN', 'ADMIN', 'STAFF', 'APPROVAL', 'HEALTH_SECTION']);
  if (!authResult.authorized) return;

  try {
    const { payload, baseUrl, username, password } = req.body || {};

    if (!baseUrl || !username || !password || !payload) {
      return res.status(400).json({
        error: 'DHIS2 सेटअप (Base URL, Username, Password) वा डाटा पेलोड खाली छ।'
      });
    }

    const auth = Buffer.from(`${username}:${password}`).toString('base64');

    let cleanBase = String(baseUrl).trim();
    if (!cleanBase.startsWith('http://') && !cleanBase.startsWith('https://')) {
      cleanBase = `https://${cleanBase}`;
    }
    cleanBase = cleanBase.replace(/\/+$/, '');

    if (cleanBase.toLowerCase().endsWith('/api')) {
      cleanBase = cleanBase.slice(0, -4);
    }

    const targetUrl = `${cleanBase}/api/dataValueSets`;

    console.log(`Pushing to DHIS2 (Vercel Function): ${targetUrl}`);

    const response = await axios.post(targetUrl, payload, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 45000,
      validateStatus: () => true
    });

    const contentType = String(response.headers?.['content-type'] || '');
    const isHtml =
      (typeof response.data === 'string' &&
        (response.data.includes('<!DOCTYPE html') || response.data.includes('<html'))) ||
      contentType.includes('text/html');

    if (isHtml) {
      console.error('DHIS2 push returned HTML instead of JSON. Target URL:', targetUrl);
      return res.status(response.status >= 200 && response.status < 300 ? 500 : response.status).json({
        error: 'DHIS2 सर्भरले डाटाको सट्टा HTML पृष्ठ (Error Page) फर्काएको छ। कृपया DHIS2 Base URL, Username, वा Password मिलाउनुहोस्।',
        status: response.status,
        targetUrl
      });
    }

    if (response.status >= 200 && response.status < 300) {
      return res.status(response.status).json(response.data);
    } else {
      const errorData = response.data;
      const errorMsg =
        errorData?.message ||
        errorData?.description ||
        (typeof errorData === 'string' ? errorData : null) ||
        `DHIS2 push failed with status ${response.status}`;

      return res.status(response.status).json({
        error: errorMsg,
        details: errorData,
        status: response.status
      });
    }
  } catch (error: any) {
    const status = error.response?.status || 500;
    const errorData = error.response?.data;
    console.error(`DHIS2 Proxy Error [${status}]:`, errorData || error.message);

    const errorMsg =
      errorData?.message ||
      errorData?.description ||
      (typeof errorData === 'string' ? errorData : null) ||
      error.message ||
      'DHIS2 push failed';

    return res.status(status).json({
      error: errorMsg,
      details: errorData,
      status: status
    });
  }
}
