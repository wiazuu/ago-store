import pg from "pg";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não configurada.");
const photo = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&h=900&q=82`;
const imageIds = [
  "1565958011703-44f9829ba187", "1504674900247-0877df9cc836", "1546069901-ba9599a7e63c",
  "1543353071-10c8ba85a904", "1490645935967-10de6ba17061", "1493770348161-369560ae357d",
  "1467003909585-2f8a72700288", "1505253758473-96b7015fcd40", "1540189549336-e6e99c3679fe",
  "1490474418585-ba9bad8fd0ea", "1519708227418-c8fd9a32b7a2", "1502741338009-cac2772e18bc",
];
const dishes = [
  ["Ragu de patinho com mousseline de batata inglesa", 413, 29, 22, 22, ["contém lactose", "low carb"]],
  ["Ragu de patinho com rigattoni", 568, 37, 74, 13, ["contém glúten"]],
  ["Almôndegas artesanais com rigattoni", 481, 38, 81, 11, ["contém glúten"]],
  ["Medalhão de mignon com mousseline de macaxeira", 392, 27, 30, 17, ["novo"]],
  ["Medalhão de mignon com batatas assadas", 397, 30, 30, 17, ["low carb"]],
  ["Frango no caldo de tucupi e arroz tradicional", 282, 24, 33, 3, ["novo", "low carb"]],
  ["Salmão na crosta de ervas finas com arroz de brócolis", 260, 23, 9, 10, ["+fibras", "contém lactose"]],
  ["Salmão assado com arroz negro", 296, 24, 25, 6, ["novo", "low fat"]],
  ["Lasanha à bolonhesa", 455, 41, 33, 10, ["contém lactose", "contém glúten"]],
  ["Lasanha à bolonhesa de abobrinha italiana", 397, 41, 14, 6, ["contém glúten", "contém lactose"]],
  ["Ravioli de ricota temperada com molho de tomate", 410, 25, 22, 10, ["contém lactose", "contém glúten"]],
  ["Filé de peixe assado com mousseline de macaxeira", 202, 15, 30, 2, ["novo", "low fat"]],
];
const slugify = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const products = dishes.map(([name, calories, protein, carbs, fats, tags], index) => ({
  id: `menu-${index + 1}`, name, slug: slugify(name), categoryId: "cardapio", objectiveIds: [],
  image: photo(imageIds[index]), gallery: [photo(imageIds[index])], shortDescription: `${protein}g de proteína · ${carbs}g de carboidratos · ${fats}g de gorduras`,
  description: "Opção disponível para montagem dos planos A1 e A2. Consulte a disponibilidade no cardápio da semana.",
  price: 0, stock: 999, weightG: 0, calories, protein, carbs, fats, ingredients: "", allergens: tags.filter((tag) => tag.startsWith("contém")).join(", "),
  preparation: "Siga as orientações de preparo enviadas com a refeição.", validity: "Consulte a etiqueta da embalagem.", storage: "Armazene na geladeira ou no freezer conforme a orientação recebida.",
  tags, badge: tags.includes("novo") ? "novo" : "", active: true, featured: index < 8, isNew: tags.includes("novo"), bestSeller: false,
}));
const kitImageA1 = photo("1543353071-10c8ba85a904");
const kitImageA2 = photo("1540189549336-e6e99c3679fe");
const kits = [
  { id: "a1-semanal", name: "Plano A1 · Semanal", slug: "plano-a1-semanal", description: "7 refeições · entregas programadas · sem compromisso prolongado.", image: kitImageA1, items: [], price: 196, discountPct: 0, active: true },
  { id: "a1-mensal", name: "Plano A1 · Mensal", slug: "plano-a1-mensal", description: "28 refeições · entregas agendadas · organização para o mês.", image: kitImageA1, items: [], price: 699, discountPct: 0, active: true },
  { id: "a1-trimestral", name: "Plano A1 · Trimestral", slug: "plano-a1-trimestral", description: "84 refeições em 3 meses · R$ 680 por mês · total do período.", image: kitImageA1, items: [], price: 2040, discountPct: 0, active: true },
  { id: "a2-semanal", name: "Plano A2 · Semanal", slug: "plano-a2-semanal", description: "7 refeições · entregas programadas · sem compromisso prolongado.", image: kitImageA2, items: [], price: 252, discountPct: 0, active: true },
  { id: "a2-mensal", name: "Plano A2 · Mensal", slug: "plano-a2-mensal", description: "28 refeições · entregas agendadas · organização para o mês.", image: kitImageA2, items: [], price: 989, discountPct: 0, active: true },
  { id: "a2-trimestral", name: "Plano A2 · Trimestral", slug: "plano-a2-trimestral", description: "84 refeições em 3 meses · R$ 970 por mês · total do período.", image: kitImageA2, items: [], price: 2910, discountPct: 0, active: true },
];
const sections = ["hero", "benefits", "categories", "featured", "kits", "howItWorks", "faq"].map((key, index) => ({ key, label: ({ hero: "Banner principal", benefits: "Benefícios", categories: "Compre por categoria", featured: "Pratos do cardápio", kits: "Planos", howItWorks: "Como funciona", faq: "Perguntas frequentes" })[key], active: true, order: index + 1 }));
for (const [key, label] of [["objectives", "Compre por objetivo"], ["midBanner", "Banner promocional"], ["testimonials", "Depoimentos"], ["about", "Sobre a marca"]]) sections.push({ key, label, active: false, order: sections.length + 1 });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: true } : undefined, max: 1 });
try {
  const result = await pool.query("select data from site_content where key = 'published' limit 1");
  if (!result.rows[0]?.data) throw new Error("Conteúdo publicado não encontrado.");
  const current = result.rows[0].data;
  const next = {
    ...current,
    categories: [{ id: "cardapio", name: "Cardápio", slug: "cardapio", description: "Pratos disponíveis para montar os planos A1 e A2.", image: photo("1546069901-ba9599a7e63c"), color: "#F5A623", order: 1, active: true }],
    objectives: [], products, kits, coupons: [], orders: [],
    banners: [
      { id: "inicio-planos", location: "home-hero", title: "Planos A1 e A2", subtitle: "Escolha a frequência que combina com a sua rotina.", image: kitImageA1, link: "/", ctaText: "Conhecer planos", active: true, order: 1 },
      { id: "inicio-cardapio", location: "home-mid", title: "Monte seu cardápio", subtitle: "Escolha suas refeições entre as opções disponíveis da semana.", image: photo("1546069901-ba9599a7e63c"), link: "/categoria/cardapio", ctaText: "Ver pratos", active: true, order: 2 },
    ],
    home: {
      promoBar: { active: true, text: "Planos com entregas programadas", link: "/" },
      hero: { title: "Sua rotina alimentar, organizada.", subtitle: "Conheça os planos A1 e A2 e escolha as refeições do seu cardápio.", image: kitImageA1, ctaText: "Ver planos", ctaLink: "/#planos", ctaSecondaryText: "Ver cardápio", ctaSecondaryLink: "/categoria/cardapio" },
      benefits: [
        { id: "entregas", icon: "Truck", title: "Entregas programadas", description: "Receba conforme a frequência do plano escolhido." },
        { id: "equilibrio", icon: "Salad", title: "Refeições equilibradas", description: "Informações nutricionais disponíveis em cada prato." },
        { id: "flexibilidade", icon: "CalendarDays", title: "Planos flexíveis", description: "Opções semanal, mensal e trimestral." },
      ],
      midBanner: { active: false, title: "", subtitle: "", image: "", ctaText: "", ctaLink: "" },
      howItWorks: [
        { id: "passo-1", step: 1, title: "Escolha seu plano", description: "Selecione A1 ou A2 e a frequência.", icon: "ClipboardList" },
        { id: "passo-2", step: 2, title: "Monte o cardápio", description: "Escolha até 3 opções de cada item, conforme disponibilidade.", icon: "Utensils" },
        { id: "passo-3", step: 3, title: "Receba sua entrega", description: "As entregas são programadas de acordo com o plano.", icon: "PackageCheck" },
      ],
      testimonials: [], aboutShort: { title: "", text: "", image: "" },
      faq: [
        { id: "quantidade", question: "Quantas refeições estão incluídas?", answer: "São 7 refeições na assinatura semanal, 28 na mensal e 84 na trimestral." },
        { id: "cardapio", question: "Como funciona a escolha do cardápio?", answer: "O cardápio é enviado no início do plano. Semanalmente é possível escolher até 3 opções de cada item, conforme disponibilidade. Preparações especiais podem não incluir acompanhamento." },
        { id: "armazenamento", question: "Como armazenar e preparar?", answer: "As refeições são entregues refrigeradas e podem ser guardadas na geladeira ou no freezer conforme orientação. As embalagens podem ser aquecidas no micro-ondas, forno a gás ou elétrico e air fryer, conforme instruções." },
        { id: "pagamento", question: "Quais formas de pagamento?", answer: "Pagamento à vista via Pix, vale-alimentação e cartão de crédito mediante a taxa do aplicativo." },
      ], sections, seoTitle: "agô · Planos de refeições", seoDescription: "Planos A1 e A2 com entregas programadas e cardápio semanal.",
    },
    institutional: {
      ...current.institutional,
      about: "", howItWorks: "Escolha o plano, monte o cardápio e receba as entregas programadas.", deliveryArea: "", privacy: current.institutional?.privacy || "", terms: current.institutional?.terms || "",
      paymentMethods: "Pix, vale-alimentação e cartão de crédito mediante a taxa do aplicativo.",
      support: { email: "", phone: "+55 92 8487-7108", whatsapp: "+55 92 8487-7108", hours: "" },
      socials: { instagram: "https://www.instagram.com/ago.mao/", facebook: "", tiktok: "", youtube: "" }, freeShippingMin: 0,
    },
    appearance: { ...current.appearance, slogan: "Planos de refeições para a sua rotina" },
  };
  await pool.query("update site_content set data = $1::jsonb, version = version + 1, updated_at = now() where key = 'published'", [JSON.stringify(next)]);
  console.log(`Cardápio cadastrado: ${products.length} pratos e ${kits.length} planos.`);
} finally { await pool.end(); }
