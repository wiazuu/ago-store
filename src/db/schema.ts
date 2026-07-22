import {
  boolean,
  customType,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

export const adminUsers = pgTable(
  "admin_users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    username: text("username").notNull(),
    email: text("email"),
    passwordHash: text("password_hash").notNull(),
    active: boolean("active").notNull().default(true),
    passwordChangedAt: timestamp("password_changed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("admin_users_username_unique").on(table.username),
    uniqueIndex("admin_users_email_unique").on(table.email),
  ],
);

export const adminSessions = pgTable(
  "admin_sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => adminUsers.id, { onDelete: "cascade" }),
    csrfHash: text("csrf_hash").notNull(),
    ipHash: text("ip_hash").notNull(),
    userAgentHash: text("user_agent_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("admin_sessions_user_idx").on(table.userId),
    index("admin_sessions_expiry_idx").on(table.expiresAt),
  ],
);

export const loginLimits = pgTable("login_limits", {
  keyHash: text("key_hash").primaryKey(),
  attempts: integer("attempts").notNull().default(0),
  windowStartedAt: timestamp("window_started_at", { withTimezone: true }).notNull().defaultNow(),
  blockedUntil: timestamp("blocked_until", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const siteContent = pgTable("site_content", {
  key: text("key").primaryKey(),
  data: jsonb("data").notNull(),
  version: integer("version").notNull().default(1),
  updatedBy: uuid("updated_by").references(() => adminUsers.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const mediaAssets = pgTable(
  "media_assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    filename: text("filename").notNull(),
    contentType: text("content_type").notNull(),
    bytes: bytea("bytes").notNull(),
    size: integer("size").notNull(),
    sha256: text("sha256").notNull(),
    uploadedBy: uuid("uploaded_by").references(() => adminUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("media_assets_sha256_unique").on(table.sha256),
    index("media_assets_created_idx").on(table.createdAt),
  ],
);

export const emporiumProducts = pgTable(
  "emporium_products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    category: text("category").notNull(),
    shortDescription: text("short_description").notNull(),
    description: text("description").notNull(),
    image: text("image").notNull(),
    priceCents: integer("price_cents").notNull(),
    stock: integer("stock").notNull().default(0),
    active: boolean("active").notNull().default(true),
    featured: boolean("featured").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("emporium_products_slug_unique").on(table.slug),
    index("emporium_products_active_idx").on(table.active),
  ],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorId: uuid("actor_id").references(() => adminUsers.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    details: jsonb("details"),
    ipHash: text("ip_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("audit_logs_created_idx").on(table.createdAt),
    index("audit_logs_actor_idx").on(table.actorId),
  ],
);

export const shopOrders = pgTable(
  "shop_orders",
  {
    id: text("id").primaryKey(),
    customerUserId: uuid("customer_user_id"),
    stripeSessionId: text("stripe_session_id"),
    customer: jsonb("customer").notNull(),
    delivery: jsonb("delivery").notNull(),
    items: jsonb("items").notNull(),
    subtotalCents: integer("subtotal_cents").notNull(),
    shippingCents: integer("shipping_cents").notNull(),
    discountCents: integer("discount_cents").notNull(),
    totalCents: integer("total_cents").notNull(),
    coupon: text("coupon"),
    fulfillmentType: text("fulfillment_type").notNull().default("delivery"),
    deliveryDate: date("delivery_date"),
    deliveryWindow: text("delivery_window"),
    subscriptionInterval: text("subscription_interval"),
    status: text("status").notNull().default("aguardando-pagamento"),
    paymentStatus: text("payment_status").notNull().default("unpaid"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("shop_orders_stripe_session_unique").on(table.stripeSessionId),
    index("shop_orders_created_idx").on(table.createdAt),
    index("shop_orders_customer_idx").on(table.customerUserId),
    index("shop_orders_delivery_date_idx").on(table.deliveryDate),
  ],
);

export const orderStatusHistory = pgTable(
  "order_status_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => shopOrders.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    note: text("note"),
    actorType: text("actor_type").notNull().default("system"),
    actorId: uuid("actor_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("order_status_history_order_idx").on(table.orderId),
    index("order_status_history_created_idx").on(table.createdAt),
  ],
);

export const deliveryCalendarDays = pgTable(
  "delivery_calendar_days",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    day: date("day").notNull(),
    deliveryEnabled: boolean("delivery_enabled").notNull().default(true),
    pickupEnabled: boolean("pickup_enabled").notNull().default(true),
    capacity: integer("capacity").notNull().default(80),
    cutoffAt: timestamp("cutoff_at", { withTimezone: true }),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("delivery_calendar_days_day_unique").on(table.day)],
);

export const stripeEvents = pgTable("stripe_events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    tokenHash: text("token_hash").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => adminUsers.id, { onDelete: "cascade" }),
    requestIpHash: text("request_ip_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("password_reset_user_idx").on(table.userId),
    index("password_reset_expiry_idx").on(table.expiresAt),
  ],
);

export const emailDeliveries = pgTable(
  "email_deliveries",
  {
    eventKey: text("event_key").primaryKey(),
    type: text("type").notNull(),
    recipient: text("recipient").notNull(),
    orderId: text("order_id").references(() => shopOrders.id, { onDelete: "set null" }),
    status: text("status").notNull().default("pending"),
    providerId: text("provider_id"),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
  },
  (table) => [
    index("email_deliveries_order_idx").on(table.orderId),
    index("email_deliveries_created_idx").on(table.createdAt),
  ],
);

export const customerUsers = pgTable(
  "customer_users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    loyaltyPoints: integer("loyalty_points").notNull().default(0),
    referralCode: text("referral_code"),
    passwordHash: text("password_hash").notNull(),
    active: boolean("active").notNull().default(true),
    passwordChangedAt: timestamp("password_changed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("customer_users_email_unique").on(table.email),
    uniqueIndex("customer_users_referral_unique").on(table.referralCode),
  ],
);

export const customerSessions = pgTable(
  "customer_sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => customerUsers.id, { onDelete: "cascade" }),
    ipHash: text("ip_hash").notNull(),
    userAgentHash: text("user_agent_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("customer_sessions_user_idx").on(table.userId),
    index("customer_sessions_expiry_idx").on(table.expiresAt),
  ],
);

export const customerPasswordResetTokens = pgTable(
  "customer_password_reset_tokens",
  {
    tokenHash: text("token_hash").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => customerUsers.id, { onDelete: "cascade" }),
    requestIpHash: text("request_ip_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("customer_password_reset_user_idx").on(table.userId),
    index("customer_password_reset_expiry_idx").on(table.expiresAt),
  ],
);

export const customerAddresses = pgTable(
  "customer_addresses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => customerUsers.id, { onDelete: "cascade" }),
    label: text("label").notNull().default("Casa"),
    cep: text("cep").notNull(),
    street: text("street").notNull(),
    number: text("number").notNull(),
    complement: text("complement"),
    district: text("district").notNull(),
    city: text("city").notNull().default("Manaus"),
    state: text("state").notNull().default("AM"),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("customer_addresses_user_idx").on(table.userId)],
);

export const customerFavorites = pgTable(
  "customer_favorites",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => customerUsers.id, { onDelete: "cascade" }),
    productId: text("product_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("customer_favorites_user_product_unique").on(table.userId, table.productId),
    index("customer_favorites_user_idx").on(table.userId),
  ],
);

export const customerSubscriptions = pgTable(
  "customer_subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => customerUsers.id, { onDelete: "cascade" }),
    kitId: text("kit_id").notNull(),
    interval: text("interval").notNull().default("weekly"),
    status: text("status").notNull().default("active"),
    nextDeliveryDate: date("next_delivery_date"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("customer_subscriptions_user_idx").on(table.userId),
    uniqueIndex("customer_subscriptions_stripe_unique").on(table.stripeSubscriptionId),
  ],
);

export const loyaltyTransactions = pgTable(
  "loyalty_transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => customerUsers.id, { onDelete: "cascade" }),
    orderId: text("order_id").references(() => shopOrders.id, { onDelete: "set null" }),
    type: text("type").notNull(),
    points: integer("points").notNull(),
    description: text("description").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("loyalty_transactions_user_idx").on(table.userId),
    uniqueIndex("loyalty_transactions_order_type_unique").on(table.orderId, table.type),
  ],
);
