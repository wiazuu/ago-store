import { createHash } from "node:crypto";
import pg from "pg";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não configurada.");

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: true } : undefined,
  max: 1,
});

let migrated = 0;

async function storeInlineImage(value) {
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(value);
  if (!match) return value;
  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length || bytes.length > 700_000) throw new Error("Imagem incorporada inválida ou maior que 700 KB.");
  const contentType = `image/${match[1]}`;
  const extension = match[1] === "jpeg" ? "jpg" : match[1];
  const digest = createHash("sha256").update(bytes).digest("hex");
  const result = await pool.query(
    `insert into media_assets (filename, content_type, bytes, size, sha256)
     values ($1, $2, $3, $4, $5)
     on conflict (sha256) do update set sha256 = excluded.sha256
     returning id`,
    [`imagem-migrada.${extension}`, contentType, bytes, bytes.length, digest],
  );
  migrated += 1;
  return `/api/media/${result.rows[0].id}`;
}

async function migrateValue(value) {
  if (typeof value === "string") return storeInlineImage(value);
  if (Array.isArray(value)) return Promise.all(value.map(migrateValue));
  if (value && typeof value === "object") {
    const entries = await Promise.all(Object.entries(value).map(async ([key, child]) => [key, await migrateValue(child)]));
    return Object.fromEntries(entries);
  }
  return value;
}

try {
  const content = await pool.query("select data from site_content where key = 'published' limit 1");
  if (content.rows[0]?.data) {
    const data = await migrateValue(content.rows[0].data);
    await pool.query("update site_content set data = $1::jsonb, version = version + 1, updated_at = now() where key = 'published'", [JSON.stringify(data)]);
  }

  const emporium = await pool.query("select id, image from emporium_products where image like 'data:image/%'");
  for (const product of emporium.rows) {
    await pool.query("update emporium_products set image = $1, updated_at = now() where id = $2", [await storeInlineImage(product.image), product.id]);
  }

  console.log(`Migração concluída: ${migrated} referência(s) de imagem transferida(s) para media_assets.`);
} finally {
  await pool.end();
}
