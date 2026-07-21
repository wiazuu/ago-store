export type ID = string;

export interface Category {
  id: ID;
  name: string;
  slug: string;
  description: string;
  image: string;
  color: string; // css color token or hex
  order: number;
  active: boolean;
  seoTitle?: string;
  seoDescription?: string;
  seoText?: string;
}

export interface Objective {
  id: ID;
  name: string;
  slug: string;
  description: string;
  icon: string; // lucide name
  image: string;
  order: number;
  active: boolean;
  productIds: ID[];
}

export interface Product {
  id: ID;
  name: string;
  slug: string;
  categoryId: ID;
  objectiveIds: ID[];
  image: string;
  gallery?: string[];
  shortDescription: string;
  description: string;
  price: number;
  promoPrice?: number;
  stock: number;
  weightG: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  ingredients: string;
  allergens: string;
  preparation: string;
  validity: string;
  storage: string;
  tags: string[]; // ex: proteico, low carb
  badge?: "mais-vendido" | "novo" | "promo" | "chef" | "fit" | "";
  active: boolean;
  featured: boolean;
  isNew: boolean;
  bestSeller: boolean;
  seoTitle?: string;
  seoDescription?: string;
}

export interface Kit {
  id: ID;
  name: string;
  slug: string;
  description: string;
  image: string;
  items: { productId: ID; qty: number }[];
  price: number;
  discountPct: number;
  categoryId?: ID;
  active: boolean;
}

export interface Banner {
  id: ID;
  location: "home-hero" | "home-mid" | "category" | "objective";
  title: string;
  subtitle: string;
  image: string;
  link: string;
  ctaText: string;
  ctaSecondaryText?: string;
  startDate?: string;
  endDate?: string;
  active: boolean;
  order: number;
}

export interface Coupon {
  id: ID;
  code: string;
  type: "percent" | "fixed";
  value: number;
  validUntil: string;
  minSubtotal: number;
  usageLimit: number;
  used: number;
  active: boolean;
}

export interface Order {
  id: ID;
  number: string;
  customer: { name: string; email: string; phone: string };
  address: string;
  payment: "credit-card" | "pix" | "boleto" | "stripe";
  items: { productId: ID; name: string; qty: number; price: number }[];
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  status: "recebido" | "em-separacao" | "enviado" | "entregue" | "cancelado";
  createdAt: string;
}

export interface Testimonial {
  id: ID;
  name: string;
  role: string;
  text: string;
  rating: number;
  avatar?: string;
}
export interface FaqItem {
  id: ID;
  question: string;
  answer: string;
}
export interface Benefit {
  id: ID;
  icon: string;
  title: string;
  description: string;
}
export interface HowStep {
  id: ID;
  step: number;
  title: string;
  description: string;
  icon: string;
}

export interface HomeConfig {
  promoBar: { active: boolean; text: string; link: string };
  hero: {
    title: string;
    subtitle: string;
    image: string;
    ctaText: string;
    ctaLink: string;
    ctaSecondaryText: string;
    ctaSecondaryLink: string;
  };
  benefits: Benefit[];
  midBanner: {
    active: boolean;
    title: string;
    subtitle: string;
    image: string;
    ctaText: string;
    ctaLink: string;
  };
  howItWorks: HowStep[];
  testimonials: Testimonial[];
  aboutShort: { title: string; text: string; image: string };
  faq: FaqItem[];
  sections: { key: string; label: string; active: boolean; order: number }[];
  seoTitle: string;
  seoDescription: string;
}

export interface InstitutionalContent {
  about: string;
  howItWorks: string;
  deliveryArea: string;
  privacy: string;
  terms: string;
  paymentMethods: string;
  support: { email: string; phone: string; whatsapp: string; hours: string };
  socials: { instagram: string; facebook: string; tiktok: string; youtube: string };
  freeShippingMin: number;
}

export interface AppearanceConfig {
  brandName: string;
  slogan: string;
  logoText: string; // rendered word-mark since brand is text-based
  logoUrl?: string;
  faviconUrl?: string;
  primary: string; // oklch string
  secondary: string;
  background: string;
  buttonColor: string;
  fontDisplay: string;
  fontSans: string;
  radius: string; // rem
  buttonStyle: "rounded" | "pill" | "square";
}
