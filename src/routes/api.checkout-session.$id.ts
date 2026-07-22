import { createFileRoute } from "@tanstack/react-router";
import { getStripe } from "@/lib/stripe.server";
import { reconcileStripeCheckoutSession } from "@/lib/orders.server";

export const Route = createFileRoute("/api/checkout-session/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        if (!/^cs_(test_|live_)?[a-zA-Z0-9]+$/.test(params.id)) {
          return Response.json({ error: "Sessão inválida." }, { status: 400 });
        }

        try {
          const stripe = getStripe();
          const [session, lineItems] = await Promise.all([
            stripe.checkout.sessions.retrieve(params.id),
            stripe.checkout.sessions.listLineItems(params.id, { limit: 50 }),
          ]);
          await reconcileStripeCheckoutSession(session);

          return Response.json({
            id: session.id,
            orderId: session.client_reference_id,
            status: session.status,
            paymentStatus: session.payment_status,
            amountSubtotal: session.amount_subtotal,
            amountTotal: session.amount_total,
            currency: session.currency,
            shipping: session.total_details?.amount_shipping ?? 0,
            discount: session.total_details?.amount_discount ?? 0,
            coupon: session.metadata?.coupon || null,
            customer: {
              name: session.customer_details?.name ?? "Cliente agô",
              email: session.customer_details?.email ?? "",
              phone: session.customer_details?.phone ?? "",
            },
            items: lineItems.data.map((item) => ({
              id: item.id,
              name: item.description,
              qty: item.quantity ?? 1,
              amountTotal: item.amount_total,
            })),
          });
        } catch {
          return Response.json(
            { error: "Não foi possível confirmar o pagamento." },
            { status: 404 },
          );
        }
      },
    },
  },
});
