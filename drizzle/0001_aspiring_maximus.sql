CREATE TABLE "shop_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"stripe_session_id" text,
	"customer" jsonb NOT NULL,
	"delivery" jsonb NOT NULL,
	"items" jsonb NOT NULL,
	"subtotal_cents" integer NOT NULL,
	"shipping_cents" integer NOT NULL,
	"discount_cents" integer NOT NULL,
	"total_cents" integer NOT NULL,
	"coupon" text,
	"status" text DEFAULT 'aguardando-pagamento' NOT NULL,
	"payment_status" text DEFAULT 'unpaid' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stripe_events" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "shop_orders_stripe_session_unique" ON "shop_orders" USING btree ("stripe_session_id");--> statement-breakpoint
CREATE INDEX "shop_orders_created_idx" ON "shop_orders" USING btree ("created_at");