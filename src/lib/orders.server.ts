import "@tanstack/react-start/server-only";
import { and, desc, eq, gte, isNotNull, lte, ne, sql } from "drizzle-orm";
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

export const PAYMENT_TIMEOUT_MINUTES = 15;
const PAYMENT_TIMEOUT_MS = PAYMENT_TIMEOUT_MINUTES * 60 * 1000;
let expirationSweep: Promise<{ cancelled: number; paid: number }> | null = null;

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
  const result = await getDatabase().transaction(async (tx) => {
    const inserted = await tx
      .insert(stripeEvents)
      .values({ id: event.id, type: event.type })
      .onConflictDoNothing()
      .returning({ id: stripeEvents.id });
    if (!inserted.length) return { changed: false, paid: false };
    const [current] = await tx.select().from(shopOrders).where(eq(shopOrders.id, orderId)).limit(1);
    if (
      current?.paymentStatus === "refunded" ||
      current?.status === "reembolsado" ||
      current?.status === "cancelado"
    )
      return { changed: false, paid: false };
    const paid =
      event.paymentStatus === "paid" ||
      event.paymentStatus === "no_payment_required" ||
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
    return { changed: true, paid: paid && current?.paymentStatus !== "paid" };
  });
  if (!result.changed) return;
  if (result.paid) {
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

export async function reconcileStripeCheckoutSession(session: {
  id: string;
  client_reference_id: string | null;
  payment_status: string;
}) {
  if (!hasDatabase() || !session.client_reference_id) return null;
  if (!["paid", "no_payment_required"].includes(session.payment_status)) return null;

  const orderId = session.client_reference_id;
  const result = await getDatabase().transaction(async (tx) => {
    const [current] = await tx.select().from(shopOrders).where(eq(shopOrders.id, orderId)).limit(1);
    if (!current) return null;
    if (current.stripeSessionId && current.stripeSessionId !== session.id) return null;
    if (
      current.paymentStatus === "refunded" ||
      current.paymentStatus === "expired" ||
      current.status === "reembolsado" ||
      current.status === "cancelado"
    )
      return { order: current, changed: false };
    if (current.paymentStatus === "paid") return { order: current, changed: false };

    const [order] = await tx
      .update(shopOrders)
      .set({
        stripeSessionId: session.id,
        paymentStatus: "paid",
        status: "recebido",
        paidAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(shopOrders.id, orderId))
      .returning();
    if (!order) return null;
    await tx.insert(orderStatusHistory).values({
      orderId,
      status: "recebido",
      actorType: "stripe",
      note: "stripe-session-reconciliation",
    });
    return { order, changed: true };
  });

  if (result?.changed) {
    await sendOrderStatusEmail(result.order, "paid");
    await sendNewOrderAdminEmail(result.order);
  }
  return result?.order ?? null;
}

export async function expireStalePendingOrders() {
  if (!hasDatabase()) return { cancelled: 0, paid: 0 };
  if (expirationSweep) return expirationSweep;

  expirationSweep = (async () => {
    const db = getDatabase();
    const cutoff = new Date(Date.now() - PAYMENT_TIMEOUT_MS);
    const pending = await db
      .select()
      .from(shopOrders)
      .where(
        and(
          eq(shopOrders.paymentStatus, "unpaid"),
          eq(shopOrders.status, "aguardando-pagamento"),
          lte(shopOrders.createdAt, cutoff),
        ),
      )
      .orderBy(shopOrders.createdAt)
      .limit(100);
    let cancelled = 0;
    let paid = 0;

    for (const pendingOrder of pending) {
      if (pendingOrder.stripeSessionId) {
        try {
          let session = await getStripe().checkout.sessions.retrieve(pendingOrder.stripeSessionId);
          if (["paid", "no_payment_required"].includes(session.payment_status)) {
            await reconcileStripeCheckoutSession(session);
            paid++;
            continue;
          }
          if (session.status === "open") {
            session = await getStripe().checkout.sessions.expire(session.id);
            if (["paid", "no_payment_required"].includes(session.payment_status)) {
              await reconcileStripeCheckoutSession(session);
              paid++;
              continue;
            }
          }
          if (session.status !== "expired") continue;
        } catch (error) {
          console.error("ago.checkout.expiration_failed", {
            orderId: pendingOrder.id,
            sessionId: pendingOrder.stripeSessionId,
            error: error instanceof Error ? error.message : String(error),
          });
          continue;
        }
      }

      const cancelledOrder = await db.transaction(async (tx) => {
        const [row] = await tx
          .update(shopOrders)
          .set({
            status: "cancelado",
            paymentStatus: "expired",
            completedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(shopOrders.id, pendingOrder.id),
              eq(shopOrders.paymentStatus, "unpaid"),
              eq(shopOrders.status, "aguardando-pagamento"),
            ),
          )
          .returning();
        if (!row) return null;
        await tx.insert(orderStatusHistory).values({
          orderId: row.id,
          status: "cancelado",
          actorType: "system",
          note: `payment-timeout-${PAYMENT_TIMEOUT_MINUTES}-minutes`,
        });
        return row;
      });
      if (cancelledOrder) {
        cancelled++;
        await sendOrderStatusEmail(cancelledOrder, "cancelled");
      }
    }
    return { cancelled, paid };
  })();

  try {
    return await expirationSweep;
  } finally {
    expirationSweep = null;
  }
}

async function reconcileRecentStripePayments() {
  if (!hasDatabase()) return;
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const pending = await getDatabase()
    .select({ stripeSessionId: shopOrders.stripeSessionId })
    .from(shopOrders)
    .where(
      and(
        ne(shopOrders.paymentStatus, "paid"),
        ne(shopOrders.paymentStatus, "refunded"),
        ne(shopOrders.paymentStatus, "expired"),
        isNotNull(shopOrders.stripeSessionId),
        gte(shopOrders.createdAt, since),
      ),
    )
    .orderBy(desc(shopOrders.createdAt))
    .limit(20);

  await Promise.allSettled(
    pending.map(async ({ stripeSessionId }) => {
      if (!stripeSessionId) return;
      const session = await getStripe().checkout.sessions.retrieve(stripeSessionId);
      await reconcileStripeCheckoutSession(session);
    }),
  );
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
export async function applyStripeRefundEvent(input: {
  id: string;
  type: string;
  orderId: string | null;
  refundStatus?: string | null;
}) {
  if (!hasDatabase() || !input.orderId) return;
  if (input.refundStatus === "failed" || input.refundStatus === "canceled") return;
  const orderId = input.orderId;
  const result = await getDatabase().transaction(async (tx) => {
    const inserted = await tx
      .insert(stripeEvents)
      .values({ id: input.id, type: input.type })
      .onConflictDoNothing()
      .returning({ id: stripeEvents.id });
    if (!inserted.length) return null;
    const [current] = await tx.select().from(shopOrders).where(eq(shopOrders.id, orderId)).limit(1);
    if (!current || current.paymentStatus === "refunded") return null;
    const [order] = await tx
      .update(shopOrders)
      .set({
        status: "reembolsado",
        paymentStatus: "refunded",
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(shopOrders.id, orderId))
      .returning();
    if (!order) return null;
    await tx.insert(orderStatusHistory).values({
      orderId,
      status: "reembolsado",
      actorType: "stripe",
      note: `${input.type}:${input.refundStatus || "created"}`,
    });
    return order;
  });
  if (result) await sendOrderStatusEmail(result, "refunded");
}
export async function listOrders() {
  if (!hasDatabase()) return [];
  await expireStalePendingOrders();
  await reconcileRecentStripePayments();
  return getDatabase()
    .select()
    .from(shopOrders)
    .where(and(ne(shopOrders.status, "cancelado"), ne(shopOrders.status, "reembolsado")))
    .orderBy(desc(shopOrders.createdAt))
    .limit(500);
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
        completedAt: ["entregue", "cancelado", "reembolsado"].includes(status) ? new Date() : null,
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

type PaymentExpirationRuntime = typeof globalThis & {
  __agoPaymentExpirationTimer?: ReturnType<typeof setInterval>;
};
const paymentExpirationRuntime = globalThis as PaymentExpirationRuntime;
if (!paymentExpirationRuntime.__agoPaymentExpirationTimer) {
  const timer = setInterval(() => {
    void expireStalePendingOrders().catch((error) =>
      console.error(
        "ago.checkout.expiration_sweep_failed",
        error instanceof Error ? error.message : error,
      ),
    );
  }, 60_000);
  timer.unref?.();
  paymentExpirationRuntime.__agoPaymentExpirationTimer = timer;
}
