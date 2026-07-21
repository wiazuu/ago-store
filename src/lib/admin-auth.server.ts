import "@tanstack/react-start/server-only";
import { Algorithm, hash, verify } from "@node-rs/argon2";
import { and, eq, gt, lt } from "drizzle-orm";
import { adminSessions, adminUsers, auditLogs, loginLimits } from "@/db/schema";
import { getDatabase, hasDatabase } from "@/db/client.server";
import {
  clientIp,
  hasSameOrigin,
  isSecureRequest,
  privacyHash,
  randomToken,
  safeEqual,
  sha256,
} from "@/lib/security.server";

const SESSION_SECONDS = 8 * 60 * 60;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;

export type AdminSession = {
  userId: string;
  username: string;
  tokenHash: string;
  csrfHash: string;
};

type DevelopmentSession = AdminSession & { expiresAt: number };
declare global {
  var __agoDevelopmentSessions: Map<string, DevelopmentSession> | undefined;
  var __agoDevelopmentLoginLimits: Map<string, { attempts: number; resetsAt: number }> | undefined;
}
const developmentSessions = (globalThis.__agoDevelopmentSessions ||= new Map());
const developmentLimits = (globalThis.__agoDevelopmentLoginLimits ||= new Map());

function cookieName(request: Request) {
  return isSecureRequest(request) ? "__Host-ago_admin_session" : "ago_admin_session";
}

