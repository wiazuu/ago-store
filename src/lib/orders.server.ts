import "@tanstack/react-start/server-only";
import { desc, eq, sql } from "drizzle-orm";
import {
  auditLogs,
  customerSubscriptions,
  customerUsers,
  loyaltyTransactions,
  orderStatusHistory,
  shopOrders,
  stripeEvents,
} from "@/db/schema";
import { getDatabase, hasDatabase } from "@/db/client.server";
import type { CheckoutRequest } from "@/lib/checkout-schema";
import type { CheckoutCatalogLine } from "@/lib/checkout-business";
import {
  sendNewOrderAdminEmail,
  sendOrderStatusEmail,
  sendSubscriptionStatusEmail,
} from "@/lib/email.server";
import { getStripe } from "@/lib/stripe.server";

export async function createPendingOrder(input: {
  id: string;
  customerUserId?: string | null;
  payload: CheckoutRequest;
  lines: CheckoutCatalogLine[];
  summary: {
    subtotal: number;
    shipping: number;
    discount: number;
    total: number;
    coupon?: { code: string } | null;
  };
}) {
  if (!hasDatabase()) return;
  await getDatabase().transaction(async (tx) => {
    const inserted = await tx
      .insert(shopOrders)
      .values({
        id: input.id,
        customerUserId: input.customerUserId || null,
        customer: input.payload.customer,
        delivery: input.payload.delivery,
        items: input.lines,
        subtotalCents: Math.round(input.summary.subtotal * 100),
        shippingCents: Math.round(input.summary.shipping * 100),
        discountCents: Math.round(input.summary.discount * 100),
        totalCents: Math.round(input.summary.total * 100),
        coupon: input.summary.coupon?.code || null,
        fulfillmentType: input.payload.delivery.fulfillmentType,
        deliveryDate: input.payload.delivery.scheduledDate,
        deliveryWindow: input.payload.delivery.deliveryWindow,
        subscriptionInterval: input.payload.subscriptionInterval || null,
      })
      .onConflictDoNothing()
      .returning({ id: shopOrders.id });
    if (inserted.length)
      await tx
        .insert(orderStatusHistory)
        .values({ orderId: input.id, status: "aguardando-pagamento", actorType: "system" });
  });
}
export async function attachStripeSession(id: string, stripeSessionId: string) {
  if (!hasDatabase()) return;
  await getDatabase()
    .update(shopOrders)
    .set({ stripeSessionId, updatedAt: new Date() })
    .where(eq(shopOrders.id, id));
}
export async function applyStripeEvent(event: {
  id: string;
  type: string;
  orderId: string | null;
  sessionId: string;
  paymentStatus?: string | null;
  subscriptionId?: string | null;
}) {
  if (!event.orderId) return;
  if (!hasDatabase()) return;
  const orderId = event.orderId;
  await getDatabase().transaction(async (tx) => {
    const inserted = await tx
      .insert(stripeEvents)
      .values({ id: event.id, type: event.type })
      .onConflictDoNothing()
      .returning({ id: stripeEvents.id });
    if (!inserted.length) return;
    const paid =
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded";
    const failed = event.type === "checkout.session.async_payment_failed";
    const status = paid ? "recebido" : failed ? "pagamento-falhou" : "aguardando-pagamento";
    await tx
      .update(shopOrders)
      .set({
        stripeSessionId: event.sessionId,
        paymentStatus: event.paymentStatus || (paid ? "paid" : failed ? "failed" : "unpaid"),
        status,
        paidAt: paid ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(shopOrders.id, orderId));
    await tx
      .insert(orderStatusHistory)
      .values({ orderId, status, actorType: "stripe", note: event.type })
      .onConflictDoNothing();
    if (paid && event.subscriptionId) {
      const [order] = await tx.select().from(shopOrders).where(eq(shopOrders.id, orderId)).limit(1);
      const firstItem = Array.isArray(order?.items)
        ? (order.items[0] as { productId?: string } | undefined)
        : undefined;
      if (order?.customerUserId && order.subscriptionInterval && firstItem?.productId)
        await tx
          .insert(customerSubscriptions)
          .values({
            userId: order.customerUserId,
            kitId: firstItem.productId,
            interval: order.subscriptionInterval,
            status: "active",
            nextDeliveryDate: order.deliveryDate,
            stripeSubscriptionId: event.subscriptionId,
          })
          .onConflictDoNothing();
    }
  });
  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const [order] = await getDatabase()
      .select()
      .from(shopOrders)
      .where(eq(shopOrders.id, orderId))
      .limit(1);
    if (order) {
      await sendOrderStatusEmail(order, "paid");
      await sendNewOrderAdminEmail(order);
    }
  } else if (event.type === "checkout.session.async_payment_failed") {
    const [order] = await getDatabase()
      .select()
      .from(shopOrders)
      .where(eq(shopOrders.id, orderId))
      .limit(1);
    if (order) await sendOrderStatusEmail(order, "payment_failed");
  }
}
export async function applyStripeSubscriptionEvent(input: {
  id: string;
  type: string;
  subscriptionId: string;
  status: string;
}) {
  if (!hasDatabase()) return;
  await getDatabase().transaction(async (tx) => {
    const inserted = await tx
      .insert(stripeEvents)
      .values({ id: input.id, type: input.type })
      .onConflictDoNothing()
      .returning({ id: stripeEvents.id });
    if (!inserted.length) return;
    const status =
      input.type === "customer.subscription.deleted"
        ? "cancelled"
        : input.status === "active" || input.status === "trialing"
          ? "active"
          : input.status === "paused"
            ? "paused"
            : input.status;
    await tx
      .update(customerSubscriptions)
      .set({ status, updatedAt: new Date() })
      .where(eq(customerSubscriptions.stripeSubscriptionId, input.subscriptionId));
  });
  const [recipient] = await getDatabase()
    .select({
      name: customerUsers.name,
      email: customerUsers.email,
      status: customerSubscriptions.status,
    })
    .from(customerSubscriptions)
    .innerJoin(customerUsers, eq(customerSubscriptions.userId, customerUsers.id))
    .where(eq(customerSubscriptions.stripeSubscriptionId, input.subscriptionId))
    .limit(1);
  if (recipient)
    await sendSubscriptionStatusEmail({
      eventId: input.id,
      to: recipient.email,
      name: recipient.name,
      event:
        input.type === "customer.subscription.deleted"
          ? "cancelled"
          : recipient.status === "paused"
            ? "paused"
            : "resumed",
    });
}
export async function applyStripeInvoiceEvent(input: {
  id: string;
  type: "invoice.upcoming" | "invoice.payment_failed";
  subscriptionId: string | null;
}) {
  if (!hasDatabase() || !input.subscriptionId) return;
  const inserted = await getDatabase()
    .insert(stripeEvents)
    .values({ id: input.id, type: input.type })
    .onConflictDoNothing()
    .returning({ id: stripeEvents.id });
  if (!inserted.length) return;
  const [recipient] = await getDatabase()
    .select({ name: customerUsers.name, email: customerUsers.email })
    .from(customerSubscriptions)
    .innerJoin(customerUsers, eq(customerSubscriptions.userId, customerUsers.id))
    .where(eq(customerSubscriptions.stripeSubscriptionId, input.subscriptionId))
    .limit(1);
  if (recipient)
    await sendSubscriptionStatusEmail({
      eventId: input.id,
      to: recipient.email,
      name: recipient.name,
      event: input.type === "invoice.upcoming" ? "upcoming" : "payment_failed",
    });
}
export async function listOrders() {
  return hasDatabase()
    ? getDatabase().select().from(shopOrders).orderBy(desc(shopOrders.createdAt)).limit(500)
    : [];
}
export async function updateOrderStatus(
  id: string,
  status: string,
  actorId: string,
  ipHash: string,
) {
  const allowed = [
    "recebido",
    "em-preparacao",
    "pronto",
    "saiu-para-entrega",
    "entregue",
    "cancelado",
    "reembolsado",
  ];
  if (!allowed.includes(status)) return null;
  if (!hasDatabase()) return null;
  if (status === "reembolsado") {
    const [current] = await getDatabase()
      .select()
      .from(shopOrders)
      .where(eq(shopOrders.id, id))
      .limit(1);
    if (!current?.stripeSessionId || current.paymentStatus !== "paid") return null;
    const session = await getStripe().checkout.sessions.retrieve(current.stripeSessionId);
    const paymentIntent =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id;
    if (!paymentIntent) return null;
    await getStripe().refunds.create(
      { payment_intent: paymentIntent, metadata: { order_id: id, source: "ago_admin" } },
      { idempotencyKey: `${id}:refund` },
    );
  }
  const order = await getDatabase().transaction(async (tx) => {
    const [row] = await tx
      .update(shopOrders)
      .set({
        status,
        paymentStatus: status === "reembolsado" ? "refunded" : undefined,
        completedAt: status === "entregue" ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(shopOrders.id, id))
      .returning();
    if (row) {
      await tx.insert(auditLogs).values({
        actorId,
        action: "order.status",
        entity: "shop_order",
        entityId: id,
        details: { status },
        ipHash,
      });
      await tx
        .insert(orderStatusHistory)
        .values({ orderId: id, status, actorType: "admin", actorId });
      if (status === "entregue" && row.customerUserId) {
        const points = Math.max(1, Math.floor(row.totalCents / 100));
        const earned = await tx
          .insert(loyaltyTransactions)
          .values({
            userId: row.customerUserId,
            orderId: id,
            type: "order_earned",
            points,
            description: `Pedido ${id} entregue`,
          })
          .onConflictDoNothing()
          .returning({ id: loyaltyTransactions.id });
        if (earned.length)
          await tx
            .update(customerUsers)
            .set({
              loyaltyPoints: sql`${customerUsers.loyaltyPoints} + ${points}`,
              updatedAt: new Date(),
            })
            .where(eq(customerUsers.id, row.customerUserId));
      }
    }
    return row || null;
  });
  const emailEvent = (
    {
      "em-preparacao": "preparing",
      pronto: "ready",
      "saiu-para-entrega": "out_for_delivery",
      entregue: "delivered",
      cancelado: "cancelled",
      reembolsado: "refunded",
    } as const
  )[
    status as
      "em-preparacao" | "pronto" | "saiu-para-entrega" | "entregue" | "cancelado" | "reembolsado"
  ];
  if (order && emailEvent) await sendOrderStatusEmail(order, emailEvent);
  return order;
}
