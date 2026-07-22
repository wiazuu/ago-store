import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  productId: string;
  name: string;
  image: string;
  price: number;
  qty: number;
  selections?: { productId: string; name: string; qty: number }[];
  subscriptionInterval?: "weekly" | "monthly" | "quarterly";
}

interface ShopState {
  items: CartItem[];
  drawerOpen: boolean;
  coupon: string | null;
  cep: string;
  authed: boolean;
  adminAuthed: boolean;
  favoriteIds: string[];

  add: (i: Omit<CartItem, "qty"> & { qty?: number }) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  setCoupon: (c: string | null) => void;
  setCep: (c: string) => void;
  setAuth: (v: boolean) => void;
  setAdminAuth: (v: boolean) => void;
  setFavorites: (ids: string[]) => void;
}

export const useShopStore = create<ShopState>()(
  persist(
    (set) => ({
      items: [],
      drawerOpen: false,
      coupon: null,
      cep: "",
      authed: false,
      adminAuthed: false,
      favoriteIds: [],
      add: (i) =>
        set((s) => {
          const existing = s.items.find((x) => x.productId === i.productId);
          if (existing)
            return {
              items: s.items.map((x) =>
                x.productId === i.productId ? { ...x, qty: Math.min(20, x.qty + (i.qty ?? 1)) } : x,
              ),
              drawerOpen: true,
            };
          return {
            items: [...s.items, { ...i, qty: Math.min(20, Math.max(1, i.qty ?? 1)) }],
            drawerOpen: true,
          };
        }),
      remove: (id) => set((s) => ({ items: s.items.filter((x) => x.productId !== id) })),
      setQty: (id, qty) =>
        set((s) => ({
          items:
            qty <= 0
              ? s.items.filter((x) => x.productId !== id)
              : s.items.map((x) => (x.productId === id ? { ...x, qty: Math.min(20, qty) } : x)),
        })),
      clear: () => set({ items: [], coupon: null }),
      openDrawer: () => set({ drawerOpen: true }),
      closeDrawer: () => set({ drawerOpen: false }),
      toggleDrawer: () => set((s) => ({ drawerOpen: !s.drawerOpen })),
      setCoupon: (c) => set({ coupon: c }),
      setCep: (c) => set({ cep: c }),
      setAuth: (v) => set({ authed: v }),
      setAdminAuth: (v) => set({ adminAuthed: v }),
      setFavorites: (ids) => set({ favoriteIds: ids }),
    }),
    { name: "ago-shop-v1" },
  ),
);

export const useCartCount = () => useShopStore((s) => s.items.reduce((a, b) => a + b.qty, 0));
export const useCartSubtotal = () =>
  useShopStore((s) => s.items.reduce((a, b) => a + b.qty * b.price, 0));
