import axios from 'axios';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    let ip = '';
    try {
      const response = await axios.get('https://api.ipify.org?format=json', { timeout: 5000 });
      ip = response.data.ip;
    } catch (e) {
      const response = await axios.get('https://icanhazip.com', { timeout: 5000 });
      ip = response.data.trim();
    }

    return res.status(200).json({ outboundIp: ip, note: 'Provide this IP to HIB for whitelisting.' });
  } catch (error: any) {
    return res.status(500).json({ error: 'Failed to fetch outbound IP', details: error.message });
  }
}
