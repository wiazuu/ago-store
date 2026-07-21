import "@tanstack/react-start/server-only";
import { and, eq, gt, isNull, lt, or } from "drizzle-orm";
import { customerPasswordResetTokens, customerSessions, customerUsers } from "@/db/schema";
import { getDatabase, hasDatabase } from "@/db/client.server";
import { hashAdminPassword } from "@/lib/admin-auth.server";
import { sendCustomerPasswordResetEmail } from "@/lib/email.server";
import { clientIp, privacyHash, randomToken, sha256 } from "@/lib/security.server";

export async function requestCustomerPasswordReset(request: Request, email: string) {
  if (!hasDatabase()) return; const db = getDatabase(); const normalized = email.trim().toLowerCase();
  const [user] = await db.select({ id: customerUsers.id, name: customerUsers.name, email: customerUsers.email }).from(customerUsers).where(and(eq(customerUsers.email, normalized), eq(customerUsers.active, true))).limit(1);
  if (!user) return;
  await db.delete(customerPasswordResetTokens).where(or(lt(customerPasswordResetTokens.expiresAt, new Date()), eq(customerPasswordResetTokens.userId, user.id)));
  const token = randomToken(36); const tokenHash = sha256(token);
  await db.insert(customerPasswordResetTokens).values({ tokenHash, userId: user.id, requestIpHash: privacyHash(clientIp(request)), expiresAt: new Date(Date.now() + 30 * 60 * 1000) });
  const baseUrl = process.env.PUBLIC_SITE_URL || new URL(request.url).origin;
  await sendCustomerPasswordResetEmail({ to: user.email, name: user.name, tokenHash, resetUrl: `${baseUrl.replace(/\/$/, "")}/redefinir-senha?token=${encodeURIComponent(token)}` });
}

export async function resetCustomerPassword(request: Request, token: string, password: string) {
  if (!hasDatabase()) return false; const db = getDatabase(); const tokenHash = sha256(token); const now = new Date();
  const [record] = await db.select().from(customerPasswordResetTokens).where(and(eq(customerPasswordResetTokens.tokenHash, tokenHash), isNull(customerPasswordResetTokens.usedAt), gt(customerPasswordResetTokens.expiresAt, now))).limit(1);
  if (!record) return false; const passwordHash = await hashAdminPassword(password);
  return db.transaction(async (tx) => {
    const used = await tx.update(customerPasswordResetTokens).set({ usedAt: now }).where(and(eq(customerPasswordResetTokens.tokenHash, tokenHash), isNull(customerPasswordResetTokens.usedAt))).returning({ userId: customerPasswordResetTokens.userId });
    if (!used.length) return false;
    await tx.update(customerUsers).set({ passwordHash, passwordChangedAt: now, updatedAt: now }).where(eq(customerUsers.id, record.userId));
    await tx.delete(customerSessions).where(eq(customerSessions.userId, record.userId));
    return true;
  });
}
