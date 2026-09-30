import {
  initFirebaseAdmin,
  applyCorsHeaders,
  authenticateServerlessRequest,
  fetchRTDB,
  updateRTDB
} from '../../lib/apiSecurity';
import { hashPassword } from '../../lib/crypto';

initFirebaseAdmin();

export default async function handler(req: any, res: any) {
  if (!applyCorsHeaders(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const authResult = await authenticateServerlessRequest(req, res);
  if (!authResult.authorized || !authResult.user) return;

  try {
    const user = authResult.user;
    const { targetUserId, currentPassword, newPassword } = req.body || {};
    const targetId = targetUserId || user.uid;

    if (!newPassword || String(newPassword).length < 4) {
      return res.status(400).json({ error: "नयाँ पासवर्ड कम्तिमा ४ अक्षरको हुनुपर्छ।" });
    }

    const targetData = await fetchRTDB(`users/${targetId}`);

    if (!targetData && targetId !== "superadmin") {
      return res.status(404).json({ error: "प्रयोगकर्ता फेला परेन।" });
    }

    // If user is changing their own password, verify currentPassword
    if (targetId === user.uid) {
      if (!currentPassword) {
        return res.status(400).json({ error: "हालको पासवर्ड आवश्यक छ।" });
      }
      const dbPassword = targetData ? String(targetData.password || "").trim() : "admin";
      const hashedCurrent = hashPassword(String(currentPassword).trim());
      const isSuperAdminDefault =
        targetId === "superadmin" && String(currentPassword).trim() === "admin";

      if (
        dbPassword !== hashedCurrent &&
        dbPassword !== String(currentPassword).trim() &&
        !isSuperAdminDefault
      ) {
        return res.status(400).json({ error: "हालको पासवर्ड मिलेन।" });
      }
    } else {
      // Changing someone else's password: Must be SUPER_ADMIN or ADMIN in the same org
      const isSuperAdmin = user.role === "SUPER_ADMIN" || user.admin;
      const isAdminSameOrg =
        user.role === "ADMIN" &&
        targetData &&
        targetData.organizationName === user.organizationName;

      if (!isSuperAdmin && !isAdminSameOrg) {
        return res.status(403).json({ error: "तपाईंलाई यो प्रयोगकर्ताको पासवर्ड फेर्ने अनुमति छैन।" });
      }
    }

    const hashedNew = hashPassword(String(newPassword).trim());
    await updateRTDB(`users/${targetId}`, {
      password: hashedNew,
      mustChangePassword: false,
      updatedFromApp: "SmartHealthOfficialApp",
      appSignature: "DIGITAL_HEALTH_SYS_AUTHORIZED_APP_2026",
      passwordLastChangedFrom: "SmartHealthOfficialApp",
      updatedAt: new Date().toISOString()
    });

    return res.status(200).json({ success: true, message: "पासवर्ड सफलतापूर्वक परिवर्तन भयो।" });
  } catch (err: any) {
    console.error("Change Password Error:", err.message);
    return res.status(500).json({ error: "पासवर्ड परिवर्तन गर्न सकिएन।" });
  }
}
