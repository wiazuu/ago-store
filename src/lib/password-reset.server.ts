import "@tanstack/react-start/server-only";
import { and, eq, gt, isNull, lt, or } from "drizzle-orm";
import { adminSessions, adminUsers, auditLogs, passwordResetTokens } from "@/db/schema";
import { getDatabase, hasDatabase } from "@/db/client.server";
import { ensureInitialAdmin, hashAdminPassword } from "@/lib/admin-auth.server";
import { sendPasswordResetEmail } from "@/lib/email.server";
import { clientIp, privacyHash, randomToken, sha256 } from "@/lib/security.server";

export async function requestPasswordReset(request: Request, identity: string) {
  if (!hasDatabase()) return;
  await ensureInitialAdmin();
  const db = getDatabase(); const normalized = identity.trim().toLowerCase();
  const [user] = await db.select({ id: adminUsers.id, username: adminUsers.username, email: adminUsers.email }).from(adminUsers).where(and(eq(adminUsers.active, true), or(eq(adminUsers.username, normalized), eq(adminUsers.email, normalized)))).limit(1);
  if (!user?.email) return;

  await db.delete(passwordResetTokens).where(or(lt(passwordResetTokens.expiresAt, new Date()), eq(passwordResetTokens.userId, user.id)));
  const token = randomToken(36); const tokenHash = sha256(token); const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  await db.insert(passwordResetTokens).values({ tokenHash, userId: user.id, requestIpHash: privacyHash(clientIp(request)), expiresAt });
  const baseUrl = process.env.PUBLIC_SITE_URL || new URL(request.url).origin;
  const resetUrl = `${baseUrl.replace(/\/$/, "")}/central-agons-92x/redefinir-senha?token=${encodeURIComponent(token)}`;
  await sendPasswordResetEmail({ to: user.email, name: user.username, resetUrl, tokenHash });
}

export async function resetAdminPassword(request: Request, token: string, newPassword: string) {
  if (!hasDatabase()) return false;
  const db = getDatabase(); const tokenHash = sha256(token); const now = new Date();
  const [record] = await db.select().from(passwordResetTokens).where(and(eq(passwordResetTokens.tokenHash, tokenHash), isNull(passwordResetTokens.usedAt), gt(passwordResetTokens.expiresAt, now))).limit(1);
  if (!record) return false;
  const nextHash = await hashAdminPassword(newPassword);
  return db.transaction(async (tx) => {
    const used = await tx.update(passwordResetTokens).set({ usedAt: now }).where(and(eq(passwordResetTokens.tokenHash, tokenHash), isNull(passwordResetTokens.usedAt))).returning({ userId: passwordResetTokens.userId });
    if (!used.length) return false;
    await tx.update(adminUsers).set({ passwordHash: nextHash, passwordChangedAt: now, updatedAt: now }).where(eq(adminUsers.id, record.userId));
    await tx.delete(adminSessions).where(eq(adminSessions.userId, record.userId));
    await tx.insert(auditLogs).values({ actorId: record.userId, action: "admin.password_reset", entity: "admin_user", entityId: record.userId, ipHash: privacyHash(clientIp(request)) });
    return true;
  });
}
