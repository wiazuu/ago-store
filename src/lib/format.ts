export const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const priceOf = (p: { price: number; promoPrice?: number }) =>
  p.promoPrice && p.promoPrice > 0 ? p.promoPrice : p.price;
export const cx = (...xs: (string | false | null | undefined)[]) => xs.filter(Boolean).join(" ");
