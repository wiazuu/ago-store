import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Check, Minus, Plus, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useKits, useProducts } from "@/store/admin-store";
import { useShopStore } from "@/store/shop-store";
import { brl } from "@/lib/format";
export const Route = createFileRoute("/kit/$slug")({ component: KitBuilder });
function KitBuilder() {
  const { slug } = Route.useParams();
  const kit = useKits().find((item) => item.slug === slug && item.active);
  const products = useProducts();
  const add = useShopStore((s) => s.add);
  const navigate = useNavigate();
  const allowed = useMemo(
    () =>
      kit
        ? kit.items
            .map((entry) => products.find((product) => product.id === entry.productId))
            .filter((product): product is NonNullable<typeof product> => Boolean(product?.active))
        : [],
    [kit, products],
  );
  const [selection, setSelection] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      (kit?.items || []).map((item) => [item.productId, kit?.customizable ? 0 : item.qty]),
    ),
  );
  const [subscriptionInterval, setSubscriptionInterval] = useState<
    "" | "weekly" | "monthly" | "quarterly"
  >("");
  if (!kit)
    return (
      <main className="container-page py-20 text-center">
        <h1 className="font-display text-3xl">Kit não encontrado</h1>
        <Link to="/" className="mt-5 inline-block text-primary-dark">
          Voltar à loja
        </Link>
      </main>
    );
  const target = kit.mealCount || kit.items.reduce((sum, item) => sum + item.qty, 0);
  const total = Object.values(selection).reduce((sum, qty) => sum + qty, 0);
  const change = (id: string, delta: number) =>
    setSelection((current) => ({ ...current, [id]: Math.max(0, (current[id] || 0) + delta) }));
  const finish = () => {
    if (total !== target) return;
    add({
      productId: kit.id,
      name: kit.name,
      image: kit.image,
      price: kit.price,
      selections: allowed
        .filter((product) => (selection[product.id] || 0) > 0)
        .map((product) => ({
          productId: product.id,
          name: product.name,
          qty: selection[product.id],
        })),
      subscriptionInterval: subscriptionInterval || undefined,
    });
    navigate({ to: "/checkout" });
  };
  return (
    <main className="container-page py-8 sm:py-14">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </Link>
      <div className="mt-6 grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        <section>
          <img
            src={kit.image}
            alt={kit.name}
            className="aspect-[4/3] w-full rounded-3xl object-cover"
          />
          <p className="section-kicker mt-6">Kit personalizado</p>
          <h1 className="font-display text-4xl">{kit.name}</h1>
          <p className="mt-3 leading-7 text-muted-foreground">{kit.description}</p>
          <div className="mt-5 font-display text-3xl">{brl(kit.price)}</div>
          {kit.subscriptionEligible && (
            <p className="mt-3 rounded-xl bg-green-soft p-3 text-sm text-secondary">
              Também disponível para recorrência. A ativação da assinatura aparece na etapa de
              pagamento.
            </p>
          )}
        </section>
        <section className="rounded-3xl border bg-card p-5 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl">Escolha {target} refeições</h2>
              <p className="text-sm text-muted-foreground">
                Combine os pratos do jeito que preferir.
              </p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-sm font-bold ${total === target ? "bg-green-soft text-secondary" : "bg-orange-soft text-primary-dark"}`}
            >
              {total}/{target}
            </span>
          </div>
          <div className="mt-6 space-y-3">
            {allowed.map((product) => (
              <article key={product.id} className="flex items-center gap-3 rounded-2xl border p-3">
                <img src={product.image} alt="" className="h-16 w-16 rounded-xl object-cover" />
                <div className="min-w-0 flex-1">
                  <strong className="line-clamp-2">{product.name}</strong>
                  <p className="text-xs text-muted-foreground">
                    {product.calories} kcal · {product.protein}g proteína
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="grid h-9 w-9 place-items-center rounded-full border"
                    onClick={() => change(product.id, -1)}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <strong className="w-5 text-center">{selection[product.id] || 0}</strong>
                  <button
                    type="button"
                    disabled={total >= target}
                    className="grid h-9 w-9 place-items-center rounded-full bg-primary disabled:opacity-40"
                    onClick={() => change(product.id, 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </article>
            ))}
          </div>
          {allowed.length === 0 && (
            <p className="rounded-xl bg-muted p-5 text-sm text-muted-foreground">
              Este kit ainda não possui pratos configurados.
            </p>
          )}
          {kit.subscriptionEligible && (
            <div className="mt-6 rounded-2xl bg-muted p-4">
              <label className="font-bold" htmlFor="recurrence">
                Forma de compra
              </label>
              <select
                id="recurrence"
                className="mt-2 h-11 w-full rounded-xl border bg-background px-3 text-sm"
                value={subscriptionInterval}
                onChange={(event) =>
                  setSubscriptionInterval(event.target.value as typeof subscriptionInterval)
                }
              >
                <option value="">Compra única</option>
                <option value="weekly">Assinatura semanal</option>
                <option value="monthly">Assinatura mensal</option>
                <option value="quarterly">Assinatura trimestral</option>
              </select>
              <p className="mt-2 text-xs text-muted-foreground">
                Assinaturas renovam automaticamente pela Stripe. Você poderá pausar ou cancelar na
                sua conta.
              </p>
            </div>
          )}
          <Button className="mt-6 h-12 w-full" disabled={total !== target} onClick={finish}>
            {total === target ? (
              <Check className="mr-2 h-4 w-4" />
            ) : (
              <ShoppingBag className="mr-2 h-4 w-4" />
            )}
            {total === target ? "Adicionar e continuar" : "Complete sua seleção"}
          </Button>
        </section>
      </div>
    </main>
  );
}
