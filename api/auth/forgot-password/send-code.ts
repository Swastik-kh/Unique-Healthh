import axios from 'axios';
import {
  initFirebaseAdmin,
  applyCorsHeaders,
  fetchRTDB,
  setRTDB
} from '../../../lib/apiSecurity';
import { hashPassword } from '../../../lib/crypto';
import { isUserFrozenInHierarchy } from '../../../lib/userHierarchyUtils';
import { User } from '../../../types/coreTypes';

initFirebaseAdmin();

export default async function handler(req: any, res: any) {
  if (!applyCorsHeaders(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const { username, email } = req.body || {};
    const trimmedUser = String(username || "").trim();
    const trimmedEmail = String(email || "").trim().toLowerCase();

    if (!trimmedUser || !trimmedEmail) {
      return res.status(400).json({ error: "Username र Email दुवै आवश्यक छ।" });
    }

    const usersData = (await fetchRTDB("users")) || {};
    const allUsers: User[] = Object.keys(usersData).map((k) => ({
      ...usersData[k],
      id: k
    }));

    const foundUser = allUsers.find(
      (u) => String(u.username || "").trim().toLowerCase() === trimmedUser.toLowerCase()
    );

    if (!foundUser) {
      return res.status(404).json({ error: "यो Username भएको प्रयोगकर्ता भेटिएन।" });
    }

    if (foundUser.id === "superadmin") {
      return res.status(403).json({
        error: "सुरक्षा कारणले Super Admin को पासवर्ड यसरी रिसेट गर्न सकिँदैन।"
      });
    }

    if (!foundUser.email || foundUser.email.trim().toLowerCase() !== trimmedEmail) {
      return res.status(400).json({ error: "Username र Email मिलेन।" });
    }

    if (isUserFrozenInHierarchy(foundUser, allUsers)) {
      return res.status(403).json({
        error: "तपाईंको खाता वा संस्थाको मुख्य प्रशासक खाता फ्रिज गरिएको छ।"
      });
    }

    const userData = (await fetchRTDB(`users/${foundUser.id}`)) || foundUser;
    const timestamps: number[] = userData.resetTimestamps || [];
    const now = new Date();
    const currentMonthResets = timestamps.filter((ts) => {
      const d = new Date(ts);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    if (currentMonthResets.length >= 2) {
      return res.status(429).json({
        error: "तपाईंले यो महिनामा २ पटकभन्दा बढी पासवर्ड रिसेट गरिसक्नुभएको छ। कृपया एडमिनलाई सम्पर्क गर्नुहोस्।"
      });
    }

    const resetData = await fetchRTDB(`passwordResets/${foundUser.id}`);
    if (resetData) {
      if (Date.now() - (resetData.createdAt || 0) < 60000) {
        return res.status(429).json({
          error: "कृपया १ मिनेट पर्खनुहोस् र पुनः प्रयास गर्नुहोस्।"
        });
      }
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedCode = hashPassword(code);

    await setRTDB(`passwordResets/${foundUser.id}`, {
      codeHash: hashedCode,
      expiresAt: Date.now() + 10 * 60 * 1000,
      attempts: 0,
      createdAt: Date.now()
    });

    const orgSettings = (await fetchRTDB("organizationSettings/config")) || {};

    if (!orgSettings.emailApiKey || !orgSettings.emailSenderAddress) {
      return res.status(500).json({
        error: "प्रणालीमा Email सेटिङ मिलाइएको छैन। कृपया एडमिनलाई सम्पर्क गर्नुहोस्।"
      });
    }

    await axios.post(
      "https://api.resend.com/emails",
      {
        from: `${orgSettings.emailSenderName || "Notification"} <${orgSettings.emailSenderAddress}>`,
        to: [foundUser.email],
        subject: "पासवर्ड रिसेट कोड - Smart Inventory",
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 500px; margin: auto;">
            <h2 style="color: #4f46e5;">पासवर्ड रिसेट कोड</h2>
            <p>तपाईंको पासवर्ड रिसेट गर्नको लागि निम्न ६-अंकको कोड प्रयोग गर्नुहोस्:</p>
            <div style="background: #f3f4f6; padding: 15px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1f2937; border-radius: 8px; margin: 20px 0;">
              ${code}
            </div>
            <p style="color: #6b7280; font-size: 14px;">यो कोड १० मिनेटसम्म मात्र मान्य रहनेछ।</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #9ca3af;">यदि तपाईंले यो अनुरोध गर्नुभएको होइन भने, कृपया यो ईमेल बेवास्ता गर्नुहोस्।</p>
          </div>
        `
      },
      {
        headers: {
          Authorization: `Bearer ${orgSettings.emailApiKey.trim()}`,
          "Content-Type": "application/json"
        },
        timeout: 15000
      }
    );

    return res.status(200).json({
      success: true,
      userId: foundUser.id,
      message: "Email मा ६-अंकको कोड पठाइएको छ।"
    });
  } catch (err: any) {
    console.error("Forgot Password Error:", err.message);
    return res.status(500).json({ error: err.message || "सिस्टममा समस्या आयो, पुनः प्रयास गर्नुहोस्" });
  }
}
