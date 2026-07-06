import { createHmac, timingSafeEqual } from "crypto";
import { JWT_SECRET } from "../config";

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString("base64").replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function b64urlDecode(str: string): Buffer {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  return Buffer.from(str.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}
function sign(data: string): string {
  return b64url(createHmac("sha256", JWT_SECRET).update(data).digest());
}

export function signJWT(payload: Record<string, unknown>, expiresInSec = 7 * 24 * 60 * 60): string {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + expiresInSec };
  const h = b64url(JSON.stringify(header));
  const p = b64url(JSON.stringify(body));
  const s = sign(`${h}.${p}`);
  return `${h}.${p}.${s}`;
}

export function verifyJWT<T = any>(token: string): T {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Malformed token");
  const [h, p, s] = parts as [string, string, string];
  const expected = sign(`${h}.${p}`);
  const a = Buffer.from(s);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error("Bad signature");
  const payload = JSON.parse(b64urlDecode(p).toString("utf8"));
  if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) throw new Error("Expired");
  return payload as T;
}
