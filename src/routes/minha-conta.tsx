import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
  CalendarDays,
  Heart,
  LogOut,
  MapPin,
  PackageCheck,
  Pause,
  Play,
  RotateCcw,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useShopStore } from "@/store/shop-store";
import { brl } from "@/lib/format";

type OrderItem = {
  productId: string;
  name: string;
  image: string;
  qty: number;
  unitPrice: number;
  selections?: { productId: string; name: string; qty: number }[];
};
type Order = {
  id: string;
  items: OrderItem[];
  totalCents: number;
  status: string;
  paymentStatus: string;
  fulfillmentType: string;
  deliveryDate: string | null;
  deliveryWindow: string | null;
  createdAt: string;
};
type Account = {
  profile: {
    name: string;
    email: string;
    phone: string | null;
    loyaltyPoints: number;
    referralCode: string | null;
  };
  orders: Order[];
  addresses: {
    id: string;
    label: string;
    street: string;
    number: string;
    district: string;
    isDefault: boolean;
  }[];
  favorites: { productId: string }[];
  subscriptions: {
    id: string;
    kitId: string;
    interval: string;
    status: string;
    nextDeliveryDate: string | null;
  }[];
};

export const Route = createFileRoute("/minha-conta")({ component: CustomerAccount });
function CustomerAccount() {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"orders" | "profile" | "favorites" | "subscriptions">("orders");
  const [message, setMessage] = useState("");
  const setAuth = useShopStore((state) => state.setAuth);
  const setFavorites = useShopStore((state) => state.setFavorites);
  const add = useShopStore((state) => state.add);
  const navigate = useNavigate();
  const load = useCallback(
    () =>
      fetch("/api/customer-account", { cache: "no-store" })
        .then(async (response) => {
          if (response.status === 401) {
            setAuth(false);
            await navigate({ to: "/login" });
            return null;
          }
          return response.json() as Promise<Account>;
        })
        .then((data) => {
          setAccount(data);
          if (data) setFavorites(data.favorites.map((item) => item.productId));
        })
        .finally(() => setLoading(false)),
    [navigate, setAuth, setFavorites],
  );
  useEffect(() => {
    void load();
  }, [load]);
  async function logout() {
    await fetch("/api/customer-session", { method: "DELETE" });
    setAuth(false);
    navigate({ to: "/" });
  }
  function reorder(order: Order) {
    for (const item of order.items)
      add({
        productId: item.productId,
        name: item.name,
        image: item.image,
        price: item.unitPrice,
        qty: item.qty,
        selections: item.selections,
      });
    navigate({ to: "/checkout" });
  }
  async function subscription(id: string, status: "active" | "paused" | "cancelled") {
    await fetch("/api/customer-account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "subscription", id, status }),
    });
    await load();
  }
  if (loading)
    return (
      <main className="container-page py-16 text-muted-foreground">Carregando sua conta...</main>
    );
  if (!account) return null;
  const lastOrder = account.orders.find((order) => order.paymentStatus === "paid");
  return (
    <main className="container-page py-8 sm:py-14">
      <header className="flex flex-col gap-5 rounded-3xl bg-charcoal p-6 text-cream sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary text-charcoal">
            <UserRound />
          </div>
          <div>
            <p className="text-sm text-cream/60">Minha conta</p>
            <h1 className="font-display text-3xl">Olá, {account.profile.name.split(" ")[0]}</h1>
            <p className="text-sm text-cream/70">
              {account.profile.email} · {account.profile.phone || "Adicione seu WhatsApp"}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={() => void logout()}>
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </Button>
      </header>
      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-green-soft p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-secondary">Pontos Agô</p>
          <div className="mt-1 font-display text-3xl text-secondary">
            {account.profile.loyaltyPoints}
          </div>
          <p className="mt-1 text-xs text-secondary/75">
            Você ganha 1 ponto por real em pedidos entregues.
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Seu código de indicação
          </p>
          <div className="mt-1 font-mono text-xl font-bold">
            {account.profile.referralCode || "Será gerado automaticamente"}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Compartilhe com amigos. As regras de recompensa podem ser configuradas em campanhas.
          </p>
        </div>
      </section>
      {lastOrder && (
        <section className="mt-6 flex flex-col gap-4 rounded-3xl border border-primary/30 bg-orange-soft p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="section-kicker">Seu último pedido</p>
            <h2 className="font-display text-xl">
              {lastOrder.items.map((item) => `${item.qty}× ${item.name}`).join(" · ")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {brl(lastOrder.totalCents / 100)} · {lastOrder.status}
            </p>
          </div>
          <Button onClick={() => reorder(lastOrder)}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Pedir novamente
          </Button>
        </section>
      )}
      <nav className="scrollbar-none mt-6 flex gap-2 overflow-x-auto">
        {[
          ["orders", "Pedidos", PackageCheck],
          ["profile", "Dados e endereços", MapPin],
          ["favorites", "Favoritos", Heart],
          ["subscriptions", "Assinaturas", CalendarDays],
        ].map(([key, label, Icon]) => (
          <button
            key={key as string}
            onClick={() => setTab(key as typeof tab)}
            className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${tab === key ? "bg-secondary text-white" : "bg-muted"}`}
          >
            <Icon className="h-4 w-4" />
            {label as string}
          </button>
        ))}
      </nav>
      {message && (
        <p className="mt-5 rounded-xl bg-green-soft p-3 text-sm text-secondary">{message}</p>
      )}
      {tab === "orders" && (
        <section className="mt-6 space-y-4">
          {account.orders.length === 0 ? (
            <Empty text="Você ainda não fez nenhum pedido." />
          ) : (
            account.orders.map((order) => (
              <article key={order.id} className="rounded-2xl border bg-card p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
                  <div>
                    <p className="font-mono text-xs text-muted-foreground">{order.id}</p>
                    <h2 className="mt-1 font-display text-xl">
                      {order.items.map((item) => `${item.qty}× ${item.name}`).join(" · ")}
                    </h2>
                    <p className="mt-2 text-sm">
                      {order.fulfillmentType === "pickup" ? "Retirada" : "Entrega"}
                      {order.deliveryDate
                        ? ` em ${new Date(`${order.deliveryDate}T12:00:00`).toLocaleDateString("pt-BR")}`
                        : ""}{" "}
                      · <strong>{order.status}</strong>
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <strong>{brl(order.totalCents / 100)}</strong>
                    <Button variant="outline" className="mt-3 block" onClick={() => reorder(order)}>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Repetir
                    </Button>
                  </div>
                </div>
              </article>
            ))
          )}
        </section>
      )}
      {tab === "profile" && (
        <Profile
          account={account}
          onSaved={() => {
            setMessage("Dados atualizados.");
            void load();
          }}
        />
      )}
      {tab === "favorites" && (
        <section className="mt-6">
          {account.favorites.length ? (
            <div className="rounded-2xl border bg-card p-5">
              <h2 className="font-display text-xl">Seus favoritos</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {account.favorites.length} item(ns) salvo(s) para encontrar mais rápido no cardápio.
              </p>
              <Link to="/" className="mt-4 inline-block font-bold text-primary-dark">
                Abrir cardápio →
              </Link>
            </div>
          ) : (
            <Empty text="Você ainda não salvou refeições favoritas." />
          )}
        </section>
      )}
      {tab === "subscriptions" && (
        <section className="mt-6 space-y-4">
          {account.subscriptions.length === 0 ? (
            <Empty text="Você ainda não possui assinatura ativa." />
          ) : (
            account.subscriptions.map((plan) => (
              <article
                key={plan.id}
                className="flex flex-col gap-4 rounded-2xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <h2 className="font-display text-xl">
                    Plano {plan.interval === "weekly" ? "semanal" : plan.interval}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Status: {plan.status}{" "}
                    {plan.nextDeliveryDate ? `· próxima entrega ${plan.nextDeliveryDate}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  {plan.status === "active" ? (
                    <Button variant="outline" onClick={() => void subscription(plan.id, "paused")}>
                      <Pause className="mr-2 h-4 w-4" />
                      Pausar
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={() => void subscription(plan.id, "active")}>
                      <Play className="mr-2 h-4 w-4" />
                      Retomar
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    onClick={() => void subscription(plan.id, "cancelled")}
                  >
                    Cancelar
                  </Button>
                </div>
              </article>
            ))
          )}
        </section>
      )}
    </main>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-dashed bg-card p-10 text-center text-muted-foreground">
      {text}
    </div>
  );
}
function Profile({ account, onSaved }: { account: Account; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: account.profile.name,
    phone: account.profile.phone || "",
  });
  async function save(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/customer-account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "profile", ...form }),
    });
    if (response.ok) onSaved();
  }
  return (
    <section className="mt-6 grid gap-5 lg:grid-cols-2">
      <form onSubmit={save} className="rounded-2xl border bg-card p-5">
        <h2 className="font-display text-xl">Contato</h2>
        <div className="mt-4 space-y-4">
          <div>
            <Label>Nome</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <Label>WhatsApp</Label>
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <Button>Salvar dados</Button>
        </div>
      </form>
      <div className="rounded-2xl border bg-card p-5">
        <h2 className="font-display text-xl">Endereços</h2>
        {account.addresses.length ? (
          <ul className="mt-4 space-y-3">
            {account.addresses.map((address) => (
              <li key={address.id} className="rounded-xl bg-muted p-3 text-sm">
                <strong>
                  {address.label}
                  {address.isDefault ? " · principal" : ""}
                </strong>
                <br />
                {address.street}, {address.number} · {address.district}, Manaus
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            Seu endereço será salvo quando essa opção for ativada no checkout.
          </p>
        )}
      </div>
    </section>
  );
}
