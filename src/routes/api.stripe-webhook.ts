import { createFileRoute } from "@tanstack/react-router";
import Stripe from "stripe";
import { getStripe, getStripeWebhookSecret } from "@/lib/stripe.server";
import {
  applyStripeEvent,
  applyStripeInvoiceEvent,
  applyStripeSubscriptionEvent,
} from "@/lib/orders.server";

export const Route = createFileRoute("/api/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const signature = request.headers.get("stripe-signature");
        if (!signature) return new Response("Assinatura ausente.", { status: 400 });

        try {
          const stripe = getStripe();
          const event = await stripe.webhooks.constructEventAsync(
            await request.text(),
            signature,
            getStripeWebhookSecret(),
            undefined,
            Stripe.createSubtleCryptoProvider(),
          );

          if (
            event.type === "checkout.session.completed" ||
            event.type === "checkout.session.async_payment_succeeded"
          ) {
            const session = event.data.object;
            await applyStripeEvent({
              id: event.id,
              type: event.type,
              sessionId: session.id,
              orderId: session.client_reference_id,
              paymentStatus: session.payment_status,
              subscriptionId:
                typeof session.subscription === "string"
                  ? session.subscription
                  : session.subscription?.id || null,
            });
            console.info("ago.checkout.paid", {
              eventId: event.id,
              sessionId: session.id,
              orderId: session.client_reference_id,
              paymentStatus: session.payment_status,
              amountTotal: session.amount_total,
            });
          }

          if (
            event.type === "customer.subscription.updated" ||
            event.type === "customer.subscription.deleted"
          ) {
            const subscription = event.data.object;
            await applyStripeSubscriptionEvent({
              id: event.id,
              type: event.type,
              subscriptionId: subscription.id,
              status: subscription.status,
            });
          }

          if (event.type === "invoice.upcoming" || event.type === "invoice.payment_failed") {
            const invoice = event.data.object as Stripe.Invoice & {
              subscription?: string | { id: string } | null;
              parent?: {
                subscription_details?: { subscription?: string | { id: string } | null } | null;
              } | null;
            };
            const reference =
              invoice.subscription || invoice.parent?.subscription_details?.subscription || null;
            await applyStripeInvoiceEvent({
              id: event.id,
              type: event.type,
              subscriptionId: typeof reference === "string" ? reference : reference?.id || null,
            });
          }

          if (event.type === "checkout.session.async_payment_failed") {
            await applyStripeEvent({
              id: event.id,
              type: event.type,
              sessionId: event.data.object.id,
              orderId: event.data.object.client_reference_id,
              paymentStatus: event.data.object.payment_status,
            });
            console.warn("ago.checkout.payment_failed", {
              eventId: event.id,
              sessionId: event.data.object.id,
              orderId: event.data.object.client_reference_id,
            });
          }

          return Response.json({ received: true });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Webhook inválido.";
          return new Response(message, { status: 400 });
        }
      },
    },
  },
});
