import "@tanstack/react-start/server-only";
import { priceOf } from "@/lib/format";
import { calculateOrderSummary } from "@/lib/commerce";
import type { CheckoutRequest } from "@/lib/checkout-schema";
import { readAdminContent } from "@/lib/admin-content.server";
import { listEmporiumProducts } from "@/lib/emporium.server";

export type CheckoutCatalogLine = {
  productId: string;
  name: string;
  description: string;
  image: string;
  qty: number;
  unitPrice: number;
};

export async function buildVerifiedCheckout(payload: CheckoutRequest) {
  const { data } = await readAdminContent();
  const emporium = await listEmporiumProducts();
  const catalog = new Map([
    ...data.products
      .filter((product) => product.active)
      .map(
        (product) =>
          [
            product.id,
            {
              name: product.name,
              description: product.shortDescription,
              image: product.image,
              unitPrice: priceOf(product),
              stock: product.stock,
            },
          ] as const,
      ),
    ...data.kits
      .filter((kit) => kit.active)
      .map(
        (kit) =>
          [
            kit.id,
            {
              name: kit.name,
              description: kit.description,
              image: kit.image,
              unitPrice: kit.price,
              stock: 20,
            },
          ] as const,
      ),
    ...emporium.map(
      (product) =>
        [
          `emporium:${product.id}`,
          {
            name: product.name,
            description: product.shortDescription,
            image: product.image,
            unitPrice: product.priceCents / 100,
            stock: product.stock,
          },
        ] as const,
    ),
  ]);
  const merged = new Map<string, number>();
  for (const item of payload.items) {
    merged.set(item.productId, (merged.get(item.productId) ?? 0) + item.qty);
  }

  const lines: CheckoutCatalogLine[] = [];
  for (const [productId, qty] of merged) {
    const item = catalog.get(productId);
    if (!item) throw new Error(`O item ${productId} não está disponível.`);
    if (qty > item.stock) throw new Error(`Estoque insuficiente para ${item.name}.`);
    lines.push({ productId, qty, ...item });
  }

  const summary = calculateOrderSummary({
    lines,
    couponCode: payload.coupon,
    coupons: data.coupons,
    freeShippingMin: data.institutional.freeShippingMin,
  });

  if (payload.coupon && summary.error) throw new Error(summary.error);
  return { lines, summary, orderId: `ago_${payload.attemptId}` };
}
