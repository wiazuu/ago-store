import "@tanstack/react-start/server-only";
import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Pagamento indisponível: STRIPE_SECRET_KEY não configurada.");
  }

  stripeClient ??= new Stripe(secretKey, {
    httpClient: Stripe.createFetchHttpClient(),
    appInfo: { name: "ago-store", version: "1.0.0" },
    maxNetworkRetries: 2,
  });

  return stripeClient;
}

export function getStripeWebhookSecret() {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET não configurada.");
  return secret;
}
