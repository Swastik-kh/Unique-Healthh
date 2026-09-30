import { getApps, initializeApp } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import { getAuth, DecodedIdToken } from "firebase-admin/auth";
import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import axios from "axios";

export interface AuthenticatedUser {
  uid: string;
  role: string;
  username?: string;
  organizationName?: string;
  admin?: boolean;
  email?: string;
  [key: string]: any;
}

const SESSION_SECRET = process.env.SESSION_SECRET || "smart-health-secure-secret-key-2026-auth";
const FIREBASE_RTDB_URL =
  process.env.FIREBASE_DATABASE_URL ||
  "https://smart-health-dce40-default-rtdb.asia-southeast1.firebasedatabase.app";

// Direct REST Helpers for Firebase Realtime Database (ultra-fast and non-hanging)
export async function fetchRTDB(path: string): Promise<any> {
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  const url = `${FIREBASE_RTDB_URL.replace(/\/+$/, "")}/${cleanPath}.json`;
  const res = await axios.get(url, { timeout: 8000 });
  return res.data;
}

export async function updateRTDB(path: string, data: any): Promise<any> {
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  const url = `${FIREBASE_RTDB_URL.replace(/\/+$/, "")}/${cleanPath}.json`;
  const res = await axios.patch(url, data, { timeout: 8000 });
  return res.data;
}

export async function setRTDB(path: string, data: any): Promise<any> {
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  const url = `${FIREBASE_RTDB_URL.replace(/\/+$/, "")}/${cleanPath}.json`;
  const res = await axios.put(url, data, { timeout: 8000 });
  return res.data;
}

export async function deleteRTDB(path: string): Promise<any> {
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  const url = `${FIREBASE_RTDB_URL.replace(/\/+$/, "")}/${cleanPath}.json`;
  const res = await axios.delete(url, { timeout: 8000 });
  return res.data;
}

// -------------------------------------------------------------
// Cryptographic HMAC Session Token Management
// -------------------------------------------------------------
export function createSignedSessionToken(payload: {
  uid: string;
  role: string;
  username: string;
  organizationName?: string;
  admin?: boolean;
}): string {
  const data = {
    ...payload,
    iat: Date.now(),
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days validity
  };
  const jsonStr = JSON.stringify(data);
  const base64Data = Buffer.from(jsonStr).toString("base64url");
  const signature = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(base64Data)
    .digest("base64url");
  return `sh_${base64Data}.${signature}`;
}

export function verifySignedSessionToken(token: string): AuthenticatedUser | null {
  try {
    if (!token.startsWith("sh_")) return null;
    const parts = token.slice(3).split(".");
    if (parts.length !== 2) return null;
    const [base64Data, signature] = parts;

    const expectedSignature = crypto
      .createHmac("sha256", SESSION_SECRET)
      .update(base64Data)
      .digest("base64url");

    if (
      !crypto.timingSafeEqual(
        Buffer.from(signature, "utf8"),
        Buffer.from(expectedSignature, "utf8")
      )
    ) {
      return null;
    }

    const data = JSON.parse(Buffer.from(base64Data, "base64url").toString("utf8"));
    if (data.exp && Date.now() > data.exp) {
      return null;
    }

    return {
      uid: data.uid,
      role: (data.role || "STAFF").toUpperCase().trim(),
      username: data.username,
      organizationName: data.organizationName,
      admin: data.admin || data.role === "SUPER_ADMIN"
    };
  } catch (e) {
    return null;
  }
}

// Ensure Firebase Admin is initialized once
export function initFirebaseAdmin() {
  if (getApps().length === 0) {
    try {
      initializeApp({
        databaseURL: FIREBASE_RTDB_URL
      });
    } catch (e: any) {
      console.warn("Firebase Admin Initialization Warning:", e.message);
    }
  }
}