function cookieValue(request: Request) {
  const cookie = request.headers.get("cookie") || "";
  for (const name of [cookieName(request), "__Host-ago_admin_session", "ago_admin_session"]) {
    const value = cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${name}=`))
      ?.slice(name.length + 1);
    if (value) return decodeURIComponent(value);
  }
  return null;
}

export async function hashAdminPassword(password: string) {
  return hash(password, {
    algorithm: Algorithm.Argon2id,
    memoryCost: 65_536,
    timeCost: 3,
    parallelism: 1,
    outputLen: 32,
  });
}

export async function ensureInitialAdmin() {
  const db = getDatabase();
  const existing = await db.select({ id: adminUsers.id, email: adminUsers.email }).from(adminUsers).limit(1);
  if (existing.length) {
    if (!existing[0].email && process.env.ADMIN_INITIAL_EMAIL) await db.update(adminUsers).set({ email: process.env.ADMIN_INITIAL_EMAIL.trim().toLowerCase(), updatedAt: new Date() }).where(eq(adminUsers.id, existing[0].id));
    return;
  }

  const username = process.env.ADMIN_INITIAL_USERNAME;
  const password = process.env.ADMIN_INITIAL_PASSWORD;
  if (!username || !password || password.length < 12) {
    throw new Error(
      "Configure ADMIN_INITIAL_USERNAME e ADMIN_INITIAL_PASSWORD (mínimo de 12 caracteres) antes do primeiro acesso.",
    );
  }

  await db.insert(adminUsers).values({
    username: username.trim().toLowerCase(),
    email: process.env.ADMIN_INITIAL_EMAIL?.trim().toLowerCase() || null,
    passwordHash: await hashAdminPassword(password),
  });
}

function loginKey(request: Request, username: string) {
  return privacyHash(`${clientIp(request)}:${username.trim().toLowerCase()}`);
}

async function recordFailedLogin(keyHash: string) {
  const db = getDatabase();
  const now = new Date();
  const current = await db.select().from(loginLimits).where(eq(loginLimits.keyHash, keyHash)).limit(1);
  const row = current[0];
  const expired = !row || now.getTime() - row.windowStartedAt.getTime() > LOGIN_WINDOW_MS;
  const attempts = expired ? 1 : row.attempts + 1;
  const blockedUntil = attempts >= MAX_LOGIN_ATTEMPTS ? new Date(now.getTime() + LOGIN_WINDOW_MS) : null;

  await db
    .insert(loginLimits)
    .values({ keyHash, attempts, windowStartedAt: expired ? now : row.windowStartedAt, blockedUntil, updatedAt: now })
    .onConflictDoUpdate({
      target: loginLimits.keyHash,
      set: { attempts, windowStartedAt: expired ? now : row.windowStartedAt, blockedUntil, updatedAt: now },
    });
}

export async function authenticateAdmin(request: Request, username: string, password: string) {
  if (!hasDatabase()) {
    if (process.env.NODE_ENV === "production") throw new Error("DATABASE_URL é obrigatória em produção.");
    const normalized = username.trim().toLowerCase(); const key = loginKey(request, normalized); const now = Date.now();
    const limit = developmentLimits.get(key); if (limit && limit.resetsAt > now && limit.attempts >= MAX_LOGIN_ATTEMPTS) return { ok: false as const, limited: true };
    const expectedUser = (process.env.ADMIN_INITIAL_USERNAME || process.env.ADMIN_USERNAME || "").trim().toLowerCase();
    const expectedPassword = process.env.ADMIN_INITIAL_PASSWORD || process.env.ADMIN_PASSWORD || "";
    const valid = Boolean(expectedUser && expectedPassword) && safeEqual(sha256(normalized), sha256(expectedUser)) && safeEqual(sha256(password), sha256(expectedPassword));
    if (!valid) { const current = limit && limit.resetsAt > now ? limit.attempts : 0; developmentLimits.set(key, { attempts: current + 1, resetsAt: now + LOGIN_WINDOW_MS }); return { ok: false as const, limited: false }; }
    developmentLimits.delete(key); const token = randomToken(); const csrfToken = randomToken(); const tokenHash = sha256(token); const expiresAt = new Date(now + SESSION_SECONDS * 1000);
    developmentSessions.set(tokenHash, { userId: "development-admin", username: normalized, tokenHash, csrfHash: sha256(csrfToken), expiresAt: expiresAt.getTime() });
    return { ok: true as const, token, csrfToken, username: normalized, expiresAt };
  }
  await ensureInitialAdmin();
  const db = getDatabase();
  const normalized = username.trim().toLowerCase();
  const keyHash = loginKey(request, normalized);
  const limit = await db.select().from(loginLimits).where(eq(loginLimits.keyHash, keyHash)).limit(1);
  if (limit[0]?.blockedUntil && limit[0].blockedUntil > new Date()) {
    return { ok: false as const, limited: true };
  }

  const users = await db
    .select()
    .from(adminUsers)
    .where(and(eq(adminUsers.username, normalized), eq(adminUsers.active, true)))
    .limit(1);
  const user = users[0];
  const valid = user ? await verify(user.passwordHash, password).catch(() => false) : false;
  if (!valid || !user) {
    await recordFailedLogin(keyHash);
    return { ok: false as const, limited: false };
  }

  await db.delete(loginLimits).where(eq(loginLimits.keyHash, keyHash));
  await db.delete(adminSessions).where(lt(adminSessions.expiresAt, new Date()));

  const token = randomToken();
  const csrfToken = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000);
  await db.insert(adminSessions).values({
    tokenHash: sha256(token),
    userId: user.id,
    csrfHash: sha256(csrfToken),
    ipHash: privacyHash(clientIp(request)),
    userAgentHash: privacyHash(request.headers.get("user-agent") || "unknown"),
    expiresAt,
  });
  await db.insert(auditLogs).values({
    actorId: user.id,
    action: "admin.login",
    entity: "admin_session",
    ipHash: privacyHash(clientIp(request)),
  });

  return { ok: true as const, token, csrfToken, username: user.username, expiresAt };
}

export async function getAdminSession(request: Request): Promise<AdminSession | null> {
  const token = cookieValue(request);
  if (!token) return null;
  const tokenHash = sha256(token);
  if (!hasDatabase()) {
    if (process.env.NODE_ENV === "production") return null;
    const session = developmentSessions.get(tokenHash); if (!session || session.expiresAt <= Date.now()) { developmentSessions.delete(tokenHash); return null; }
    return session;
  }
  const db = getDatabase();
  const rows = await db
    .select({
      userId: adminUsers.id,
      username: adminUsers.username,
      tokenHash: adminSessions.tokenHash,
      csrfHash: adminSessions.csrfHash,
    })
    .from(adminSessions)
    .innerJoin(adminUsers, eq(adminSessions.userId, adminUsers.id))
    .where(and(eq(adminSessions.tokenHash, tokenHash), gt(adminSessions.expiresAt, new Date()), eq(adminUsers.active, true)))
    .limit(1);
  return rows[0] || null;
}

export async function requireAdminRequest(request: Request, options?: { csrf?: boolean }) {
  const session = await getAdminSession(request);
  if (!session) return null;
  if (options?.csrf) {
    if (!hasSameOrigin(request)) return null;
    const supplied = request.headers.get("x-csrf-token") || "";
    if (!supplied || !safeEqual(sha256(supplied), session.csrfHash)) return null;
  }
  return session;
}

export async function destroyAdminSession(request: Request) {
  const token = cookieValue(request);
  if (!token) return;
  if (!hasDatabase()) { developmentSessions.delete(sha256(token)); return; }
  await getDatabase().delete(adminSessions).where(eq(adminSessions.tokenHash, sha256(token)));
}

export function createAdminSessionCookie(request: Request, token: string) {
  return [
    `${cookieName(request)}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${SESSION_SECONDS}`,
    isSecureRequest(request) ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

export function clearAdminSessionCookie(request: Request) {
  return `${cookieName(request)}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${isSecureRequest(request) ? "; Secure" : ""}`;
}
