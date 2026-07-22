import "@tanstack/react-start/server-only";
import { desc } from "drizzle-orm";
import { auditLogs, customerUsers, emailDeliveries, shopOrders } from "@/db/schema";
import { getDatabase } from "@/db/client.server";

type Line = {
  productId?: string;
  name?: string;
  qty?: number;
  unitPrice?: number;
  selections?: { productId?: string; name?: string; qty?: number }[];
};
const lines = (value: unknown): Line[] =>
  Array.isArray(value)
    ? value.filter((item): item is Line => Boolean(item && typeof item === "object"))
    : [];
const dateKey = (value: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Manaus" }).format(value);

export async function getAdminOperations() {
  const db = getDatabase();
  const [orders, customers, audits, emails] = await Promise.all([
    db.select().from(shopOrders).orderBy(desc(shopOrders.createdAt)).limit(1000),
    db
      .select({
        id: customerUsers.id,
        name: customerUsers.name,
        email: customerUsers.email,
        phone: customerUsers.phone,
        active: customerUsers.active,
        createdAt: customerUsers.createdAt,
      })
      .from(customerUsers)
      .orderBy(desc(customerUsers.createdAt))
      .limit(1000),
    db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(300),
    db.select().from(emailDeliveries).orderBy(desc(emailDeliveries.createdAt)).limit(300),
  ]);
  const paid = orders.filter(
    (order) =>
      order.paymentStatus === "paid" && !["cancelado", "reembolsado"].includes(order.status),
  );
  const today = dateKey(new Date());
  const production = new Map<string, { productId: string; name: string; qty: number }>();
  for (const order of paid.filter(
    (item) => item.deliveryDate && item.deliveryDate >= today && item.status !== "entregue",
  ))
    for (const item of lines(order.items)) {
      const productionLines = item.selections?.length
        ? item.selections.map((selected) => ({
            ...selected,
            qty: Number(selected.qty || 0) * Number(item.qty || 1),
          }))
        : [item];
      for (const selected of productionLines) {
        const key = `${order.deliveryDate}:${selected.productId || selected.name}`;
        const current = production.get(key);
        production.set(key, {
          productId: selected.productId || "",
          name: selected.name || "Item",
          qty: (current?.qty || 0) + Number(selected.qty || 0),
        });
      }
    }
  const customerTotals = new Map<
    string,
    { orders: number; spentCents: number; lastOrderAt: string | null }
  >();
  for (const order of paid)
    if (order.customerUserId) {
      const current = customerTotals.get(order.customerUserId) || {
        orders: 0,
        spentCents: 0,
        lastOrderAt: null,
      };
      current.orders++;
      current.spentCents += order.totalCents;
      current.lastOrderAt ||= order.createdAt.toISOString();
      customerTotals.set(order.customerUserId, current);
    }
  return {
    metrics: {
      revenueCents: paid.reduce((sum, order) => sum + order.totalCents, 0),
      paidOrders: paid.length,
      todayOrders: paid.filter((order) => dateKey(order.createdAt) === today).length,
      averageTicketCents: paid.length
        ? Math.round(paid.reduce((sum, order) => sum + order.totalCents, 0) / paid.length)
        : 0,
      activeCustomers: customers.filter((customer) => customer.active).length,
      pendingOrders: paid.filter(
        (order) => !["entregue", "cancelado", "reembolsado"].includes(order.status),
      ).length,
    },
    orders,
    production: Array.from(production.entries())
      .map(([key, item]) => ({ day: key.split(":")[0], ...item }))
      .sort((a, b) => a.day.localeCompare(b.day) || b.qty - a.qty),
    customers: customers.map((customer) => ({
      ...customer,
      ...(customerTotals.get(customer.id) || { orders: 0, spentCents: 0, lastOrderAt: null }),
    })),
    audits,
    emails,
  };
}
