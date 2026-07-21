import pg from "pg";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

if (process.env.CONFIRM_CLEAR_DEMO_DATA !== "YES") {
  throw new Error("Defina CONFIRM_CLEAR_DEMO_DATA=YES para confirmar a limpeza.");
}
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não configurada.");

const sections = [
  ["hero", "Banner principal"],
  ["benefits", "Benefícios"],
  ["categories", "Compre por categoria"],
  ["objectives", "Compre por objetivo"],
  ["featured", "Produtos em destaque"],
  ["kits", "Vitrine de kits"],
  ["midBanner", "Banner promocional"],
  ["howItWorks", "Como funciona"],
  ["testimonials", "Depoimentos"],
  ["about", "Sobre a marca"],
  ["faq", "Perguntas frequentes"],
].map(([key, label], index) => ({ key, label, active: false, order: index + 1 }));

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: true } : undefined,
  max: 1,
});

try {
  const result = await pool.query("select data from site_content where key = 'published' limit 1");
  if (!result.rows[0]?.data) throw new Error("Conteúdo publicado não encontrado.");
  const current = result.rows[0].data;
  const backupDirectory = resolve(".data");
  await mkdir(backupDirectory, { recursive: true });
  await writeFile(resolve(backupDirectory, "demo-content-backup.json"), JSON.stringify(current, null, 2), "utf8");
  const clean = {
    ...current,
    categories: [], objectives: [], products: [], kits: [], banners: [], coupons: [], orders: [],
    home: {
      promoBar: { active: false, text: "", link: "" },
      hero: { title: "", subtitle: "", image: "", ctaText: "", ctaLink: "", ctaSecondaryText: "", ctaSecondaryLink: "" },
      benefits: [],
      midBanner: { active: false, title: "", subtitle: "", image: "", ctaText: "", ctaLink: "" },
      howItWorks: [], testimonials: [], aboutShort: { title: "", text: "", image: "" }, faq: [], sections,
      seoTitle: current.appearance?.brandName || "agô", seoDescription: "",
    },
    institutional: {
      about: "", howItWorks: "", deliveryArea: "", privacy: "", terms: "", paymentMethods: "",
      support: { email: "", phone: "", whatsapp: "", hours: "" },
      socials: { instagram: "", facebook: "", tiktok: "", youtube: "" },
      freeShippingMin: 0,
    },
    appearance: { ...current.appearance, slogan: "" },
  };
  await pool.query("update site_content set data = $1::jsonb, version = version + 1, updated_at = now() where key = 'published'", [JSON.stringify(clean)]);
  await pool.query("delete from emporium_products");
  console.log("Conteúdo demonstrativo removido. Aparência da marca preservada.");
} finally {
  await pool.end();
}
