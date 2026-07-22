import "@tanstack/react-start/server-only";
import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDatabase } from "@/db/client.server";
import { mediaAssets } from "@/db/schema";

const MAX_MEDIA_BYTES = 700_000;

function detectedImageType(bytes: Uint8Array) {
  if (bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return "image/webp";
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return "image/png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  return null;
}

function safeFilename(value: string, contentType: string) {
  const extension = contentType === "image/webp" ? ".webp" : contentType === "image/png" ? ".png" : ".jpg";
  const base = value.replace(/\.[^.]+$/, "").normalize("NFKD").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "imagem";
  return `${base}${extension}`;
}

export async function storeMediaAsset(input: Uint8Array, originalName: string, uploadedBy: string | null) {
  if (!input.length) throw new Error("O arquivo de imagem está vazio.");
  if (input.length > MAX_MEDIA_BYTES) throw new Error("A imagem processada deve ter no máximo 700 KB.");
  const contentType = detectedImageType(input);
  if (!contentType) throw new Error("Formato inválido. Envie uma imagem JPG, PNG ou WebP.");

  const bytes = Buffer.from(input);
  const digest = createHash("sha256").update(bytes).digest("hex");
  const db = getDatabase();
  const inserted = await db
    .insert(mediaAssets)
    .values({ filename: safeFilename(originalName, contentType), contentType, bytes, size: bytes.length, sha256: digest, uploadedBy })
    .onConflictDoNothing({ target: mediaAssets.sha256 })
    .returning({ id: mediaAssets.id });
  const id = inserted[0]?.id || (await db.select({ id: mediaAssets.id }).from(mediaAssets).where(eq(mediaAssets.sha256, digest)).limit(1))[0]?.id;
  if (!id) throw new Error("Não foi possível armazenar a imagem.");
  return { id, url: `/api/media/${id}`, contentType, size: bytes.length };
}

export async function readMediaAsset(id: string) {
  return (await getDatabase().select().from(mediaAssets).where(eq(mediaAssets.id, id)).limit(1))[0] || null;
}