// -------------------------------------------------------------
// CORS Helpers (Strict Origin Restriction)
// -------------------------------------------------------------
export function getAllowedOrigins(): string[] {
  const envOrigins =
    process.env.ALLOWED_ORIGINS ||
    process.env.CORS_ORIGIN ||
    process.env.PRODUCTION_ORIGINS ||
    process.env.APP_URL ||
    process.env.VITE_APP_URL ||
    '';
  const list = envOrigins.split(',').map(s => s.trim()).filter(Boolean);
  return list;
}

export function isAllowedOrigin(origin?: string): boolean {
  if (!origin) return true; // Same-origin, non-browser or curl/server requests
  const allowed = getAllowedOrigins();
  if (allowed.includes(origin)) return true;

  // In non-production or preview environment, permit local dev and Capacitor origins
  if (process.env.NODE_ENV !== 'production') {
    if (
      origin.startsWith('http://localhost') ||
      origin.startsWith('http://127.0.0.1') ||
      origin.startsWith('capacitor://') ||
      origin.startsWith('ionic://') ||
      origin.includes('.run.app')
    ) {
      return true;
    }
  }
  return false;
}

export function applyCorsHeaders(req: any, res: any): boolean {
  const origin = (req.headers && (req.headers.origin || req.headers.Origin)) as string | undefined;

  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-hib-username, x-hib-password, x-hib-remote-user, x-hib-partner-id, x-hib-location-id, x-hib-base-url'
  );

  if (origin) {
    if (isAllowedOrigin(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    } else {
      res.status(403).json({ error: 'CORS policy: Origin not allowed' });
      return false;
    }
  } else {
    const allowed = getAllowedOrigins();
    if (allowed.length > 0) {
      res.setHeader('Access-Control-Allow-Origin', allowed[0]);
    }
  }

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return false;
  }

  return true;
}

export function getNetlifyCorsHeaders(origin?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
    'Access-Control-Allow-Headers':
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, x-hib-username, x-hib-password, x-hib-remote-user, x-hib-partner-id, x-hib-location-id, x-hib-base-url'
  };

  if (origin && isAllowedOrigin(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Vary'] = 'Origin';
  } else {
    const allowed = getAllowedOrigins();
    if (allowed.length > 0) {
      headers['Access-Control-Allow-Origin'] = allowed[0];
    }
  }

  return headers;
}

// -------------------------------------------------------------
// Authentication & Role Verification
// -------------------------------------------------------------
export async function verifyTokenAndGetUser(authHeader?: string): Promise<AuthenticatedUser> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    const err: any = new Error("Unauthorized: Missing or invalid Authorization header");
    err.status = 401;
    throw err;
  }

  const token = authHeader.split("Bearer ")[1]?.trim();
  if (!token) {
    const err: any = new Error("Unauthorized: Empty Bearer token");
    err.status = 401;
    throw err;
  }

  // 1. Fast verification for cryptographic HMAC session tokens
  const sessionUser = verifySignedSessionToken(token);
  if (sessionUser) {
    return sessionUser;
  }

  // 2. Fallback to Firebase ID Token
  initFirebaseAdmin();
  let decodedToken: DecodedIdToken;
  try {
    decodedToken = await getAuth().verifyIdToken(token);
  } catch (err: any) {
    const customErr: any = new Error(`Unauthorized: Invalid or expired authentication token (${err.message})`);
    customErr.status = 401;
    throw customErr;
  }

  // Resolve user role
  let role = (decodedToken.role || (decodedToken.admin ? 'SUPER_ADMIN' : '')) as string;
  if (!role && decodedToken.uid) {
    try {
      const userData = await fetchRTDB(`users/${decodedToken.uid}`);
      if (userData && userData.role) {
        role = userData.role;
      }
    } catch (e) {
      // Ignore lookup error
    }
  }

  const resolvedRole = (role || (decodedToken.isAnonymous ? 'ANONYMOUS' : 'STAFF')).toUpperCase().trim();

  return {
    ...decodedToken,
    role: resolvedRole
  };
}

