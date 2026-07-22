import "@tanstack/react-start/server-only";
import { and, gte, lte, ne } from "drizzle-orm";
import { deliveryCalendarDays, shopOrders } from "@/db/schema";
import { getDatabase, hasDatabase } from "@/db/client.server";

export type FulfillmentDay = {
  day: string;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  capacity: number;
  reserved: number;
  available: number;
  cutoffAt: string | null;
  note: string | null;
};

const TZ = "America/Manaus";
const dayKey = (date: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
const addDays = (date: Date, amount: number) => new Date(date.getTime() + amount * 86_400_000);

function defaultDay(day: string): Omit<FulfillmentDay, "reserved" | "available"> {
  const weekday = new Date(`${day}T12:00:00-04:00`).getDay();
  return {
    day,
    deliveryEnabled: weekday !== 0,
    pickupEnabled: weekday !== 0,
    capacity: 80,
    cutoffAt: `${day}T00:00:00-04:00`,
    note: weekday === 0 ? "Produção fechada aos domingos" : null,
  };
}

function itemCount(value: unknown) {
  return Array.isArray(value)
    ? value.reduce(
        (sum, item) =>
          sum +
          (typeof item === "object" && item && "qty" in item
            ? Number((item as { qty?: number }).qty) || 0
            : 0),
        0,
      )
    : 0;
}

export async function listFulfillmentDays(days = 45): Promise<FulfillmentDay[]> {
  const start = dayKey(addDays(new Date(), 1));
  const end = dayKey(addDays(new Date(), days));
  const overrides = hasDatabase()
    ? await getDatabase()
        .select()
        .from(deliveryCalendarDays)
        .where(and(gte(deliveryCalendarDays.day, start), lte(deliveryCalendarDays.day, end)))
    : [];
  const overrideByDay = new Map(overrides.map((row) => [row.day, row]));
  const orders = hasDatabase()
    ? await getDatabase()
        .select({
          day: shopOrders.deliveryDate,
          items: shopOrders.items,
          paymentStatus: shopOrders.paymentStatus,
          updatedAt: shopOrders.updatedAt,
        })
        .from(shopOrders)
        .where(
          and(
            gte(shopOrders.deliveryDate, start),
            lte(shopOrders.deliveryDate, end),
            ne(shopOrders.status, "cancelado"),
          ),
        )
    : [];
  const reserved = new Map<string, number>();
  for (const order of orders)
    if (
      order.day &&
      (order.paymentStatus === "paid" ||
        (order.paymentStatus === "unpaid" &&
          order.updatedAt.getTime() > Date.now() - 60 * 60 * 1000))
    )
      reserved.set(order.day, (reserved.get(order.day) || 0) + itemCount(order.items));

  return Array.from({ length: days }, (_, index) => dayKey(addDays(new Date(), index + 1))).map(
    (day) => {
      const base = defaultDay(day);
      const override = overrideByDay.get(day);
      const row = override
        ? {
            day,
            deliveryEnabled: override.deliveryEnabled,
            pickupEnabled: override.pickupEnabled,
            capacity: override.capacity,
            cutoffAt: override.cutoffAt?.toISOString() || null,
            note: override.note,
          }
        : base;
      const used = reserved.get(day) || 0;
      const cutoffPassed = row.cutoffAt ? new Date(row.cutoffAt).getTime() <= Date.now() : false;
      return {
        ...row,
        deliveryEnabled: row.deliveryEnabled && !cutoffPassed && used < row.capacity,
        pickupEnabled: row.pickupEnabled && !cutoffPassed && used < row.capacity,
        reserved: used,
        available: Math.max(0, row.capacity - used),
      };
    },
  );
}

export async function assertFulfillmentAvailable(input: {
  day: string;
  type: "delivery" | "pickup";
  quantity: number;
  city: string;
  state: string;
}) {
  if (
    input.type === "delivery" &&
    (input.city.trim().toLocaleLowerCase("pt-BR") !== "manaus" || input.state !== "AM")
  )
    throw new Error("As entregas estão disponíveis somente em Manaus/AM.");
  const selected = (await listFulfillmentDays(60)).find((day) => day.day === input.day);
  if (!selected) throw new Error("Escolha uma data disponível nos próximos 60 dias.");
  if (input.type === "delivery" && !selected.deliveryEnabled)
    throw new Error("A entrega não está disponível nessa data.");
  if (input.type === "pickup" && !selected.pickupEnabled)
    throw new Error("A retirada não está disponível nessa data.");
  if (input.quantity > selected.available)
    throw new Error("Essa data atingiu a capacidade de produção. Escolha outro dia.");
}

export async function upsertFulfillmentDay(input: {
  day: string;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  capacity: number;
  cutoffAt?: string | null;
  note?: string | null;
}) {
  const [row] = await getDatabase()
    .insert(deliveryCalendarDays)
    .values({
      day: input.day,
      deliveryEnabled: input.deliveryEnabled,
      pickupEnabled: input.pickupEnabled,
      capacity: input.capacity,
      cutoffAt: input.cutoffAt ? new Date(input.cutoffAt) : null,
      note: input.note || null,
    })
    .onConflictDoUpdate({
      target: deliveryCalendarDays.day,
      set: {
        deliveryEnabled: input.deliveryEnabled,
        pickupEnabled: input.pickupEnabled,
        capacity: input.capacity,
        cutoffAt: input.cutoffAt ? new Date(input.cutoffAt) : null,
        note: input.note || null,
        updatedAt: new Date(),
      },
    })
    .returning();
  return row;
}
