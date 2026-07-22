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
  selections?: { productId: string; name: string; qty: number }[];
};
type CatalogItem = Omit<CheckoutCatalogLine, "productId" | "qty" | "selections"> & {
  stock: number;
  enforceStock: boolean;
  allowedProductIds?: string[];
  mealCount?: number;
  subscriptionEligible: boolean;
};

export async function buildVerifiedCheckout(payload: CheckoutRequest) {
  const { data } = await readAdminContent();
  const emporium = await listEmporiumProducts();
  const catalog = new Map<string, CatalogItem>([
    ...data.products
      .filter((product) => product.active && priceOf(product) > 0)
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
              enforceStock: false,
              allowedProductIds: undefined as string[] | undefined,
              mealCount: undefined as number | undefined,
              subscriptionEligible: false,
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
              enforceStock: false,
              allowedProductIds: kit.items.map((entry) => entry.productId),
              mealCount: kit.mealCount || kit.items.reduce((sum, entry) => sum + entry.qty, 0),
              subscriptionEligible: Boolean(kit.subscriptionEligible),
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
            enforceStock: true,
            allowedProductIds: undefined as string[] | undefined,
            mealCount: undefined as number | undefined,
            subscriptionEligible: false,
          },
        ] as const,
    ),
  ]);
  const merged = new Map<string, number>();
  for (const item of payload.items) {
    merged.set(item.productId, (merged.get(item.productId) ?? 0) + item.qty);
  }

  if (payload.subscriptionInterval) {
    const selected = payload.items.length === 1 ? catalog.get(payload.items[0].productId) : null;
    if (!selected?.subscriptionEligible || payload.items[0].qty !== 1)
      throw new Error("Assinaturas devem conter um único kit elegível por checkout.");
  }

  const lines: CheckoutCatalogLine[] = [];
  for (const [productId, qty] of merged) {
    const item = catalog.get(productId);
    if (!item) throw new Error(`O item ${productId} não está disponível.`);
    if (item.enforceStock && qty > item.stock)
      throw new Error(`Estoque insuficiente para ${item.name}.`);
    const requested = payload.items.find((entry) => entry.productId === productId)?.selections;
    let selections: CheckoutCatalogLine["selections"];
    if (requested?.length) {
      if (!item.allowedProductIds?.length)
        throw new Error(`${item.name} não aceita personalização.`);
      const selectedTotal = requested.reduce((sum, entry) => sum + entry.qty, 0);
      if (selectedTotal !== item.mealCount)
        throw new Error(`Escolha exatamente ${item.mealCount} refeições para ${item.name}.`);
      selections = requested.map((entry) => {
        if (!item.allowedProductIds?.includes(entry.productId))
          throw new Error("Uma das refeições não pertence a este kit.");
        const product = data.products.find(
          (candidate) => candidate.id === entry.productId && candidate.active,
        );
        if (!product) throw new Error("Uma das refeições escolhidas não está disponível.");
        return { productId: entry.productId, name: product.name, qty: entry.qty };
      });
    }
    lines.push({ productId, qty, ...item, selections });
  }

  const summary = calculateOrderSummary({
    lines,
    couponCode: payload.coupon,
    coupons: data.coupons,
    freeShippingMin: data.institutional.freeShippingMin,
    fulfillmentType: payload.delivery.fulfillmentType,
  });

  if (payload.coupon && summary.error) throw new Error(summary.error);
  return { lines, summary, orderId: `ago_${payload.attemptId}` };
}
