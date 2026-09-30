import {
  initFirebaseAdmin,
  applyCorsHeaders,
  fetchRTDB,
  updateRTDB
} from '../../../lib/apiSecurity';
import { hashPassword } from '../../../lib/crypto';

initFirebaseAdmin();

export default async function handler(req: any, res: any) {
  if (!applyCorsHeaders(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const { userId, code } = req.body || {};
    if (!userId || !code) {
      return res.status(400).json({ error: "User ID र Code आवश्यक छ।" });
    }

    const data = await fetchRTDB(`passwordResets/${userId}`);

    if (!data) {
      return res.status(400).json({ error: "रिसेट डाटा भेटिएन। कृपया फेरि कोड पठाउनुहोस्।" });
    }

    if (Date.now() > (data.expiresAt || 0)) {
      return res.status(400).json({ error: "कोडको म्याद सकियो। कृपया फेरि कोड पठाउनुहोस्।" });
    }

    if (data.blockedUntil && Date.now() < data.blockedUntil) {
      const remaining = Math.ceil((data.blockedUntil - Date.now()) / 60000);
      return res.status(429).json({
        error: `धेरै पटक गलत कोड प्रयोग गरियो। कृपया ${remaining} मिनेट पछि प्रयास गर्नुहोस्।`
      });
    }

    if ((data.attempts || 0) >= 5) {
      const blockedUntil = Date.now() + 5 * 60 * 1000;
      await updateRTDB(`passwordResets/${userId}`, { blockedUntil, attempts: 0 });
      return res.status(429).json({
        error: "धेरै पटक गलत कोड प्रयोग गरियो। ५ मिनेटको लागि ब्लक गरिएको छ।"
      });
    }

    const hashedInput = hashPassword(String(code).trim());
    if (hashedInput === data.codeHash) {
      return res.status(200).json({ success: true, message: "कोड पुष्टि भयो।" });
    } else {
      const newAttempts = (data.attempts || 0) + 1;
      await updateRTDB(`passwordResets/${userId}`, { attempts: newAttempts });
      return res.status(400).json({
        error: `गलत कोड। तपाईंले अझै ${5 - newAttempts} पटक प्रयास गर्न सक्नुहुन्छ।`
      });
    }
  } catch (err: any) {
    console.error("Verify Code Error:", err.message);
    return res.status(500).json({ error: "कोड पुष्टि गर्न सकिएन।" });
  }
}
