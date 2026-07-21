import { createFileRoute } from "@tanstack/react-router";
import type Stripe from "stripe";
import { checkoutRequestSchema } from "@/lib/checkout-schema";
import { buildVerifiedCheckout } from "@/lib/checkout-business";
import { getStripe } from "@/lib/stripe.server";
import { allowRequest } from "@/lib/rate-limit.server";
import { hasSameOrigin } from "@/lib/security.server";
import { attachStripeSession, createPendingOrder } from "@/lib/orders.server";

export const Route = createFileRoute("/api/checkout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          if (!hasSameOrigin(request)) return Response.json({ error: "Origem não autorizada." }, { status: 403 });
          if (!allowRequest(request, "checkout", 12, 10 * 60 * 1000)) return Response.json({ error: "Muitas tentativas. Aguarde alguns minutos." }, { status: 429 });
          const parsed = checkoutRequestSchema.safeParse(await request.json());
          if (!parsed.success) {
            return Response.json(
              { error: "Revise os dados do pedido antes de continuar." },
              { status: 400 },
            );
          }

          const payload = parsed.data;
          const { lines, summary, orderId } = await buildVerifiedCheckout(payload);
          const stripe = getStripe();
          const origin = new URL(request.url).origin;
          const addressLine2 = [payload.delivery.complement, payload.delivery.district]
            .filter(Boolean)
            .join(" · ");

          await createPendingOrder({ id: orderId, payload, lines, summary });

          const customer = await stripe.customers.create(
            {
              name: payload.customer.name,
              email: payload.customer.email,
              phone: payload.customer.phone,
              address: {
                line1: `${payload.delivery.street}, ${payload.delivery.number}`,
                line2: addressLine2 || undefined,
                city: payload.delivery.city,
                state: payload.delivery.state,
                postal_code: payload.delivery.cep,
                country: "BR",
              },
              metadata: { order_id: orderId },
            },
            { idempotencyKey: `${orderId}:customer` },
          );

          let discounts: Stripe.Checkout.SessionCreateParams.Discount[] | undefined;
          if (summary.coupon && summary.discount > 0) {
            const stripeCoupon = await stripe.coupons.create(
              {
                duration: "once",
                name: `agô · ${summary.coupon.code}`,
                amount_off: Math.round(summary.discount * 100),
                currency: "brl",
                metadata: { internal_coupon: summary.coupon.code, order_id: orderId },
              },
              { idempotencyKey: `${orderId}:coupon` },
            );
            discounts = [{ coupon: stripeCoupon.id }];
          }

          const shippingOption: Stripe.Checkout.SessionCreateParams.ShippingOption = {
            shipping_rate_data: {
              type: "fixed_amount",
              fixed_amount: { amount: Math.round(summary.shipping * 100), currency: "brl" },
              display_name:
                summary.shipping === 0 ? "Entrega refrigerada grátis" : "Entrega refrigerada",
              delivery_estimate: {
                minimum: { unit: "business_day", value: 1 },
                maximum: { unit: "business_day", value: 3 },
              },
            },
          };

          const session = await stripe.checkout.sessions.create(
            {
              mode: "payment",
              locale: "pt-BR",
              customer: customer.id,
              client_reference_id: orderId,
              line_items: lines.map((line) => ({
                quantity: line.qty,
                price_data: {
                  currency: "brl",
                  unit_amount: Math.round(line.unitPrice * 100),
                  product_data: {
                    name: line.name,
                    description: line.description.slice(0, 240),
                    images: line.image.startsWith("https://") ? [line.image] : undefined,
                    metadata: { product_id: line.productId },
                  },
                },
              })),
              discounts,
              shipping_options: [shippingOption],
              shipping_address_collection: { allowed_countries: ["BR"] },
              customer_update: { address: "auto", name: "auto", shipping: "auto" },
              billing_address_collection: "required",
              submit_type: "pay",
              success_url: `${origin}/pedido/confirmado?session_id={CHECKOUT_SESSION_ID}`,
              cancel_url: `${origin}/checkout?pagamento=cancelado`,
              branding_settings: {
                background_color: "#FFF6E6",
                button_color: "#F5A623",
                border_style: "rounded",
                display_name: "agô",
                font_family: "inter",
              },
              custom_text: {
                submit: {
                  message: "Pagamento seguro. Seus dados financeiros são processados pela Stripe.",
                },
              },
              metadata: {
                order_id: orderId,
                coupon: summary.coupon?.code ?? "",
                delivery_cep: payload.delivery.cep.replace(/\D/g, ""),
                delivery_notes: payload.delivery.notes.slice(0, 200),
              },
              payment_intent_data: {
                metadata: { order_id: orderId, source: "ago_store" },
              },
            },
            { idempotencyKey: `${orderId}:session` },
          );

          if (!session.url) throw new Error("A Stripe não retornou a página de pagamento.");
          await attachStripeSession(orderId, session.id);
          return Response.json({ url: session.url, orderId });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Não foi possível iniciar o pagamento.";
          const safeMessage = message.includes("STRIPE_SECRET_KEY")
            ? "O pagamento Stripe ainda não foi configurado neste ambiente."
            : message;
          return Response.json({ error: safeMessage }, { status: 400 });
        }
      },
    },
  },
});
