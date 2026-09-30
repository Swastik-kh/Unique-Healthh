import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { getDatabase } from "firebase-admin/database";
import { getAuth } from "firebase-admin/auth";
import {
  initFirebaseAdmin,
  isAllowedOrigin,
  authenticateUser,
  requireRole,
  fetchRTDB,
  updateRTDB,
  setRTDB,
  deleteRTDB,
  createSignedSessionToken
} from "./lib/apiSecurity";
import { hashPassword } from "./lib/crypto";
import { isUserFrozenInHierarchy } from "./lib/userHierarchyUtils";
import { User } from "./types/coreTypes";

// Initialize Firebase Admin
initFirebaseAdmin();

const DEFAULT_ADMIN: User = {
  id: "superadmin",
  username: "admin",
  password: "admin",
  role: "SUPER_ADMIN",
  organizationName: "Smart Inventory HQ",
  fullName: "Administrator",
  designation: "System Manager",
  phoneNumber: "98XXXXXXXX"
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Security Headers via Helmet (relaxed CSP to ensure embedded/SPA operation in Vite/AI Studio)
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false
    })
  );

  // Strict CORS: Allow only production origin(s) from env var (or local dev in development)
  app.use(
    cors({
      origin: (origin, callback) => {
        if (isAllowedOrigin(origin)) {
          callback(null, true);
        } else {
          callback(new Error("CORS policy: Origin not allowed"));
        }
      },
      credentials: true,
      methods: ["GET", "OPTIONS", "PATCH", "DELETE", "POST", "PUT"],
      allowedHeaders: [
        "X-CSRF-Token",
        "X-Requested-With",
        "Accept",
        "Accept-Version",
        "Content-Length",
        "Content-MD5",
        "Content-Type",
        "Date",
        "X-Api-Version",
        "Authorization",
        "x-hib-username",
        "x-hib-password",
        "x-hib-remote-user",
        "x-hib-partner-id",
        "x-hib-location-id",
        "x-hib-base-url"
      ]
    })
  );

  // Rate Limiting: General limiter for all /api routes (300 requests per 15 mins)
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests from this IP, please try again after 15 minutes." }
  });

  // Stricter Rate Limiting on authentication & messaging endpoints
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 40,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many authentication attempts. Please try again after 15 minutes." }
  });

  const strictMessagingLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 25,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Rate limit exceeded for messaging services. Please try again later." }
  });

  app.use("/api", generalLimiter);

  // Reduced express.json limit to 1mb
  app.use(express.json({ limit: "1mb" }));

  // Helper to sanitize user object (strip password and internal secrets)
  const sanitizeUser = (user: any) => {
    if (!user) return null;
    const { password, resetTimestamps, codeHash, ...safe } = user;
    return safe;
  };

  // ==========================================
  // PUBLIC AUTHENTICATION ENDPOINTS
  // ==========================================

  // 1. Secure Server-Side Login
  app.post("/api/auth/login", authLimiter, async (req, res) => {
    try {
      const { username, password, fiscalYear } = req.body || {};
      const inputUsername = String(username || "").trim();
      const inputPassword = String(password || "").trim();

      if (!inputUsername || !inputPassword) {
        return res.status(400).json({ error: "प्रयोगकर्ताको नाम र पासवर्ड आवश्यक छ।" });
      }

      let usersData: any = {};
      try {
        usersData = (await fetchRTDB("users")) || {};
      } catch (e: any) {
        console.warn("RTDB users fetch fallback:", e.message);
      }

      const allUsers: User[] = Object.keys(usersData).map((k) => ({
        ...usersData[k],
        id: k
      }));

      // Ensure default superadmin fallback if database has no admin
      const hasAdmin = allUsers.some((u) => u.username === "admin");
      const userList = hasAdmin ? allUsers : [DEFAULT_ADMIN, ...allUsers];

      const hashedInput = hashPassword(inputPassword);

      const foundUser = userList.find((u) => {
        const dbUsername = String(u.username || "").trim();
        const dbPassword = String(u.password || "").trim();

        const isSuperAdminDefault =
          u.id === "superadmin" &&
          inputUsername.toLowerCase() === "admin" &&
          inputPassword === "admin";

        return (
          dbUsername.toLowerCase() === inputUsername.toLowerCase() &&
          (dbPassword === hashedInput || dbPassword === inputPassword || isSuperAdminDefault)
        );
      });

      if (!foundUser) {
        return res.status(401).json({ error: "प्रयोगकर्ता नाम वा पासवर्ड मिलेन।" });
      }

      // Check if user is frozen
      if (foundUser.isFrozen && foundUser.role !== "SUPER_ADMIN") {
        return res.status(403).json({
          error: "तपाईंको खाता फ्रिज गरिएको छ। कृपया सुपर एडमिनलाई सम्पर्क गर्नुहोस्।"
        });
      }

      // Check hierarchy freeze
      if (isUserFrozenInHierarchy(foundUser, userList)) {
        return res.status(403).json({
          error: "तपाईंको खाता वा संस्थाको प्रशासक खाता फ्रिज गरिएको छ। कृपया सुपर एडमिनलाई सम्पर्क गर्नुहोस्।"
        });
      }

      // Auto-migrate legacy plain text passwords in the cloud database to secure hashed values
      const dbPassword = String(foundUser.password || "").trim();
      if (dbPassword === inputPassword && foundUser.id !== "superadmin") {
        try {
          await updateRTDB(`users/${foundUser.id}`, {
            password: hashedInput,
            updatedAt: new Date().toISOString()
          });
        } catch (err: any) {
          console.error("Auto-migration of legacy password failed:", err.message);
        }
      }

      // Generate Cryptographic HMAC Session Token
      const token = createSignedSessionToken({
        uid: foundUser.id,
        role: foundUser.role,
        username: foundUser.username,
        organizationName: foundUser.organizationName || "",
        admin: foundUser.role === "SUPER_ADMIN"
      });

      // Optional: Generate Firebase Auth Custom Token if private key available
      let customToken = "";
      try {
        customToken = await getAuth().createCustomToken(foundUser.id, {
          role: foundUser.role,
          organizationName: foundUser.organizationName || "",
          username: foundUser.username,
          admin: foundUser.role === "SUPER_ADMIN"
        });
      } catch (authErr: any) {
        // Safe to ignore in development/preview when service account is not provided
      }

      const safeUser = sanitizeUser(foundUser);

      return res.status(200).json({
        success: true,
        token,
        customToken,
        user: safeUser,
        fiscalYear: fiscalYear || "2083/084"
      });
    } catch (err: any) {
      console.error("Login Handler Error:", err.message);
      return res.status(500).json({ error: "सिस्टममा समस्या आयो, पुनः प्रयास गर्नुहोस्" });
    }
  });

  // 2. Forgot Password - Verify Identity & Send Verification Code
  app.post("/api/auth/forgot-password/send-code", authLimiter, async (req, res) => {
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

      // Check monthly limit
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

      // Rate limit check (1 minute cooldown)
      const resetData = await fetchRTDB(`passwordResets/${foundUser.id}`);
      if (resetData) {
        if (Date.now() - (resetData.createdAt || 0) < 60000) {
          return res.status(429).json({
            error: "कृपया १ मिनेट पर्खनुहोस् र पुनः प्रयास गर्नुहोस्।"
          });
        }
      }

      // Generate 6-digit Code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedCode = hashPassword(code);

      await setRTDB(`passwordResets/${foundUser.id}`, {
        codeHash: hashedCode,
        expiresAt: Date.now() + 10 * 60 * 1000,
        attempts: 0,
        createdAt: Date.now()
      });

      // Fetch email config
      const orgSettings = (await fetchRTDB("organizationSettings/config")) || {};

      if (!orgSettings.emailApiKey || !orgSettings.emailSenderAddress) {
        return res.status(500).json({
          error: "प्रणालीमा Email सेटिङ मिलाइएको छैन। कृपया एडमिनलाई सम्पर्क गर्नुहोस्।"
        });
      }

      // Send Email via Resend
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

      return res.json({
        success: true,
        userId: foundUser.id,
        message: "Email मा ६-अंकको कोड पठाइएको छ।"
      });
    } catch (err: any) {
      console.error("Forgot Password Error:", err.message);
      return res.status(500).json({ error: err.message || "सिस्टममा समस्या आयो, पुनः प्रयास गर्नुहोस्" });
    }
  });

  // 3. Forgot Password - Verify Code
  app.post("/api/auth/forgot-password/verify-code", authLimiter, async (req, res) => {
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
        return res.json({ success: true, message: "कोड पुष्टि भयो।" });
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
  });

  // 4. Forgot Password - Set New Password
  app.post("/api/auth/forgot-password/reset", authLimiter, async (req, res) => {
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

      return res.json({ success: true, message: "पासवर्ड सफलतापूर्वक परिवर्तन भयो।" });
    } catch (err: any) {
      console.error("Set New Password Error:", err.message);
      return res.status(500).json({ error: "पासवर्ड परिवर्तन गर्न सकिएन।" });
    }
  });

  // ==========================================
  // PROTECTED API ROUTES (Require Valid Firebase ID Token or Session Token)
  // ==========================================
  app.use("/api", authenticateUser);

  // Get Current Authenticated User Profile (Sanitized)
  app.get("/api/auth/me", async (req, res) => {
    try {
      const user = (req as any).user;
      if (!user || !user.uid) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      let userData = await fetchRTDB(`users/${user.uid}`);

      if (!userData) {
        if (user.uid === "superadmin" || user.admin) {
          userData = DEFAULT_ADMIN;
        } else {
          return res.status(404).json({ error: "User profile not found" });
        }
      } else {
        userData = { ...userData, id: user.uid };
      }

      return res.json({
        success: true,
        user: sanitizeUser(userData)
      });
    } catch (err: any) {
      return res.status(500).json({ error: "Failed to fetch user profile" });
    }
  });

  // Change / Reset Password Endpoint
  app.post("/api/auth/change-password", async (req, res) => {
    try {
      const user = (req as any).user;
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

      return res.json({ success: true, message: "पासवर्ड सफलतापूर्वक परिवर्तन भयो।" });
    } catch (err: any) {
      console.error("Change Password Error:", err.message);
      return res.status(500).json({ error: "पासवर्ड परिवर्तन गर्न सकिएन।" });
    }
  });

  // Sanitized Users List (Strips all passwords & sensitive hashes for secure display)
  app.get("/api/users", requireRole(["SUPER_ADMIN", "ADMIN", "STAFF", "ACCOUNT", "HEALTH_SECTION", "APPROVAL", "STOREKEEPER"]), async (req, res) => {
    try {
      const currentUser = (req as any).user;
      const rawData = (await fetchRTDB("users")) || {};

      const list = Object.keys(rawData).map((key) => {
        const u = rawData[key];
        return sanitizeUser({ ...u, id: key });
      });

      const isSuperAdmin = currentUser.role === "SUPER_ADMIN" || currentUser.admin;
      const filtered = isSuperAdmin
        ? list
        : list.filter((u: any) => u.organizationName === currentUser.organizationName);

      return res.json({
        success: true,
        users: filtered
      });
    } catch (err: any) {
      return res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // HIB Helper to get auth header
  const getHIBAuth = (req: express.Request) => {
    const headerUser = req.headers["x-hib-username"] as string;
    const headerPass = req.headers["x-hib-password"] as string;
    const username = headerUser && headerUser.trim() !== "" ? headerUser : process.env.HIB_USERNAME || "testuser";
    const password = headerPass && headerPass.trim() !== "" ? headerPass : process.env.HIB_PASSWORD || "f/\\N6k@67";
    return Buffer.from(`${username}:${password}`).toString("base64");
  };

  const getHIBHeaders = (req: express.Request) => {
    const remoteUserHeader = req.headers["x-hib-remote-user"] as string;
    const remoteUser =
      remoteUserHeader && remoteUserHeader.trim() !== "" && remoteUserHeader !== "undefined"
        ? remoteUserHeader
        : process.env.HIB_REMOTE_USER || "hib_testuser_testfhir";

    const headers: any = {
      Authorization: `Basic ${getHIBAuth(req)}`,
      "remote-user": remoteUser,
      "Content-Type": "application/json"
    };

    const partnerId = req.headers["x-hib-partner-id"] as string;
    const locationId = req.headers["x-hib-location-id"] as string;

    if (partnerId && partnerId.trim() !== "" && partnerId !== "undefined") {
      headers["partner-id"] = partnerId;
    }
    if (locationId && locationId.trim() !== "" && locationId !== "undefined") {
      headers["location-id"] = locationId;
    }

    return headers;
  };

  // Role constants for route access
  const HIB_ROLES = ["SUPER_ADMIN", "ADMIN", "STAFF", "ACCOUNT", "HEALTH_SECTION"];
  const DHIS2_ROLES = ["SUPER_ADMIN", "ADMIN", "STAFF", "APPROVAL", "HEALTH_SECTION"];
  const SMS_ROLES = ["SUPER_ADMIN", "ADMIN", "STAFF", "ACCOUNT", "HEALTH_SECTION", "APPROVAL", "STOREKEEPER"];
  const EMAIL_ROLES = ["SUPER_ADMIN", "ADMIN", "STAFF", "ACCOUNT", "HEALTH_SECTION", "APPROVAL", "STOREKEEPER", "ANONYMOUS"];

  // ==========================================
  // HIB API Routes (Protected by HIB_ROLES)
  // ==========================================
  app.get("/api/hib/patient/:id", requireRole(HIB_ROLES), async (req, res) => {
    try {
      const { id } = req.params;
      let baseUrl = req.headers["x-hib-base-url"] as string;
      if (!baseUrl || baseUrl === "undefined" || baseUrl.trim() === "") {
        baseUrl = process.env.HIB_BASE_URL || "https://imislegacy.hib.gov.np/";
      }

      if (!baseUrl.startsWith("http")) {
        baseUrl = `https://${baseUrl}`;
      }

      if (baseUrl.endsWith("/")) {
        baseUrl = baseUrl.slice(0, -1);
      }

      const targetUrl = `${baseUrl}/api/api_fhir/Patient/?identifier=${id}`;
      console.log(`HIB Search URL: ${targetUrl}`);

      const response = await axios.get(targetUrl, {
        headers: getHIBHeaders(req),
        validateStatus: () => true
      });

      if (typeof response.data === "string" && response.data.includes("<!DOCTYPE html")) {
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

  app.get("/api/hib/coverage/:id", requireRole(HIB_ROLES), async (req, res) => {
    try {
      const { id } = req.params;
      let baseUrl = req.headers["x-hib-base-url"] as string;
      if (!baseUrl || baseUrl === "undefined" || baseUrl.trim() === "") {
        baseUrl = process.env.HIB_BASE_URL || "https://imislegacy.hib.gov.np/";
      }

      if (!baseUrl.startsWith("http")) {
        baseUrl = `https://${baseUrl}`;
      }

      if (baseUrl.endsWith("/")) {
        baseUrl = baseUrl.slice(0, -1);
      }

      const targetUrl = `${baseUrl}/api/api_fhir/Coverage/?identifier=${id}`;

      const response = await axios.get(targetUrl, {
        headers: getHIBHeaders(req),
        validateStatus: () => true
      });

      if (typeof response.data === "string" && response.data.includes("<!DOCTYPE html")) {
        console.error("HIB Coverage returned HTML instead of FHIR bundle for ID:", id);
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

  app.post("/api/hib/eligibility", requireRole(HIB_ROLES), async (req, res) => {
    try {
      const baseUrl = (req.headers["x-hib-base-url"] as string) || process.env.HIB_BASE_URL || "https://imislegacy.hib.gov.np/";
      const response = await axios.post(`${baseUrl}api/api_fhir/EligibilityRequest/`, req.body, {
        headers: getHIBHeaders(req)
      });
      res.json(response.data);
    } catch (error: any) {
      console.error("HIB Eligibility Error:", error.response?.data || error.message);
      res.status(error.response?.status || 500).json(error.response?.data || { error: "Failed to check eligibility" });
    }
  });

  app.post("/api/hib/claim", requireRole(HIB_ROLES), async (req, res) => {
    try {
      const baseUrl = (req.headers["x-hib-base-url"] as string) || process.env.HIB_BASE_URL || "https://imislegacy.hib.gov.np/";
      const response = await axios.post(`${baseUrl}api/api_fhir/Claim/`, req.body, {
        headers: getHIBHeaders(req)
      });
      res.json(response.data);
    } catch (error: any) {
      console.error("HIB Claim Error:", error.response?.data || error.message);
      res.status(error.response?.status || 500).json(error.response?.data || { error: "Failed to submit claim" });
    }
  });

  app.get("/api/hib/claim/search", requireRole(HIB_ROLES), async (req, res) => {
    try {
      const { chfid, date_claimed } = req.query;
      if (!chfid || !date_claimed) {
        return res.status(400).json({ error: "chfid and date_claimed are required query parameters" });
      }

      let baseUrl = req.headers["x-hib-base-url"] as string;
      if (!baseUrl || baseUrl === "undefined" || baseUrl.trim() === "") {
        baseUrl = process.env.HIB_BASE_URL || "https://imislegacy.hib.gov.np/";
      }

      if (!baseUrl.startsWith("http")) {
        baseUrl = `https://${baseUrl}`;
      }

      if (baseUrl.endsWith("/")) {
        baseUrl = baseUrl.slice(0, -1);
      }

      const targetUrl = `${baseUrl}/api/api_fhir/claim/code/search/?chfid=${chfid}&date_claimed=${date_claimed}`;
      console.log(`HIB Claim Search URL: ${targetUrl}`);

      const response = await axios.get(targetUrl, {
        headers: getHIBHeaders(req),
        validateStatus: () => true
      });

      if (typeof response.data === "string" && response.data.includes("<!DOCTYPE html")) {
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

  // ==========================================
  // DHIS2 Proxy Endpoint (Protected by DHIS2_ROLES)
  // ==========================================
  app.post("/api/dhis2/push", requireRole(DHIS2_ROLES), async (req, res) => {
    try {
      const { payload, baseUrl, username, password } = req.body || {};

      if (!baseUrl || !username || !password || !payload) {
        return res.status(400).json({ error: "Missing required DHIS2 configuration (Base URL, Username, Password) or payload" });
      }

      const auth = Buffer.from(`${username}:${password}`).toString("base64");

      let cleanBase = String(baseUrl).trim();
      if (!cleanBase.startsWith("http://") && !cleanBase.startsWith("https://")) {
        cleanBase = `https://${cleanBase}`;
      }
      cleanBase = cleanBase.replace(/\/+$/, "");

      if (cleanBase.toLowerCase().endsWith("/api")) {
        cleanBase = cleanBase.slice(0, -4);
      }

      const targetUrl = `${cleanBase}/api/dataValueSets`;
      console.log(`Pushing to DHIS2: ${targetUrl}`);

      const response = await axios.post(targetUrl, payload, {
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        timeout: 45000
      });

      res.status(response.status).json(response.data);
    } catch (error: any) {
      const status = error.response?.status || 500;
      const errorData = error.response?.data;
      console.error(`DHIS2 Proxy Error [${status}]:`, errorData || error.message);

      const errorMsg =
        errorData?.message || errorData?.description || (typeof errorData === "string" ? errorData : null) || error.message || "DHIS2 push failed";

      res.status(status).json({
        error: errorMsg,
        details: errorData,
        status: status
      });
    }
  });

  // ==========================================
  // SMS Proxy Endpoints (Protected by SMS_ROLES + Stricter Rate Limit)
  // ==========================================
  app.all("/api/sms/balance", requireRole(["SUPER_ADMIN", "ADMIN", "ACCOUNT", "STAFF", "HEALTH_SECTION"]), async (req, res) => {
    try {
      const rawKey = req.body?.apiKey || req.query?.apiKey || req.query?.key || process.env.SMS_PASAL_KEY || "56A71A88EC9CA9";
      const key = String(rawKey).trim();

      if (!key) {
        return res.status(400).json({ error: "API Key (Token) आवश्यक छ।" });
      }

      const targetUrl = `https://sms.smspasal.com/miscapi/${encodeURIComponent(key)}/getBalance/true/`;

      const apiRes = await axios.get(targetUrl, {
        timeout: 12000,
        validateStatus: () => true
      });

      const resData = apiRes.data;

      if (typeof resData === "string" && resData.includes("ERR:")) {
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
      } else if (typeof resData === "object" && resData !== null) {
        totalBalance = Number(resData.balance ?? resData.BALANCE ?? 0);
        routes = [{ balance: totalBalance }];
      } else if (!isNaN(Number(resData))) {
        totalBalance = Number(resData);
        routes = [{ balance: totalBalance }];
      }

      return res.status(200).json({
        success: true,
        provider: "SMSBit / SMS Pasal",
        totalBalance: totalBalance,
        routes: routes,
        raw: resData
      });
    } catch (error: any) {
      console.error("SMS Balance Check Error:", error.message);
      return res.status(500).json({
        success: false,
        error: `SMS ब्यालेन्स चेक गर्न सकिएन: ${error.message}`
      });
    }
  });

  app.post("/api/sms/send", strictMessagingLimiter, requireRole(SMS_ROLES), async (req, res) => {
    try {
      const { provider, apiKey, senderId, apiUrl, recipients, message, items } = req.body;

      // Handle items array if individual bulk messages are provided
      if (Array.isArray(items) && items.length > 0) {
        const pName = (provider || "").toLowerCase();
        const urlStr = (apiUrl || "").toLowerCase();
        const isSparrowExplicit =
          urlStr.includes("sparrowsms") || (pName.includes("sparrow") && !urlStr.includes("smspasal") && apiKey !== "56A71A88EC9CA9");
        const isSmsPasal = !isSparrowExplicit;

        const key = apiKey || process.env.SMS_PASAL_KEY || "56A71A88EC9CA9";
        const targetUrl = apiUrl && apiUrl.includes("http") ? apiUrl : "https://sms.smspasal.com/smsapi/index.php";
        const from = senderId || process.env.SMS_PASAL_SENDER || "SMSBit";
        const campaign = req.body.campaign || process.env.SMS_PASAL_CAMPAIGN || "9674";
        const routeid = req.body.routeid || process.env.SMS_PASAL_ROUTEID || "10259";

        let successCount = 0;
        let lastError = "";

        await Promise.all(
          items.map(async (item: any) => {
            const rawTo = item.recipient || item.to;
            const itemMsg = item.message;
            if (!rawTo || !itemMsg) return;

            const cleanedTo = String(rawTo).replace(/\D/g, "").replace(/^977/, "");
            if (!/^\d{10}$/.test(cleanedTo)) return;

            if (isSmsPasal) {
              const params = {
                key: key.trim(),
                campaign: campaign.trim(),
                routeid: routeid.trim(),
                type: "text",
                responsetype: "json",
                contacts: cleanedTo,
                senderid: from.trim(),
                msg: itemMsg
              };

              try {
                const apiRes = await axios.get(targetUrl, { params, timeout: 15000, validateStatus: () => true });
                const resStr = typeof apiRes.data === "string" ? apiRes.data : JSON.stringify(apiRes.data || "");
                if (apiRes.status >= 200 && apiRes.status < 300 && !resStr.includes("ERR:")) {
                  successCount++;
                } else {
                  lastError = resStr;
                }
              } catch (err: any) {
                lastError = err.message;
              }
            }
          })
        );

        if (successCount > 0) {
          return res.json({
            success: true,
            provider: "SMSBit / SMS Pasal",
            count: successCount,
            message: `SMSBit (SMS Pasal) गेटवे मार्फत ${successCount} वटा व्यक्तिगत (Customized) SMS सन्देशहरू सफलतापुर्वक पठाइयो!`
          });
        } else {
          const maskedKey = key ? key.slice(0, 4) + "****" + key.slice(-4) : "****";
          const safeDataStr = (lastError || "Unknown Error").split(key).join("****").replace(/(key=)[^&]+/gi, "$1****");
          return res.status(400).json({
            error: `SMS पठाउन असफल भयो (${safeDataStr})`,
            rawError: safeDataStr
          });
        }
      }

      if (!recipients || (Array.isArray(recipients) && recipients.length === 0) || !message) {
        return res.status(400).json({ error: "Recipients and message body are required" });
      }

      const rawList = Array.isArray(recipients) ? recipients : String(recipients).split(",");
      const cleanedList = rawList
        .map((r) => String(r).replace(/\D/g, "").replace(/^977/, ""))
        .filter((p) => /^\d{10}$/.test(p));

      if (cleanedList.length === 0) {
        return res.status(400).json({ error: "नेपाली १० अंकको मोबाइल नम्बर भेटिएन (उदा: 9841XXXXXX)" });
      }

      const toStr = cleanedList.join(",");
      const pName = (provider || "").toLowerCase();
      const urlStr = (apiUrl || "").toLowerCase();

      const isSparrowExplicit =
        urlStr.includes("sparrowsms") || (pName.includes("sparrow") && !urlStr.includes("smspasal") && apiKey !== "56A71A88EC9CA9");
      const isSmsPasal = !isSparrowExplicit;

      if (isSmsPasal) {
        const key = apiKey || process.env.SMS_PASAL_KEY || "56A71A88EC9CA9";
        const targetUrl = apiUrl && apiUrl.includes("http") ? apiUrl : "https://sms.smspasal.com/smsapi/index.php";
        const from = senderId || process.env.SMS_PASAL_SENDER || "SMSBit";
        const campaign = req.body.campaign || process.env.SMS_PASAL_CAMPAIGN || "9674";
        const routeid = req.body.routeid || process.env.SMS_PASAL_ROUTEID || "10259";

        console.log(`Sending SMS via SMSBit / SMS Pasal (${targetUrl}) to: ${toStr}`);

        const params = {
          key: key.trim(),
          campaign: campaign.trim(),
          routeid: routeid.trim(),
          type: "text",
          responsetype: "json",
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
          const formData = new URLSearchParams();
          formData.append("key", key.trim());
          formData.append("campaign", campaign.trim());
          formData.append("routeid", routeid.trim());
          formData.append("type", "text");
          formData.append("responsetype", "json");
          formData.append("contacts", toStr);
          formData.append("senderid", from.trim());
          formData.append("msg", message);

          apiRes = await axios.post(targetUrl, formData.toString(), {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            timeout: 15000,
            validateStatus: () => true
          });
        }

        console.log("SMS Pasal Response:", apiRes.status, apiRes.data);

        const responseDataStr = typeof apiRes.data === "string" ? apiRes.data : JSON.stringify(apiRes.data || "");

        if (apiRes.status >= 200 && apiRes.status < 300 && !responseDataStr.includes("ERR:")) {
          let shootId = "";
          if (responseDataStr.includes("SMS-SHOOT-ID/")) {
            shootId = responseDataStr.split("SMS-SHOOT-ID/")[1]?.trim() || "";
          }

          return res.json({
            success: true,
            provider: "SMSBit / SMS Pasal",
            shootId: shootId,
            apiResponse: apiRes.data,
            message: "SMSBit (SMS Pasal) गेटवे मार्फत वास्तविक SMS सन्देश मोवाइलमा सफलतापुर्वक पठाइयो!"
          });
        } else {
          const maskedKey = key ? key.slice(0, 4) + "****" + key.slice(-4) : "****";
          const safeDataStr = responseDataStr.split(key).join("****").replace(/(key=)[^&]+/gi, "$1****");

          let userFriendlyError = safeDataStr;
          if (responseDataStr.includes("INVALID API KEY") || responseDataStr.includes("INVALID KEY")) {
            userFriendlyError = `SMSBit API Key (${maskedKey}) अमान्य वा निष्कृय छ। कृपया Super Admin को General Settings मा गएर SMSBit प्यानलको आफ्नो सही API Key राख्नुहोस्। (${safeDataStr})`;
          } else if (responseDataStr.includes("SENDERID") || responseDataStr.includes("INVALID SENDER")) {
            userFriendlyError = `SMSBit मा '${from}' Sender ID स्वीकृत छैन। कृपया आफ्नो प्यानलमा स्वीकृत भएको Sender ID राख्नुहोस्। (${safeDataStr})`;
          } else if (responseDataStr.includes("CREDIT") || responseDataStr.includes("BALANCE")) {
            userFriendlyError = `SMSBit मा सन्देश पठाउन बाँकी SMS Balance/Credit पुगेन। (${safeDataStr})`;
          } else if (responseDataStr.includes("CONTACT")) {
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
      const from = senderId || process.env.SPARROW_SMS_SENDER_ID || process.env.SMS_SENDER_ID || "Info";
      let targetUrl = apiUrl || process.env.SPARROW_SMS_URL || "https://api.sparrowsms.com/v2/sms/";

      console.log(`Sending SMS via ${provider || "Gateway"} to: ${toStr}`);

      if (token && token.trim() !== "") {
        const apiRes = await axios.post(
          targetUrl,
          {
            token: token.trim(),
            from: from.trim(),
            to: toStr,
            text: message
          },
          {
            headers: { "Content-Type": "application/json" },
            timeout: 15000,
            validateStatus: () => true
          }
        );

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
          if (typeof rawErr === "string") {
            errMsg = rawErr;
          } else if (rawErr && typeof rawErr === "object") {
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
      if (typeof rawData === "string") {
        errStr = rawData;
      } else if (rawData && typeof rawData === "object") {
        errStr = rawData.response || rawData.error || JSON.stringify(rawData);
      } else if (error.message) {
        errStr = error.message;
      }

      res.status(error.response?.status || 500).json({
        error: String(errStr)
      });
    }
  });

  // ==========================================
  // Email Proxy Endpoint (Protected by EMAIL_ROLES + Stricter Rate Limit)
  // ==========================================
  app.post("/api/email/send", strictMessagingLimiter, requireRole(EMAIL_ROLES), async (req, res) => {
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
        return res.status(400).json({
          error: "Missing required fields: apiKey, senderAddress, to, subject, and htmlBody are required."
        });
      }

      const resendUrl = "https://api.resend.com/emails";
      console.log(`Sending Email via Resend to: ${to}`);

      try {
        const response = await axios.post(
          resendUrl,
          {
            from: `${senderName || "Notification"} <${senderAddress}>`,
            to: Array.isArray(to) ? to : [to],
            subject: subject,
            html: htmlBody,
            attachments: attachments || []
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey.trim()}`,
              "Content-Type": "application/json"
            },
            timeout: 30000,
            validateStatus: () => true
          }
        );

        if (response.status >= 200 && response.status < 300) {
          return res.status(200).json({
            success: true,
            id: response.data.id,
            message: "Email successfully sent via Resend!"
          });
        } else {
          const maskedKey = apiKey ? apiKey.slice(0, 4) + "****" + apiKey.slice(-4) : "****";
          const responseDataStr = typeof response.data === "string" ? response.data : JSON.stringify(response.data || "");
          const safeErrorStr = responseDataStr.split(apiKey).join("****");

          console.error(`Resend API Error [${response.status}]:`, safeErrorStr);

          return res.status(response.status).json({
            error: `Resend API Error: ${safeErrorStr}`,
            status: response.status
          });
        }
      } catch (apiErr: any) {
        const maskedKey = apiKey ? apiKey.slice(0, 4) + "****" + apiKey.slice(-4) : "****";
        const safeErrMessage = (apiErr.message || "Unknown network error").split(apiKey).join("****");
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
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.use((req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
