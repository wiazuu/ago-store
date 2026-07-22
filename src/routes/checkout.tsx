import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import {
  ArrowLeft,
  ArrowRight,
  Barcode,
  Check,
  CreditCard,
  LoaderCircle,
  LockKeyhole,
  QrCode,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { useShopStore } from "@/store/shop-store";
import { useAdminStore, useInstitutional } from "@/store/admin-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { brl } from "@/lib/format";
import { calculateOrderSummary } from "@/lib/commerce";

const checkoutSearchSchema = z.object({ pagamento: z.string().optional() });

const onlyDigits = (value: string) => value.replace(/\D/g, "");
const maskCpf = (value: string) =>
  onlyDigits(value)
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
const maskCep = (value: string) =>
  onlyDigits(value)
    .slice(0, 8)
    .replace(/(\d{5})(\d)/, "$1-$2");
const maskPhone = (value: string) => {
  const digits = onlyDigits(value).slice(0, 11);
  return digits.replace(/^(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d{4})$/, "$1-$2");
};

type Customer = { name: string; email: string; phone: string; cpf: string };
type Delivery = {
  fulfillmentType: "delivery" | "pickup";
  scheduledDate: string;
  deliveryWindow: "manha" | "tarde" | "noite";
  cep: string;
  street: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
  notes: string;
};
type FulfillmentDay = {
  day: string;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  available: number;
  note: string | null;
};

export const Route = createFileRoute("/checkout")({
  validateSearch: checkoutSearchSchema,
  component: CheckoutPage,
});

function CheckoutPage() {
  const { pagamento } = Route.useSearch();
  const items = useShopStore((state) => state.items);
  const couponCode = useShopStore((state) => state.coupon);
  const coupons = useAdminStore((state) => state.coupons);
  const institutional = useInstitutional();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableDays, setAvailableDays] = useState<FulfillmentDay[]>([]);
  const attemptId = useRef<string | null>(null);
  const [customer, setCustomer] = useState<Customer>({ name: "", email: "", phone: "", cpf: "" });
  const [delivery, setDelivery] = useState<Delivery>({
    fulfillmentType: "delivery",
    scheduledDate: "",
    deliveryWindow: "tarde",
    cep: "",
    street: "",
    number: "",
    complement: "",
    district: "",
    city: "Manaus",
    state: "AM",
    notes: "",
  });

  useEffect(() => {
    void fetch("/api/delivery-calendar", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload: { days?: FulfillmentDay[] }) => setAvailableDays(payload.days || []))
      .catch(() => setAvailableDays([]));
    void fetch("/api/customer-session", { cache: "no-store" })
      .then((response) => response.json())
      .then(
        (payload: {
          authenticated?: boolean;
          user?: { name: string; email: string; phone?: string | null };
        }) => {
          if (payload.authenticated && payload.user) {
            setCustomer((current) => ({
              ...current,
              name: payload.user?.name || current.name,
              email: payload.user?.email || current.email,
              phone: payload.user?.phone || current.phone,
            }));
            void fetch("/api/customer-account", { cache: "no-store" })
              .then((response) => response.json())
              .then(
                (account: {
                  addresses?: {
                    cep: string;
                    street: string;
                    number: string;
                    complement?: string | null;
                    district: string;
                    city: string;
                    state: string;
                    isDefault: boolean;
                  }[];
                }) => {
                  const address =
                    account.addresses?.find((item) => item.isDefault) || account.addresses?.[0];
                  if (address)
                    setDelivery((current) => ({
                      ...current,
                      cep: address.cep,
                      street: address.street,
                      number: address.number,
                      complement: address.complement || "",
                      district: address.district,
                      city: address.city,
                      state: address.state,
                    }));
                },
              )
              .catch(() => undefined);
          }
        },
      )
      .catch(() => undefined);
  }, []);

  const summary = useMemo(
    () =>
      calculateOrderSummary({
        lines: items.map((item) => ({
          productId: item.productId,
          qty: item.qty,
          unitPrice: item.price,
        })),
        couponCode,
        coupons,
        freeShippingMin: institutional.freeShippingMin,
        fulfillmentType: delivery.fulfillmentType,
      }),
    [couponCode, coupons, delivery.fulfillmentType, institutional.freeShippingMin, items],
  );

  const updateCustomer = (field: keyof Customer, value: string) =>
    setCustomer((current) => ({ ...current, [field]: value }));
  const updateDelivery = (field: keyof Delivery, value: string) =>
    setDelivery((current) => ({ ...current, [field]: value }));

  const continueFromCustomer = () => {
    setError(null);
    if (customer.name.trim().length < 3) return setError("Informe seu nome completo.");
    if (!/^\S+@\S+\.\S+$/.test(customer.email)) return setError("Informe um e-mail válido.");
    if (onlyDigits(customer.phone).length < 10) return setError("Informe um telefone válido.");
    if (onlyDigits(customer.cpf).length !== 11) return setError("Informe um CPF válido.");
    setStep(2);
  };

  const continueFromDelivery = () => {
    setError(null);
    if (!delivery.scheduledDate) return setError("Escolha uma data disponível.");
    const selected = availableDays.find((day) => day.day === delivery.scheduledDate);
    if (
      !selected ||
      !(delivery.fulfillmentType === "delivery" ? selected.deliveryEnabled : selected.pickupEnabled)
    )
      return setError("Essa opção não está disponível na data escolhida.");
    if (delivery.fulfillmentType === "pickup") {
      setStep(3);
      return;
    }
    if (onlyDigits(delivery.cep).length !== 8) return setError("Informe um CEP válido.");
    if (delivery.street.trim().length < 3 || !delivery.number.trim()) {
      return setError("Preencha rua e número da entrega.");
    }
    if (!delivery.district.trim() || !delivery.city.trim() || delivery.state.trim().length !== 2) {
      return setError("Preencha bairro, cidade e UF.");
    }
    setStep(3);
  };

  const payWithStripe = async () => {
    setError(null);
    setLoading(true);
    attemptId.current ??= crypto.randomUUID();

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId: attemptId.current,
          items: items.map((item) => ({
            productId: item.productId,
            qty: item.qty,
            selections: item.selections?.map(({ productId, qty }) => ({ productId, qty })),
          })),
          coupon: couponCode,
          subscriptionInterval:
            items.find((item) => item.subscriptionInterval)?.subscriptionInterval || null,
          customer,
          delivery,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.url)
        throw new Error(data.error ?? "Não foi possível abrir o pagamento.");
      window.location.assign(data.url);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível abrir o pagamento.");
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <main className="container-page py-20 text-center sm:py-28">
        <div className="mx-auto max-w-lg rounded-3xl bg-card p-8 brand-shadow sm:p-12">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-soft text-2xl">
            🛍️
          </div>
          <h1 className="font-display text-3xl">Sua sacola está vazia</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Escolha suas refeições antes de seguir para o pagamento.
          </p>
          <Link to="/">
            <Button className="mt-6">Explorar cardápio</Button>
          </Link>
        </div>
      </main>
    );
  }

  const steps = ["Seus dados", "Entrega", "Pagamento"];

  return (
    <main className="container-page py-8 sm:py-12">
      <Link
        to="/"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-secondary"
      >
        <ArrowLeft className="h-4 w-4" /> Continuar comprando
      </Link>

      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="section-kicker">Compra segura</p>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl">Finalize seu pedido</h1>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <LockKeyhole className="h-4 w-4 text-secondary" /> Ambiente protegido pela Stripe
        </div>
      </div>

      {pagamento === "cancelado" && (
        <div className="mb-6 rounded-2xl border border-primary/30 bg-orange-soft p-4 text-sm">
          O pagamento foi cancelado. Seu carrinho continua salvo e você pode tentar novamente.
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-12">
        <section>
          <ol className="mb-7 grid grid-cols-3 gap-2" aria-label="Etapas do checkout">
            {steps.map((label, index) => {
              const number = index + 1;
              const active = step === number;
              const complete = step > number;
              return (
                <li key={label} className="min-w-0">
                  <div
                    className={`mb-2 h-1.5 rounded-full ${step >= number ? "bg-primary" : "bg-border"}`}
                  />
                  <div
                    className={`flex items-center gap-2 text-xs sm:text-sm ${active ? "font-semibold text-foreground" : "text-muted-foreground"}`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${step >= number ? "bg-primary text-charcoal" : "bg-muted"}`}
                    >
                      {complete ? <Check className="h-3.5 w-3.5" /> : number}
                    </span>
                    <span className="truncate">{label}</span>
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="rounded-3xl bg-card p-5 brand-shadow sm:p-8">
            {step === 1 && (
              <div>
                <h2 className="font-display text-2xl">Quem vai receber?</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Usaremos esses dados para confirmação e atualizações do pedido.
                </p>
                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label htmlFor="name">Nome completo</Label>
                    <Input
                      id="name"
                      autoComplete="name"
                      value={customer.name}
                      onChange={(event) => updateCustomer("name", event.target.value)}
                      placeholder="Seu nome e sobrenome"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={customer.email}
                      onChange={(event) => updateCustomer("email", event.target.value)}
                      placeholder="voce@email.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">WhatsApp</Label>
                    <Input
                      id="phone"
                      inputMode="tel"
                      autoComplete="tel"
                      value={customer.phone}
                      onChange={(event) => updateCustomer("phone", maskPhone(event.target.value))}
                      placeholder="(92) 90000-0000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cpf">CPF</Label>
                    <Input
                      id="cpf"
                      inputMode="numeric"
                      value={customer.cpf}
                      onChange={(event) => updateCustomer("cpf", maskCpf(event.target.value))}
                      placeholder="000.000.000-00"
                    />
                  </div>
                </div>
                {error && (
                  <p className="mt-5 text-sm font-medium text-destructive" role="alert">
                    {error}
                  </p>
                )}
                <Button className="mt-7 w-full sm:w-auto" onClick={continueFromCustomer}>
                  Continuar <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            {step === 2 && (
              <div>
                <h2 className="font-display text-2xl">Como você quer receber?</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Entregamos em toda Manaus por R$ 15 ou você pode retirar gratuitamente no nosso
                  local.
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => updateDelivery("fulfillmentType", "delivery")}
                    className={`rounded-2xl border p-4 text-left ${delivery.fulfillmentType === "delivery" ? "border-primary bg-orange-soft" : "bg-background"}`}
                  >
                    <Truck className="mb-2 h-5 w-5 text-primary-dark" />
                    <strong>Entrega em Manaus</strong>
                    <p className="mt-1 text-xs text-muted-foreground">Taxa única de R$ 15</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateDelivery("fulfillmentType", "pickup")}
                    className={`rounded-2xl border p-4 text-left ${delivery.fulfillmentType === "pickup" ? "border-primary bg-orange-soft" : "bg-background"}`}
                  >
                    <Check className="mb-2 h-5 w-5 text-secondary" />
                    <strong>Retirada no local</strong>
                    <p className="mt-1 text-xs text-muted-foreground">Sem taxa de entrega</p>
                  </button>
                </div>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="scheduledDate">Data</Label>
                    <select
                      id="scheduledDate"
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                      value={delivery.scheduledDate}
                      onChange={(event) => updateDelivery("scheduledDate", event.target.value)}
                    >
                      <option value="">Selecione uma data</option>
                      {availableDays
                        .filter((day) =>
                          delivery.fulfillmentType === "delivery"
                            ? day.deliveryEnabled
                            : day.pickupEnabled,
                        )
                        .map((day) => (
                          <option key={day.day} value={day.day}>
                            {new Date(`${day.day}T12:00:00`).toLocaleDateString("pt-BR", {
                              weekday: "short",
                              day: "2-digit",
                              month: "2-digit",
                            })}{" "}
                            · {day.available} vagas
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="deliveryWindow">Período</Label>
                    <select
                      id="deliveryWindow"
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                      value={delivery.deliveryWindow}
                      onChange={(event) =>
                        updateDelivery(
                          "deliveryWindow",
                          event.target.value as Delivery["deliveryWindow"],
                        )
                      }
                    >
                      <option value="manha">Manhã</option>
                      <option value="tarde">Tarde</option>
                      <option value="noite">Noite</option>
                    </select>
                  </div>
                </div>
                {delivery.fulfillmentType === "delivery" && (
                  <div className="mt-6 grid gap-5 sm:grid-cols-6">
                    <div className="sm:col-span-2">
                      <Label htmlFor="cep">CEP</Label>
                      <Input
                        id="cep"
                        inputMode="numeric"
                        autoComplete="postal-code"
                        value={delivery.cep}
                        onChange={(event) => updateDelivery("cep", maskCep(event.target.value))}
                        placeholder="69000-000"
                      />
                    </div>
                    <div className="sm:col-span-4">
                      <Label htmlFor="street">Rua</Label>
                      <Input
                        id="street"
                        autoComplete="address-line1"
                        value={delivery.street}
                        onChange={(event) => updateDelivery("street", event.target.value)}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label htmlFor="number">Número</Label>
                      <Input
                        id="number"
                        value={delivery.number}
                        onChange={(event) => updateDelivery("number", event.target.value)}
                      />
                    </div>
                    <div className="sm:col-span-4">
                      <Label htmlFor="complement">Complemento</Label>
                      <Input
                        id="complement"
                        autoComplete="address-line2"
                        value={delivery.complement}
                        onChange={(event) => updateDelivery("complement", event.target.value)}
                        placeholder="Apto, bloco ou referência"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <Label htmlFor="district">Bairro</Label>
                      <Input
                        id="district"
                        value={delivery.district}
                        onChange={(event) => updateDelivery("district", event.target.value)}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label htmlFor="city">Cidade</Label>
                      <Input
                        id="city"
                        autoComplete="address-level2"
                        value={delivery.city}
                        onChange={(event) => updateDelivery("city", event.target.value)}
                      />
                    </div>
                    <div className="sm:col-span-1">
                      <Label htmlFor="state">UF</Label>
                      <Input
                        id="state"
                        maxLength={2}
                        autoComplete="address-level1"
                        value={delivery.state}
                        onChange={(event) =>
                          updateDelivery("state", event.target.value.toUpperCase())
                        }
                      />
                    </div>
                    <div className="sm:col-span-6">
                      <Label htmlFor="notes">Observações</Label>
                      <Input
                        id="notes"
                        value={delivery.notes}
                        onChange={(event) => updateDelivery("notes", event.target.value)}
                        placeholder="Instruções para o entregador (opcional)"
                      />
                    </div>
                  </div>
                )}
                {error && (
                  <p className="mt-5 text-sm font-medium text-destructive" role="alert">
                    {error}
                  </p>
                )}
                <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setError(null);
                      setStep(1);
                    }}
                  >
                    <ArrowLeft className="h-4 w-4" /> Voltar
                  </Button>
                  <Button onClick={continueFromDelivery}>
                    Revisar pagamento <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <h2 className="font-display text-2xl">Pagamento seguro</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Você será direcionado ao checkout da Stripe para escolher a forma disponível.
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {[
                    { icon: CreditCard, title: "Cartão", text: "Crédito com autenticação segura" },
                    { icon: QrCode, title: "Pix", text: "Confirmação rápida pelo app" },
                    { icon: Barcode, title: "Boleto", text: "Quando habilitado na Stripe" },
                  ].map(({ icon: Icon, title, text }) => (
                    <div key={title} className="rounded-2xl border bg-background p-4">
                      <Icon className="mb-3 h-6 w-6 text-secondary" />
                      <div className="font-semibold">{title}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{text}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex gap-3 rounded-2xl bg-green-soft p-4 text-sm text-secondary">
                  <ShieldCheck className="h-5 w-5 shrink-0" />A agô não recebe nem armazena os dados
                  do seu cartão. Todo o processamento financeiro acontece na Stripe.
                </div>
                {error && (
                  <p className="mt-5 text-sm font-medium text-destructive" role="alert">
                    {error}
                  </p>
                )}
                <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row">
                  <Button
                    variant="outline"
                    disabled={loading}
                    onClick={() => {
                      setError(null);
                      setStep(2);
                    }}
                  >
                    <ArrowLeft className="h-4 w-4" /> Voltar
                  </Button>
                  <Button className="min-w-52" disabled={loading} onClick={payWithStripe}>
                    {loading ? (
                      <>
                        <LoaderCircle className="h-4 w-4 animate-spin" /> Abrindo Stripe...
                      </>
                    ) : (
                      <>
                        <LockKeyhole className="h-4 w-4" /> Pagar {brl(summary.total)}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>

        <aside className="h-fit rounded-3xl bg-card p-5 brand-shadow lg:sticky lg:top-32 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl">Resumo do pedido</h2>
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs">
              {items.reduce((sum, item) => sum + item.qty, 0)} itens
            </span>
          </div>
          <div className="mt-5 max-h-80 space-y-4 overflow-y-auto pr-1">
            {items.map((item) => (
              <div key={item.productId} className="flex gap-3 text-sm">
                <div className="relative shrink-0">
                  <img src={item.image} alt="" className="h-14 w-14 rounded-xl object-cover" />
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary px-1 text-[10px] font-bold text-cream">
                    {item.qty}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-2 font-medium leading-tight">{item.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{brl(item.price)} cada</div>
                </div>
                <div className="shrink-0 font-semibold">{brl(item.price * item.qty)}</div>
              </div>
            ))}
          </div>
          <div className="mt-5 space-y-2 border-t pt-5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{brl(summary.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Entrega</span>
              <span>
                {delivery.fulfillmentType === "pickup" ? "Retirada grátis" : brl(summary.shipping)}
              </span>
            </div>
            {summary.discount > 0 && (
              <div className="flex justify-between text-secondary">
                <span>Desconto {summary.coupon?.code}</span>
                <span>-{brl(summary.discount)}</span>
              </div>
            )}
            <div className="flex items-end justify-between border-t pt-4">
              <span className="font-semibold">Total</span>
              <span className="font-display text-2xl">{brl(summary.total)}</span>
            </div>
          </div>
          <div className="mt-5 flex items-start gap-2 rounded-2xl bg-orange-soft p-3 text-xs text-charcoal/75">
            <Truck className="mt-0.5 h-4 w-4 shrink-0 text-primary-dark" /> Entrega refrigerada em
            toda Manaus por R$ 15 ou retirada gratuita.
          </div>
        </aside>
      </div>
    </main>
  );
}
