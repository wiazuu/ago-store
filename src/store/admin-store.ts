import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  categories as seedCategories,
  objectives as seedObjectives,
  products as seedProducts,
  kits as seedKits,
  banners as seedBanners,
  coupons as seedCoupons,
  orders as seedOrders,
  homeConfig as seedHome,
  institutional as seedInstitutional,
  appearance as seedAppearance,
} from "@/data/mock";
import type {
  Category,
  Objective,
  Product,
  Kit,
  Banner,
  Coupon,
  Order,
  HomeConfig,
  InstitutionalContent,
  AppearanceConfig,
} from "@/data/types";

export interface AdminData {
  categories: Category[];
  objectives: Objective[];
  products: Product[];
  kits: Kit[];
  banners: Banner[];
  coupons: Coupon[];
  orders: Order[];
  home: HomeConfig;
  institutional: InstitutionalContent;
  appearance: AppearanceConfig;
}

export type PublicAdminData = Pick<
  AdminData,
  | "categories"
  | "objectives"
  | "products"
  | "kits"
  | "banners"
  | "home"
  | "institutional"
  | "appearance"
>;

interface AdminState extends AdminData {
  // generic setters
  set: <K extends keyof AdminData>(k: K, v: AdminData[K]) => void;
  replaceData: (data: AdminData) => void;
  applyPublicData: (data: PublicAdminData) => void;

  // product ops
  upsertProduct: (p: Product) => void;
  deleteProduct: (id: string) => void;

  upsertCategory: (c: Category) => void;
  deleteCategory: (id: string) => void;

  upsertObjective: (o: Objective) => void;
  deleteObjective: (id: string) => void;

  upsertKit: (k: Kit) => void;
  deleteKit: (id: string) => void;

  upsertBanner: (b: Banner) => void;
  deleteBanner: (id: string) => void;

  upsertCoupon: (c: Coupon) => void;
  deleteCoupon: (id: string) => void;

  updateOrderStatus: (id: string, status: Order["status"]) => void;
  recordOrder: (order: Order) => void;
  completePaidOrder: (
    order: Order,
    purchased: { productId: string; qty: number }[],
    couponCode?: string | null,
  ) => void;

  updateHome: (patch: Partial<HomeConfig>) => void;
  updateInstitutional: (patch: Partial<InstitutionalContent>) => void;
  updateAppearance: (patch: Partial<AppearanceConfig>) => void;

  resetAll: () => void;
}

export const initialAdminData: AdminData = {
  categories: seedCategories,
  objectives: seedObjectives,
  products: seedProducts,
  kits: seedKits,
  banners: seedBanners,
  coupons: seedCoupons,
  orders: seedOrders,
  home: seedHome,
  institutional: seedInstitutional,
  appearance: seedAppearance,
};

export const useAdminStore = create<AdminState>()(
  persist(
    (set) => ({
      ...initialAdminData,
      set: (k, v) => set((state) => ({ ...state, [k]: v })),
      replaceData: (data) => set(data),
      applyPublicData: (data) => set(data),
      upsertProduct: (p) =>
        set((s) => ({
          products: s.products.some((x) => x.id === p.id)
            ? s.products.map((x) => (x.id === p.id ? p : x))
            : [p, ...s.products],
        })),
      deleteProduct: (id) => set((s) => ({ products: s.products.filter((x) => x.id !== id) })),
      upsertCategory: (c) =>
        set((s) => ({
          categories: s.categories.some((x) => x.id === c.id)
            ? s.categories.map((x) => (x.id === c.id ? c : x))
            : [...s.categories, c],
        })),
      deleteCategory: (id) => set((s) => ({ categories: s.categories.filter((x) => x.id !== id) })),
      upsertObjective: (o) =>
        set((s) => ({
          objectives: s.objectives.some((x) => x.id === o.id)
            ? s.objectives.map((x) => (x.id === o.id ? o : x))
            : [...s.objectives, o],
        })),
      deleteObjective: (id) =>
        set((s) => ({ objectives: s.objectives.filter((x) => x.id !== id) })),
      upsertKit: (k) =>
        set((s) => ({
          kits: s.kits.some((x) => x.id === k.id)
            ? s.kits.map((x) => (x.id === k.id ? k : x))
            : [...s.kits, k],
        })),
      deleteKit: (id) => set((s) => ({ kits: s.kits.filter((x) => x.id !== id) })),
      upsertBanner: (b) =>
        set((s) => ({
          banners: s.banners.some((x) => x.id === b.id)
            ? s.banners.map((x) => (x.id === b.id ? b : x))
            : [...s.banners, b],
        })),
      deleteBanner: (id) => set((s) => ({ banners: s.banners.filter((x) => x.id !== id) })),
      upsertCoupon: (c) =>
        set((s) => ({
          coupons: s.coupons.some((x) => x.id === c.id)
            ? s.coupons.map((x) => (x.id === c.id ? c : x))
            : [...s.coupons, c],
        })),
      deleteCoupon: (id) => set((s) => ({ coupons: s.coupons.filter((x) => x.id !== id) })),
      updateOrderStatus: (id, status) =>
        set((s) => ({ orders: s.orders.map((o) => (o.id === id ? { ...o, status } : o)) })),
      recordOrder: (order) =>
        set((s) => ({
          orders: s.orders.some((item) => item.id === order.id)
            ? s.orders.map((item) => (item.id === order.id ? order : item))
            : [order, ...s.orders],
        })),
      completePaidOrder: (order, purchased, couponCode) =>
        set((s) => {
          if (s.orders.some((item) => item.id === order.id)) return s;
          const quantities = new Map(purchased.map((item) => [item.productId, item.qty]));
          return {
            orders: [order, ...s.orders],
            products: s.products.map((product) => ({
              ...product,
              stock: Math.max(0, product.stock - (quantities.get(product.id) ?? 0)),
            })),
            coupons: couponCode
              ? s.coupons.map((coupon) =>
                  coupon.code === couponCode ? { ...coupon, used: coupon.used + 1 } : coupon,
                )
              : s.coupons,
          };
        }),
      updateHome: (patch) => set((s) => ({ home: { ...s.home, ...patch } })),
      updateInstitutional: (patch) =>
        set((s) => ({ institutional: { ...s.institutional, ...patch } })),
      updateAppearance: (patch) => set((s) => ({ appearance: { ...s.appearance, ...patch } })),
      resetAll: () => set(initialAdminData),
    }),
    { name: "ago-admin-v1" },
  ),
);

export function getAdminData(state: AdminState = useAdminStore.getState()): AdminData {
  return {
    categories: state.categories,
    objectives: state.objectives,
    products: state.products,
    kits: state.kits,
    banners: state.banners,
    coupons: state.coupons,
    orders: state.orders,
    home: state.home,
    institutional: state.institutional,
    appearance: state.appearance,
  };
}

// Selectors
export const useProducts = () => useAdminStore((s) => s.products);
export const useCategories = () => useAdminStore((s) => s.categories);
export const useObjectives = () => useAdminStore((s) => s.objectives);
export const useKits = () => useAdminStore((s) => s.kits);
export const useHome = () => useAdminStore((s) => s.home);
export const useInstitutional = () => useAdminStore((s) => s.institutional);
export const useAppearance = () => useAdminStore((s) => s.appearance);
