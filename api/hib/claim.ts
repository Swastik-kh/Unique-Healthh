import axios from 'axios';

function getHIBHeaders(req: any) {
  const headerUser = req.headers['x-hib-username'] as string;
  const headerPass = req.headers['x-hib-password'] as string;
  const username = (headerUser && headerUser.trim() !== '') ? headerUser : (process.env.HIB_USERNAME || 'testuser');
  const password = (headerPass && headerPass.trim() !== '') ? headerPass : (process.env.HIB_PASSWORD || 'f/\\N6k@67');
  const auth = Buffer.from(`${username}:${password}`).toString('base64');

  const remoteUserHeader = req.headers['x-hib-remote-user'] as string;
  const remoteUser = (remoteUserHeader && remoteUserHeader.trim() !== '' && remoteUserHeader !== 'undefined')
    ? remoteUserHeader
    : (process.env.HIB_REMOTE_USER || 'hib_testuser_testfhir');

  const headers: any = {
    'Authorization': `Basic ${auth}`,
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
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-hib-username, x-hib-password, x-hib-remote-user, x-hib-partner-id, x-hib-location-id, x-hib-base-url'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    let baseUrl = (req.headers['x-hib-base-url'] as string) || process.env.HIB_BASE_URL || 'https://imislegacy.hib.gov.np/';
    if (!baseUrl.endsWith('/')) baseUrl += '/';

    const targetUrl = `${baseUrl}api/api_fhir/Claim/`;

    const response = await axios.post(targetUrl, req.body, {
      headers: getHIBHeaders(req),
      validateStatus: () => true
    });

    return res.status(response.status).json(response.data);
  } catch (error: any) {
    return res.status(error.response?.status || 500).json(error.response?.data || { error: "Failed to submit claim" });
  }
}
