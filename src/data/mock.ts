import type {
  AppearanceConfig,
  Banner,
  Category,
  Coupon,
  HomeConfig,
  InstitutionalContent,
  Kit,
  Objective,
  Order,
  Product,
} from "./types";

// Instalações novas começam sem catálogo ou informações comerciais inventadas.
// Todo o conteúdo público é criado e publicado pela Central de gestão.
export const categories: Category[] = [];
export const objectives: Objective[] = [];
export const products: Product[] = [];
export const kits: Kit[] = [];
export const banners: Banner[] = [];
export const coupons: Coupon[] = [];
export const orders: Order[] = [];

export const homeConfig: HomeConfig = {
  promoBar: { active: false, text: "", link: "" },
  hero: {
    title: "",
    subtitle: "",
    image: "",
    ctaText: "",
    ctaLink: "",
    ctaSecondaryText: "",
    ctaSecondaryLink: "",
  },
  benefits: [],
  midBanner: {
    active: false,
    title: "",
    subtitle: "",
    image: "",
    ctaText: "",
    ctaLink: "",
  },
  howItWorks: [],
  testimonials: [],
  aboutShort: { title: "", text: "", image: "" },
  faq: [],
  sections: [
    { key: "hero", label: "Banner principal", active: false, order: 1 },
    { key: "benefits", label: "Benefícios", active: false, order: 2 },
    { key: "categories", label: "Compre por categoria", active: false, order: 3 },
    { key: "objectives", label: "Compre por objetivo", active: false, order: 4 },
    { key: "featured", label: "Produtos em destaque", active: false, order: 5 },
    { key: "kits", label: "Vitrine de kits", active: false, order: 6 },
    { key: "midBanner", label: "Banner promocional", active: false, order: 7 },
    { key: "howItWorks", label: "Como funciona", active: false, order: 8 },
    { key: "testimonials", label: "Depoimentos", active: false, order: 9 },
    { key: "about", label: "Sobre a marca", active: false, order: 10 },
    { key: "faq", label: "Perguntas frequentes", active: false, order: 11 },
  ],
  seoTitle: "agô",
  seoDescription: "",
};

export const institutional: InstitutionalContent = {
  about: "",
  howItWorks: "",
  deliveryArea: "",
  privacy: "",
  terms: "",
  paymentMethods: "",
  support: { email: "", phone: "", whatsapp: "", hours: "" },
  socials: { instagram: "", facebook: "", tiktok: "", youtube: "" },
  freeShippingMin: 0,
};

export const appearance: AppearanceConfig = {
  brandName: "agô",
  slogan: "",
  logoText: "agô",
  primary: "#F5A623",
  secondary: "#2E6B5F",
  background: "#FFF6E6",
  buttonColor: "#F5A623",
  fontDisplay: "Nunito Sans",
  fontSans: "Manrope",
  radius: "0.875",
  buttonStyle: "pill",
};
