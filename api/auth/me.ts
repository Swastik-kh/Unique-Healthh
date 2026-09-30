import {
  initFirebaseAdmin,
  applyCorsHeaders,
  authenticateServerlessRequest,
  fetchRTDB
} from '../../lib/apiSecurity';
import { User } from '../../types/coreTypes';

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

const sanitizeUser = (user: any) => {
  if (!user) return null;
  const { password, resetTimestamps, codeHash, ...safe } = user;
  return safe;
};

export default async function handler(req: any, res: any) {
  if (!applyCorsHeaders(req, res)) return;

  const authResult = await authenticateServerlessRequest(req, res);
  if (!authResult.authorized || !authResult.user) return;

  try {
    const user = authResult.user;
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

    return res.status(200).json({
      success: true,
      user: sanitizeUser(userData)
    });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to fetch user profile" });
  }
}
