import "@tanstack/react-start/server-only";
import { eq, sql } from "drizzle-orm";
import { appearance, banners, categories, coupons, homeConfig, institutional, kits, objectives, orders, products } from "@/data/mock";
import { auditLogs, siteContent } from "@/db/schema";
import { getDatabase, hasDatabase } from "@/db/client.server";
import type { AdminData, PublicAdminData } from "@/store/admin-store";

export type StoredAdminData = { data: AdminData; updatedAt: string; version: number };
declare global { var __agoAdminContent: StoredAdminData | undefined; }

const seed: AdminData = { categories, objectives, products, kits, banners, coupons, orders, home: homeConfig, institutional, appearance };

export function looksLikeAdminData(value: unknown): value is AdminData {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AdminData>;
  return Array.isArray(candidate.categories) && Array.isArray(candidate.objectives) &&
    Array.isArray(candidate.products) && Array.isArray(candidate.kits) &&
    Array.isArray(candidate.banners) && Array.isArray(candidate.coupons) &&
    Array.isArray(candidate.orders) && Boolean(candidate.home && candidate.institutional && candidate.appearance);
}

function sanitizedClone(data: AdminData): AdminData {
  const clean = JSON.parse(JSON.stringify(data, (_key, value) =>
    typeof value === "string" ? value.replaceAll("\u0000", "").slice(0, 200_000) : value,
  )) as AdminData;
  if (!looksLikeAdminData(clean)) throw new Error("Conteúdo administrativo inválido.");
  return clean;
}

async function contentFilePath() {
  const path = await import("node:path");
  return path.join(process.cwd(), ".data", "ago-admin-content.json");
}

async function readDevelopmentFallback(): Promise<StoredAdminData> {
  if (globalThis.__agoAdminContent) return globalThis.__agoAdminContent;
  try {
    const fs = await import("node:fs/promises");
    const parsed = JSON.parse(await fs.readFile(await contentFilePath(), "utf8")) as StoredAdminData;
    if (looksLikeAdminData(parsed.data) && typeof parsed.updatedAt === "string") {
      return (globalThis.__agoAdminContent = { ...parsed, version: parsed.version || 1 });
    }
  } catch { /* First local run starts from the bundled seed. */ }
  return (globalThis.__agoAdminContent = { data: structuredClone(seed), updatedAt: new Date(0).toISOString(), version: 1 });
}

export async function readAdminContent(): Promise<StoredAdminData> {
  if (!hasDatabase()) {
    if (process.env.NODE_ENV === "production") throw new Error("DATABASE_URL é obrigatória em produção.");
    return readDevelopmentFallback();
  }
  const db = getDatabase();
  let rows = await db.select().from(siteContent).where(eq(siteContent.key, "published")).limit(1);
  if (!rows.length) {
    await db.insert(siteContent).values({ key: "published", data: seed }).onConflictDoNothing();
    rows = await db.select().from(siteContent).where(eq(siteContent.key, "published")).limit(1);
  }
  const row = rows[0];
  if (!row || !looksLikeAdminData(row.data)) throw new Error("Conteúdo publicado inválido no banco de dados.");
  return { data: row.data, updatedAt: row.updatedAt.toISOString(), version: row.version };
}

export async function writeAdminContent(data: AdminData, actorId?: string, ipHash = "system"): Promise<StoredAdminData> {
  const clean = sanitizedClone(data);
  const now = new Date();
  if (!hasDatabase()) {
    if (process.env.NODE_ENV === "production") throw new Error("DATABASE_URL é obrigatória em produção.");
    const current = await readDevelopmentFallback();
    const next = { data: clean, updatedAt: now.toISOString(), version: current.version + 1 };
    globalThis.__agoAdminContent = next;
    const fs = await import("node:fs/promises");
    const path = await contentFilePath();
    const pathModule = await import("node:path");
    await fs.mkdir(pathModule.dirname(path), { recursive: true });
    await fs.writeFile(path, JSON.stringify(next, null, 2), "utf8");
    return next;
  }
  const db = getDatabase();
  const [row] = await db.transaction(async (tx) => {
    const updated = await tx.insert(siteContent)
      .values({ key: "published", data: clean, updatedBy: actorId, updatedAt: now })
      .onConflictDoUpdate({ target: siteContent.key, set: { data: clean, updatedBy: actorId, updatedAt: now, version: sql`${siteContent.version} + 1` } })
      .returning();
    await tx.insert(auditLogs).values({ actorId, action: "site.publish", entity: "site_content", entityId: "published", details: { version: updated[0]?.version }, ipHash });
    return updated;
  });
  if (!row) throw new Error("Não foi possível salvar o conteúdo.");
  return { data: row.data as AdminData, updatedAt: row.updatedAt.toISOString(), version: row.version };
}

export function publicAdminContent(data: AdminData): PublicAdminData {
  return { categories: data.categories, objectives: data.objectives, products: data.products, kits: data.kits, banners: data.banners, home: data.home, institutional: data.institutional, appearance: data.appearance };
}
