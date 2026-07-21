import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { CheckCircle2, Clock3, LoaderCircle, ReceiptText, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useShopStore } from "@/store/shop-store";
import { useAdminStore } from "@/store/admin-store";
import { brl } from "@/lib/format";

const searchSchema = z.object({ session_id: z.string().optional() });

type SessionResult = {
  orderId: string | null;
  status: string | null;
  paymentStatus: string;
  amountSubtotal: number | null;
  amountTotal: number | null;
  shipping: number;
  discount: number;
  coupon: string | null;
  customer: { name: string; email: string; phone: string };
  items: { id: string; name: string; qty: number; amountTotal: number }[];
};

export const Route = createFileRoute("/pedido/confirmado")({
  validateSearch: searchSchema,
  component: OrderConfirmedPage,
});

function OrderConfirmedPage() {
  const { session_id: sessionId } = Route.useSearch();
  const clear = useShopStore((state) => state.clear);
  const cartItems = useShopStore((state) => state.items);
  const completePaidOrder = useAdminStore((state) => state.completePaidOrder);
  const [session, setSession] = useState<SessionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setError("Não encontramos a sessão de pagamento.");
      return;
    }

    let active = true;
    fetch(`/api/checkout-session/${encodeURIComponent(sessionId)}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Falha ao confirmar pagamento.");
        return data as SessionResult;
      })
      .then((data) => {
        if (!active) return;
        setSession(data);
        if (data.paymentStatus === "paid" && data.orderId) {
          completePaidOrder(
            {
              id: data.orderId,
              number: `#${data.orderId.replace("ago_", "").slice(0, 10).toUpperCase()}`,
              customer: data.customer,
              address: "Endereço confirmado no Stripe Checkout",
              payment: "stripe",
              items: data.items.map((item) => ({
                productId: item.id,
                name: item.name,
                qty: item.qty,
                price: item.amountTotal / Math.max(1, item.qty) / 100,
              })),
              subtotal: (data.amountSubtotal ?? 0) / 100,
              shipping: data.shipping / 100,
              discount: data.discount / 100,
              total: (data.amountTotal ?? 0) / 100,
              status: "recebido",
              createdAt: new Date().toISOString(),
            },
            cartItems.map((item) => ({ productId: item.productId, qty: item.qty })),
            data.coupon,
          );
          clear();
        }
      })
      .catch((reason: Error) => active && setError(reason.message));

    return () => {
      active = false;
    };
  }, [cartItems, clear, completePaidOrder, sessionId]);

  if (error) {
    return (
      <main className="container-page py-16 sm:py-24">
        <div className="mx-auto max-w-xl rounded-3xl border bg-card p-6 text-center brand-shadow sm:p-10">
          <ReceiptText className="mx-auto mb-4 h-12 w-12 text-coral" />
          <h1 className="font-display text-3xl">Não conseguimos confirmar agora</h1>
          <p className="mt-3 text-sm text-muted-foreground">{error}</p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/checkout">
              <Button>Voltar ao checkout</Button>
            </Link>
            <Link to="/">
              <Button variant="outline">Ir para a home</Button>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="container-page flex min-h-[60vh] items-center justify-center py-16 text-center">
        <div>
          <LoaderCircle className="mx-auto mb-4 h-10 w-10 animate-spin text-primary" />
          <h1 className="font-display text-2xl">Confirmando seu pagamento</h1>
          <p className="mt-2 text-sm text-muted-foreground">Isso leva só alguns segundos.</p>
        </div>
      </main>
    );
  }

  const paid = session.paymentStatus === "paid";
  return (
    <main className="container-page py-12 sm:py-20">
      <div className="mx-auto max-w-2xl overflow-hidden rounded-3xl bg-card brand-shadow-lg">
        <div
          className={`ago-pattern px-6 py-10 text-center text-cream sm:px-10 ${paid ? "" : "opacity-95"}`}
        >
          {paid ? (
            <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-primary" />
          ) : (
            <Clock3 className="mx-auto mb-4 h-16 w-16 text-primary" />
          )}
          <p className="section-kicker text-primary">Pedido {session.orderId}</p>
          <h1 className="mt-2 font-display text-3xl sm:text-4xl">
            {paid ? "Pagamento confirmado!" : "Pagamento em processamento"}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-cream/75">
            {paid
              ? `Enviamos o comprovante e os próximos passos para ${session.customer.email}.`
              : "Assim que a Stripe confirmar o pagamento, seu pedido entra em separação."}
          </p>
        </div>

        <div className="p-6 sm:p-10">
          <div className="space-y-3">
            {session.items.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-4 text-sm">
                <div>
                  <span className="font-semibold">{item.qty}×</span> {item.name}
                </div>
                <div className="shrink-0 font-semibold">{brl(item.amountTotal / 100)}</div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-center justify-between border-t pt-5">
            <span className="text-sm text-muted-foreground">Total pago</span>
            <span className="font-display text-2xl">{brl((session.amountTotal ?? 0) / 100)}</span>
          </div>
          <div className="mt-6 flex items-center gap-2 rounded-2xl bg-green-soft p-4 text-sm text-secondary">
            <ShieldCheck className="h-5 w-5 shrink-0" />
            Pagamento processado em ambiente seguro pela Stripe.
          </div>
          <Link to="/" className="mt-7 block">
            <Button className="h-12 w-full">Voltar para a home</Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
