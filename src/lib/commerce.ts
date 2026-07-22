import type { Coupon } from "@/data/types";

export type CommerceLine = {
  productId: string;
  qty: number;
  unitPrice: number;
};

export type CouponResult = {
  coupon: Coupon | null;
  discount: number;
  error: string | null;
};

export type OrderSummary = CouponResult & {
  subtotal: number;
  shipping: number;
  total: number;
};

const money = (value: number) => Math.round(value * 100) / 100;

export function evaluateCoupon(
  code: string | null | undefined,
  subtotal: number,
  coupons: Coupon[],
  today = new Date(),
): CouponResult {
  if (!code?.trim()) return { coupon: null, discount: 0, error: null };

  const coupon = coupons.find((item) => item.code.toUpperCase() === code.trim().toUpperCase());
  if (!coupon || !coupon.active) {
    return { coupon: null, discount: 0, error: "Cupom inválido ou inativo." };
  }

  const endOfValidity = new Date(`${coupon.validUntil}T23:59:59.999`);
  if (Number.isNaN(endOfValidity.getTime()) || today > endOfValidity) {
    return { coupon: null, discount: 0, error: "Este cupom expirou." };
  }
  if (coupon.used >= coupon.usageLimit) {
    return { coupon: null, discount: 0, error: "Este cupom atingiu o limite de usos." };
  }
  if (subtotal < coupon.minSubtotal) {
    return {
      coupon: null,
      discount: 0,
      error: `Pedido mínimo de R$ ${coupon.minSubtotal.toFixed(2).replace(".", ",")} para este cupom.`,
    };
  }

  const rawDiscount = coupon.type === "percent" ? (subtotal * coupon.value) / 100 : coupon.value;
  return { coupon, discount: money(Math.min(subtotal, rawDiscount)), error: null };
}

export function calculateOrderSummary({
  lines,
  couponCode,
  coupons,
  freeShippingMin,
  flatShipping = 15,
  fulfillmentType = "delivery",
  today,
}: {
  lines: CommerceLine[];
  couponCode?: string | null;
  coupons: Coupon[];
  freeShippingMin: number;
  flatShipping?: number;
  fulfillmentType?: "delivery" | "pickup";
  today?: Date;
}): OrderSummary {
  const subtotal = money(lines.reduce((sum, line) => sum + line.unitPrice * line.qty, 0));
  const couponResult = evaluateCoupon(couponCode, subtotal, coupons, today);
  const shipping = subtotal === 0 || fulfillmentType === "pickup" ? 0 : flatShipping;
  const total = money(Math.max(0, subtotal + shipping - couponResult.discount));

  return { subtotal, shipping, total, ...couponResult };
}
