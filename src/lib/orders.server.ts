import "@tanstack/react-start/server-only";
import { desc, eq } from "drizzle-orm";
import { auditLogs, shopOrders, stripeEvents } from "@/db/schema";
import { getDatabase, hasDatabase } from "@/db/client.server";
import type { CheckoutRequest } from "@/lib/checkout-schema";
import type { CheckoutCatalogLine } from "@/lib/checkout-business";
import { sendOrderStatusEmail } from "@/lib/email.server";

export async function createPendingOrder(input: { id: string; payload: CheckoutRequest; lines: CheckoutCatalogLine[]; summary: { subtotal: number; shipping: number; discount: number; total: number; coupon?: { code: string } | null } }) {
  if (!hasDatabase()) return;
  await getDatabase().insert(shopOrders).values({ id: input.id, customer: input.payload.customer, delivery: input.payload.delivery, items: input.lines, subtotalCents: Math.round(input.summary.subtotal * 100), shippingCents: Math.round(input.summary.shipping * 100), discountCents: Math.round(input.summary.discount * 100), totalCents: Math.round(input.summary.total * 100), coupon: input.summary.coupon?.code || null }).onConflictDoNothing();
}
export async function attachStripeSession(id: string, stripeSessionId: string) { if (!hasDatabase()) return; await getDatabase().update(shopOrders).set({ stripeSessionId, updatedAt: new Date() }).where(eq(shopOrders.id, id)); }
export async function applyStripeEvent(event: { id: string; type: string; orderId: string | null; sessionId: string; paymentStatus?: string | null }) {
  if (!event.orderId) return;
  if (!hasDatabase()) return;
  const orderId = event.orderId;
  await getDatabase().transaction(async (tx) => {
    const inserted = await tx.insert(stripeEvents).values({ id: event.id, type: event.type }).onConflictDoNothing().returning({ id: stripeEvents.id });
    if (!inserted.length) return;
    const paid = event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded"; const failed = event.type === "checkout.session.async_payment_failed";
    await tx.update(shopOrders).set({ stripeSessionId: event.sessionId, paymentStatus: event.paymentStatus || (paid ? "paid" : failed ? "failed" : "unpaid"), status: paid ? "recebido" : failed ? "pagamento-falhou" : "aguardando-pagamento", updatedAt: new Date() }).where(eq(shopOrders.id, orderId));
  });
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const [order] = await getDatabase().select().from(shopOrders).where(eq(shopOrders.id, orderId)).limit(1);
    if (order) await sendOrderStatusEmail(order, "paid");
  }
}
export async function listOrders() { return hasDatabase() ? getDatabase().select().from(shopOrders).orderBy(desc(shopOrders.createdAt)).limit(500) : []; }
export async function updateOrderStatus(id: string, status: string, actorId: string, ipHash: string) {
  const allowed = ["recebido", "em-separacao", "saiu-para-entrega", "enviado", "entregue", "cancelado"]; if (!allowed.includes(status)) return null;
  if (!hasDatabase()) return null;
  const order = await getDatabase().transaction(async (tx) => { const [row] = await tx.update(shopOrders).set({ status, updatedAt: new Date() }).where(eq(shopOrders.id, id)).returning(); if (row) await tx.insert(auditLogs).values({ actorId, action: "order.status", entity: "shop_order", entityId: id, details: { status }, ipHash }); return row || null; });
  const emailEvent = ({ "em-separacao": "preparing", "saiu-para-entrega": "out_for_delivery", entregue: "delivered", cancelado: "cancelled" } as const)[status as "em-separacao" | "saiu-para-entrega" | "entregue" | "cancelado"];
  if (order && emailEvent) await sendOrderStatusEmail(order, emailEvent);
  return order;
}
