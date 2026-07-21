import "@tanstack/react-start/server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function clientIp(request: Request) {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

export function privacyHash(value: string) {
  return sha256(`${process.env.AUTH_PEPPER || process.env.SESSION_SECRET || "ago-dev-only"}:${value}`);
}

export function isSecureRequest(request: Request) {
  return (
    process.env.NODE_ENV === "production" ||
    request.headers.get("x-forwarded-proto") === "https" ||
    new URL(request.url).protocol === "https:"
  );
}

export function hasSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const normalized = new URL(origin).origin;
    return normalized === new URL(request.url).origin ||
      Boolean(process.env.PUBLIC_SITE_URL && normalized === new URL(process.env.PUBLIC_SITE_URL).origin);
  } catch {
    return false;
  }
}

export function productionSecretsAreValid() {
  if (process.env.NODE_ENV !== "production") return true;
  return Boolean(
    process.env.DATABASE_URL &&
      process.env.AUTH_PEPPER &&
      process.env.ADMIN_INITIAL_USERNAME &&
      process.env.ADMIN_INITIAL_PASSWORD,
  );
}
