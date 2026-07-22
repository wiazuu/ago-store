import "@tanstack/react-start/server-only";
import { and, desc, eq, or, sql } from "drizzle-orm";
import {
  customerAddresses,
  customerFavorites,
  customerSubscriptions,
  customerUsers,
  orderStatusHistory,
  shopOrders,
} from "@/db/schema";
import { getDatabase } from "@/db/client.server";
import { getStripe } from "@/lib/stripe.server";

export async function getCustomerAccount(user: { userId: string; email: string }) {
  const db = getDatabase();
  await db
    .update(customerUsers)
    .set({ referralCode: `AGO${user.userId.replace(/-/g, "").slice(0, 8).toUpperCase()}` })
    .where(and(eq(customerUsers.id, user.userId), sql`${customerUsers.referralCode} is null`));
  await db
    .update(shopOrders)
    .set({ customerUserId: user.userId })
    .where(
      and(
        sql`${shopOrders.customer}->>'email' = ${user.email}`,
        sql`${shopOrders.customerUserId} is null`,
      ),
    );
  const [profile, orders, addresses, favorites, subscriptions] = await Promise.all([
    db
      .select({
        id: customerUsers.id,
        name: customerUsers.name,
        email: customerUsers.email,
        phone: customerUsers.phone,
        loyaltyPoints: customerUsers.loyaltyPoints,
        referralCode: customerUsers.referralCode,
        createdAt: customerUsers.createdAt,
      })
      .from(customerUsers)
      .where(eq(customerUsers.id, user.userId))
      .limit(1),
    db
      .select()
      .from(shopOrders)
      .where(
        or(
          eq(shopOrders.customerUserId, user.userId),
          sql`${shopOrders.customer}->>'email' = ${user.email}`,
        ),
      )
      .orderBy(desc(shopOrders.createdAt))
      .limit(100),
    db
      .select()
      .from(customerAddresses)
      .where(eq(customerAddresses.userId, user.userId))
      .orderBy(desc(customerAddresses.isDefault), desc(customerAddresses.updatedAt)),
    db
      .select()
      .from(customerFavorites)
      .where(eq(customerFavorites.userId, user.userId))
      .orderBy(desc(customerFavorites.createdAt)),
    db
      .select()
      .from(customerSubscriptions)
      .where(eq(customerSubscriptions.userId, user.userId))
      .orderBy(desc(customerSubscriptions.updatedAt)),
  ]);
  const histories = orders.length
    ? await db
        .select()
        .from(orderStatusHistory)
        .where(
          sql`${orderStatusHistory.orderId} in (${sql.join(
            orders.map((order) => sql`${order.id}`),
            sql`, `,
          )})`,
        )
        .orderBy(desc(orderStatusHistory.createdAt))
    : [];
  return { profile: profile[0] || null, orders, addresses, favorites, subscriptions, histories };
}

export async function saveCustomerAddress(
  userId: string,
  input: {
    id?: string;
    label: string;
    cep: string;
    street: string;
    number: string;
    complement?: string;
    district: string;
    isDefault?: boolean;
  },
) {
  const db = getDatabase();
  if (input.isDefault)
    await db
      .update(customerAddresses)
      .set({ isDefault: false })
      .where(eq(customerAddresses.userId, userId));
  if (input.id) {
    const [row] = await db
      .update(customerAddresses)
      .set({
        label: input.label,
        cep: input.cep,
        street: input.street,
        number: input.number,
        complement: input.complement || null,
        district: input.district,
        city: "Manaus",
        state: "AM",
        isDefault: Boolean(input.isDefault),
        updatedAt: new Date(),
      })
      .where(and(eq(customerAddresses.id, input.id), eq(customerAddresses.userId, userId)))
      .returning();
    return row;
  }
  const [existing] = await db
    .select()
    .from(customerAddresses)
    .where(
      and(
        eq(customerAddresses.userId, userId),
        eq(customerAddresses.cep, input.cep),
        eq(customerAddresses.street, input.street),
        eq(customerAddresses.number, input.number),
      ),
    )
    .limit(1);
  if (existing) {
    const [row] = await db
      .update(customerAddresses)
      .set({
        label: input.label,
        complement: input.complement || null,
        district: input.district,
        isDefault: Boolean(input.isDefault),
        updatedAt: new Date(),
      })
      .where(eq(customerAddresses.id, existing.id))
      .returning();
    return row;
  }
  const [row] = await db
    .insert(customerAddresses)
    .values({
      userId,
      label: input.label,
      cep: input.cep,
      street: input.street,
      number: input.number,
      complement: input.complement || null,
      district: input.district,
      city: "Manaus",
      state: "AM",
      isDefault: Boolean(input.isDefault),
    })
    .returning();
  return row;
}

export async function toggleCustomerFavorite(userId: string, productId: string) {
  const db = getDatabase();
  const [existing] = await db
    .select()
    .from(customerFavorites)
    .where(and(eq(customerFavorites.userId, userId), eq(customerFavorites.productId, productId)))
    .limit(1);
  if (existing) {
    await db.delete(customerFavorites).where(eq(customerFavorites.id, existing.id));
    return false;
  }
  await db.insert(customerFavorites).values({ userId, productId });
  return true;
}

export async function updateCustomerSubscription(
  userId: string,
  id: string,
  status: "active" | "paused" | "cancelled",
) {
  const db = getDatabase();
  const [current] = await db
    .select()
    .from(customerSubscriptions)
    .where(and(eq(customerSubscriptions.id, id), eq(customerSubscriptions.userId, userId)))
    .limit(1);
  if (!current) return null;
  if (current.stripeSubscriptionId) {
    const stripe = getStripe();
    if (status === "cancelled") await stripe.subscriptions.cancel(current.stripeSubscriptionId);
    else
      await stripe.subscriptions.update(current.stripeSubscriptionId, {
        pause_collection: status === "paused" ? { behavior: "void" } : "",
      });
  }
  const [row] = await db
    .update(customerSubscriptions)
    .set({ status, updatedAt: new Date() })
    .where(eq(customerSubscriptions.id, id))
    .returning();
  return row || null;
}

export async function updateCustomerProfile(
  userId: string,
  input: { name: string; phone: string },
) {
  const [row] = await getDatabase()
    .update(customerUsers)
    .set({ name: input.name, phone: input.phone, updatedAt: new Date() })
    .where(eq(customerUsers.id, userId))
    .returning({
      id: customerUsers.id,
      name: customerUsers.name,
      email: customerUsers.email,
      phone: customerUsers.phone,
    });
  return row;
}
