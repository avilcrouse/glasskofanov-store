import crypto from "node:crypto";

const COOKIE_NAME = "gk_admin_session";
const SESSION_LIFETIME_SECONDS = 60 * 60 * 12;

function getSecret() {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD;
}

function sign(value) {
  return crypto.createHmac("sha256", getSecret()).update(value).digest("base64url");
}

export function createAdminSession() {
  const expiresAt = String(Date.now() + SESSION_LIFETIME_SECONDS * 1000);
  return expiresAt + "." + sign(expiresAt);
}

export function adminCookie(token) {
  return COOKIE_NAME + "=" + token + "; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=" + SESSION_LIFETIME_SECONDS;
}

export function clearAdminCookie() {
  return COOKIE_NAME + "=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0";
}

export function isAdminRequest(req) {
  if (!getSecret()) return false;
  const cookies = Object.fromEntries((req.headers.cookie || "").split(";").map((part) => part.trim().split("=")).filter(([name, value]) => name && value));
  const token = cookies[COOKIE_NAME];
  if (!token) return false;
  const [expiresAt, signature] = token.split(".");
  if (!expiresAt || !signature || Number(expiresAt) < Date.now()) return false;
  const expected = sign(expiresAt);
  if (signature.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
