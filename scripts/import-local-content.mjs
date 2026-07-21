import { readFile } from "node:fs/promises";
import pg from "pg";

if (!process.env.DATABASE_URL) throw new Error("Defina DATABASE_URL antes de importar.");
const source = JSON.parse(await readFile(new URL("../.data/ago-admin-content.json", import.meta.url), "utf8"));
if (!source?.data?.products || !source?.data?.appearance) throw new Error("Arquivo local de conteúdo inválido.");
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: true } : undefined, max: 1 });
try {
  await pool.query("insert into site_content (key, data, version, updated_at) values ($1, $2::jsonb, 1, now()) on conflict (key) do update set data = excluded.data, version = site_content.version + 1, updated_at = now()", ["published", JSON.stringify(source.data)]);
  console.log("Conteúdo local importado para o PostgreSQL.");
} finally { await pool.end(); }