export function isRoleAuthorized(userRole: string, allowedRoles?: string | string[]): boolean {
  if (!allowedRoles || (Array.isArray(allowedRoles) && allowedRoles.length === 0)) return true;
  const upperRole = (userRole || '').toUpperCase().trim();
  if (upperRole === 'SUPER_ADMIN') return true;

  const allowedList = Array.isArray(allowedRoles)
    ? allowedRoles.map(r => r.toUpperCase().trim())
    : [allowedRoles.toUpperCase().trim()];

  return allowedList.includes(upperRole);
}

// -------------------------------------------------------------
// Serverless Function Auth & Role Guard (Vercel api/*)
// -------------------------------------------------------------
export async function authenticateServerlessRequest(
  req: any,
  res: any,
  allowedRoles?: string | string[]
): Promise<{ authorized: boolean; user?: AuthenticatedUser }> {
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  try {
    const user = await verifyTokenAndGetUser(authHeader);

    if (allowedRoles && !isRoleAuthorized(user.role, allowedRoles)) {
      res.status(403).json({
        error: "Forbidden: Insufficient permissions for this resource",
        requiredRoles: allowedRoles,
        currentRole: user.role
      });
      return { authorized: false };
    }

    req.user = user;
    return { authorized: true, user };
  } catch (err: any) {
    const status = err.status || 401;
    res.status(status).json({
      error: err.message || "Unauthorized: Authentication required"
    });
    return { authorized: false };
  }
}

// -------------------------------------------------------------
// Netlify Functions Auth & Role Guard (netlify/functions/*)
// -------------------------------------------------------------
export async function authenticateNetlifyRequest(
  event: any,
  allowedRoles?: string | string[]
): Promise<{ authorized: boolean; response?: { statusCode: number; headers: Record<string, string>; body: string }; user?: AuthenticatedUser }> {
  const origin = event.headers?.origin || event.headers?.Origin;
  const corsHeaders = getNetlifyCorsHeaders(origin);

  if (event.httpMethod === 'OPTIONS') {
    if (origin && !isAllowedOrigin(origin)) {
      return {
        authorized: false,
        response: {
          statusCode: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'CORS policy: Origin not allowed' })
        }
      };
    }
    return {
      authorized: false,
      response: {
        statusCode: 200,
        headers: corsHeaders,
        body: ''
      }
    };
  }

  if (origin && !isAllowedOrigin(origin)) {
    return {
      authorized: false,
      response: {
        statusCode: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'CORS policy: Origin not allowed' })
      }
    };
  }

  const authHeader = event.headers?.authorization || event.headers?.Authorization;
  try {
    const user = await verifyTokenAndGetUser(authHeader);

    if (allowedRoles && !isRoleAuthorized(user.role, allowedRoles)) {
      return {
        authorized: false,
        response: {
          statusCode: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            error: 'Forbidden: Insufficient permissions for this resource',
            requiredRoles: allowedRoles,
            currentRole: user.role
          })
        }
      };
    }

    return { authorized: true, user };
  } catch (err: any) {
    const status = err.status || 401;
    return {
      authorized: false,
      response: {
        statusCode: status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: err.message || 'Unauthorized: Authentication required'
        })
      }
    };
  }
}

// -------------------------------------------------------------
// Express Middlewares (for server.ts)
// -------------------------------------------------------------
export const authenticateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const user = await verifyTokenAndGetUser(authHeader);
    (req as any).user = user;
    next();
  } catch (err: any) {
    const status = err.status || 401;
    return res.status(status).json({
      error: err.message || "Unauthorized: Missing or invalid token"
    });
  }
};

export const requireRole = (allowedRoles: string | string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized: User is not authenticated" });
    }

    if (!isRoleAuthorized(user.role, allowedRoles)) {
      return res.status(403).json({
        error: "Forbidden: Insufficient permissions for this resource",
        requiredRoles: allowedRoles,
        currentRole: user.role
      });
    }

    next();
  };
};
