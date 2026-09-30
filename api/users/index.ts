import {
  initFirebaseAdmin,
  applyCorsHeaders,
  authenticateServerlessRequest,
  fetchRTDB
} from '../../lib/apiSecurity';

initFirebaseAdmin();

const sanitizeUser = (user: any) => {
  if (!user) return null;
  const { password, resetTimestamps, codeHash, ...safe } = user;
  return safe;
};

export default async function handler(req: any, res: any) {
  if (!applyCorsHeaders(req, res)) return;

  const authResult = await authenticateServerlessRequest(req, res, [
    "SUPER_ADMIN",
    "ADMIN",
    "STAFF",
    "ACCOUNT",
    "HEALTH_SECTION",
    "APPROVAL",
    "STOREKEEPER"
  ]);
  if (!authResult.authorized || !authResult.user) return;

  try {
    const currentUser = authResult.user;
    const rawData = (await fetchRTDB("users")) || {};

    const list = Object.keys(rawData).map((key) => {
      const u = rawData[key];
      return sanitizeUser({ ...u, id: key });
    });

    const isSuperAdmin = currentUser.role === "SUPER_ADMIN" || currentUser.admin;
    const filtered = isSuperAdmin
      ? list
      : list.filter((u: any) => u.organizationName === currentUser.organizationName);

    return res.status(200).json({
      success: true,
      users: filtered
    });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to fetch users" });
  }
}
