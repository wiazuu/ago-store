import "@tanstack/react-start/server-only";
import { verify } from "@node-rs/argon2";
import { and, eq, gt, lt } from "drizzle-orm";
import { customerSessions, customerUsers } from "@/db/schema";
import { getDatabase, hasDatabase } from "@/db/client.server";
import { hashAdminPassword } from "@/lib/admin-auth.server";
import { clientIp, isSecureRequest, privacyHash, randomToken, sha256 } from "@/lib/security.server";

const SESSION_SECONDS = 30 * 24 * 60 * 60;
export type CustomerSession = {
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  tokenHash: string;
};

function cookieName(request: Request) {
  return isSecureRequest(request) ? "__Host-ago_customer_session" : "ago_customer_session";
}
function cookieValue(request: Request) {
  const cookie = request.headers.get("cookie") || "";
  for (const name of [cookieName(request), "__Host-ago_customer_session", "ago_customer_session"]) {
    const value = cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${name}=`))
      ?.slice(name.length + 1);
    if (value) return decodeURIComponent(value);
  }
  return null;
}

export async function registerCustomer(input: {
  name: string;
  email: string;
  phone?: string;
  password: string;
}) {
  if (!hasDatabase()) throw new Error("DATABASE_UNAVAILABLE");
  const db = getDatabase();
  const email = input.email.trim().toLowerCase();
  const existing = await db
    .select({ id: customerUsers.id })
    .from(customerUsers)
    .where(eq(customerUsers.email, email))
    .limit(1);
  if (existing.length) return null;
  const [user] = await db
    .insert(customerUsers)
    .values({
      name: input.name.trim(),
      email,
      phone: input.phone?.trim() || null,
      passwordHash: await hashAdminPassword(input.password),
    })
    .returning({ id: customerUsers.id, name: customerUsers.name, email: customerUsers.email });
  await db
    .update(customerUsers)
    .set({ referralCode: `AGO${user.id.replace(/-/g, "").slice(0, 8).toUpperCase()}` })
    .where(eq(customerUsers.id, user.id));
  return user;
}

export async function loginCustomer(request: Request, email: string, password: string) {
  if (!hasDatabase()) throw new Error("DATABASE_UNAVAILABLE");
  const db = getDatabase();
  const normalized = email.trim().toLowerCase();
  const [user] = await db
    .select()
    .from(customerUsers)
    .where(and(eq(customerUsers.email, normalized), eq(customerUsers.active, true)))
    .limit(1);
  if (!user || !(await verify(user.passwordHash, password).catch(() => false))) return null;
  await db.delete(customerSessions).where(lt(customerSessions.expiresAt, new Date()));
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000);
  await db.insert(customerSessions).values({
    tokenHash: sha256(token),
    userId: user.id,
    ipHash: privacyHash(clientIp(request)),
    userAgentHash: privacyHash(request.headers.get("user-agent") || "unknown"),
    expiresAt,
  });
  return { token, user: { id: user.id, name: user.name, email: user.email, phone: user.phone } };
}

export async function getCustomerSession(request: Request): Promise<CustomerSession | null> {
  if (!hasDatabase()) return null;
  const token = cookieValue(request);
  if (!token) return null;
  const tokenHash = sha256(token);
  const [session] = await getDatabase()
    .select({
      userId: customerUsers.id,
      name: customerUsers.name,
      email: customerUsers.email,
      phone: customerUsers.phone,
      tokenHash: customerSessions.tokenHash,
    })
    .from(customerSessions)
    .innerJoin(customerUsers, eq(customerSessions.userId, customerUsers.id))
    .where(
      and(
        eq(customerSessions.tokenHash, tokenHash),
        gt(customerSessions.expiresAt, new Date()),
        eq(customerUsers.active, true),
      ),
    )
    .limit(1);
  return session || null;
}

export async function destroyCustomerSession(request: Request) {
  const token = cookieValue(request);
  if (token && hasDatabase())
    await getDatabase()
      .delete(customerSessions)
      .where(eq(customerSessions.tokenHash, sha256(token)));
}
export function createCustomerCookie(request: Request, token: string) {
  return [
    `${cookieName(request)}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${SESSION_SECONDS}`,
    isSecureRequest(request) ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}
export function clearCustomerCookie(request: Request) {
  return `${cookieName(request)}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isSecureRequest(request) ? "; Secure" : ""}`;
}
