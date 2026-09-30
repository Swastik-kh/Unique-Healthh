import {
  initFirebaseAdmin,
  applyCorsHeaders,
  fetchRTDB,
  updateRTDB,
  deleteRTDB
} from '../../../lib/apiSecurity';
import { hashPassword } from '../../../lib/crypto';

initFirebaseAdmin();

export default async function handler(req: any, res: any) {
  if (!applyCorsHeaders(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const { userId, code, newPassword } = req.body || {};
    if (!userId || !code || !newPassword) {
      return res.status(400).json({ error: "सबै विवरणहरू आवश्यक छन्।" });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({ error: "पासवर्ड कम्तिमा ६ अक्षरको हुनुपर्छ।" });
    }

    const data = await fetchRTDB(`passwordResets/${userId}`);

    if (!data) {
      return res.status(400).json({ error: "अमान्य वा म्याद सकिएको रिसेट अनुरोध।" });
    }

    const hashedCode = hashPassword(String(code).trim());

    if (hashedCode !== data.codeHash) {
      return res.status(400).json({ error: "गलत प्रमाणीकरण कोड।" });
    }

    const userData = (await fetchRTDB(`users/${userId}`)) || {};
    const timestamps: number[] = userData.resetTimestamps || [];
    const updatedTimestamps = [...timestamps, Date.now()];

    const hashedNewPassword = hashPassword(String(newPassword).trim());
    await updateRTDB(`users/${userId}`, {
      password: hashedNewPassword,
      resetTimestamps: updatedTimestamps,
      updatedAt: new Date().toISOString()
    });

    await deleteRTDB(`passwordResets/${userId}`);

    return res.status(200).json({ success: true, message: "पासवर्ड सफलतापूर्वक परिवर्तन भयो।" });
  } catch (err: any) {
    console.error("Set New Password Error:", err.message);
    return res.status(500).json({ error: "पासवर्ड परिवर्तन गर्न सकिएन।" });
  }
}
