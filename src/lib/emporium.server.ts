import "@tanstack/react-start/server-only";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { auditLogs, emporiumProducts } from "@/db/schema";
import { getDatabase, hasDatabase } from "@/db/client.server";
import { sendLowStockEmail } from "@/lib/email.server";

export const emporiumInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(140),
  category: z.string().trim().min(2).max(80),
  shortDescription: z.string().trim().min(2).max(240),
  description: z.string().trim().min(2).max(5000),
  image: z.string().trim().max(900_000).refine((value) => value.startsWith("https://") || value.startsWith("data:image/"), "Imagem inválida."),
  priceCents: z.number().int().min(50).max(10_000_000),
  stock: z.number().int().min(0).max(1_000_000),
  active: z.boolean(),
  featured: z.boolean(),
});
export type EmporiumInput = z.infer<typeof emporiumInputSchema>;
export type EmporiumProduct = EmporiumInput & { id: string; createdAt: string; updatedAt: string };

function publicShape(row: typeof emporiumProducts.$inferSelect): EmporiumProduct {
  return { ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}

export async function listEmporiumProducts(includeInactive = false) {
  if (!hasDatabase()) return [];
  const db = getDatabase();
  const rows = includeInactive
    ? await db.select().from(emporiumProducts).orderBy(asc(emporiumProducts.category), asc(emporiumProducts.name))
    : await db.select().from(emporiumProducts).where(eq(emporiumProducts.active, true)).orderBy(asc(emporiumProducts.category), asc(emporiumProducts.name));
  return rows.map(publicShape);
}

export async function createEmporiumProduct(input: EmporiumInput, actorId: string, ipHash: string) {
  const db = getDatabase();
  const product = await db.transaction(async (tx) => {
    const [row] = await tx.insert(emporiumProducts).values(input).returning();
    if (!row) throw new Error("Produto não criado.");
    await tx.insert(auditLogs).values({ actorId, action: "emporium.create", entity: "emporium_product", entityId: row.id, ipHash });
    return publicShape(row);
  });
  if (product.active && product.stock <= 5) await sendLowStockEmail({ productId: product.id, productName: product.name, stock: product.stock });
  return product;
}

export async function updateEmporiumProduct(id: string, input: EmporiumInput, actorId: string, ipHash: string) {
  const db = getDatabase();
  const product = await db.transaction(async (tx) => {
    const [row] = await tx.update(emporiumProducts).set({ ...input, updatedAt: new Date() }).where(eq(emporiumProducts.id, id)).returning();
    if (!row) return null;
    await tx.insert(auditLogs).values({ actorId, action: "emporium.update", entity: "emporium_product", entityId: id, ipHash });
    return publicShape(row);
  });
  if (product?.active && product.stock <= 5) await sendLowStockEmail({ productId: product.id, productName: product.name, stock: product.stock });
  return product;
}

export async function deleteEmporiumProduct(id: string, actorId: string, ipHash: string) {
  const db = getDatabase();
  return db.transaction(async (tx) => {
    const [row] = await tx.delete(emporiumProducts).where(eq(emporiumProducts.id, id)).returning({ id: emporiumProducts.id });
    if (!row) return false;
    await tx.insert(auditLogs).values({ actorId, action: "emporium.delete", entity: "emporium_product", entityId: id, ipHash });
    return true;
  });
}
