import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CalendarDays,
  CircleDollarSign,
  ClipboardList,
  CookingPot,
  ShoppingCart,
  Truck,
  UserRound,
} from "lucide-react";
import { useAdminOperations } from "@/hooks/use-admin-operations";
import { brl } from "@/lib/format";
export const Route = createFileRoute("/central-agons-92x/")({ component: AdminDashboard });
function AdminDashboard() {
  const { data, loading, error } = useAdminOperations();
  if (loading) return <p className="text-muted-foreground">Carregando indicadores reais...</p>;
  if (!data || error) return <p className="text-destructive">{error || "Dados indisponíveis."}</p>;
  const cards = [
    {
      icon: CircleDollarSign,
      label: "Faturamento pago",
      value: brl(data.metrics.revenueCents / 100),
    },
    { icon: ShoppingCart, label: "Pedidos pagos", value: data.metrics.paidOrders },
    { icon: ClipboardList, label: "Pedidos em andamento", value: data.metrics.pendingOrders },
    { icon: UserRound, label: "Clientes cadastrados", value: data.metrics.activeCustomers },
    { icon: CalendarDays, label: "Pedidos de hoje", value: data.metrics.todayOrders },
    { icon: CookingPot, label: "Ticket médio", value: brl(data.metrics.averageTicketCents / 100) },
  ];
  const recent = data.orders.slice(0, 8);
  return (
    <div className="space-y-6">
      <header>
        <p className="section-kicker">Dados do PostgreSQL</p>
        <h1 className="font-display text-3xl">Visão geral da Agô</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Indicadores baseados em pedidos e clientes reais.
        </p>
      </header>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {cards.map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-2xl bg-card p-5 brand-shadow">
            <Icon className="mb-3 h-5 w-5 text-primary-dark" />
            <div className="font-display text-2xl">{value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <section className="rounded-2xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl">Pedidos recentes</h2>
            <Link to="/central-agons-92x/pedidos" className="text-sm font-bold text-primary-dark">
              Ver todos →
            </Link>
          </div>
          <div className="mt-4 divide-y">
            {recent.map((order) => (
              <div key={order.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                <div className="min-w-0">
                  <strong>{order.customer.name || "Cliente"}</strong>
                  <div className="truncate text-xs text-muted-foreground">
                    {order.id} · {order.status}
                  </div>
                </div>
                <strong>{brl(order.totalCents / 100)}</strong>
              </div>
            ))}
            {recent.length === 0 && (
              <p className="py-8 text-center text-muted-foreground">Nenhum pedido ainda.</p>
            )}
          </div>
        </section>
        <section className="rounded-2xl bg-charcoal p-5 text-cream">
          <Truck className="h-7 w-7 text-primary" />
          <h2 className="mt-4 font-display text-2xl">Operação do dia</h2>
          <p className="mt-2 text-sm text-cream/70">
            Acesse logística para acompanhar retiradas e entregas, ou produção para ver o total de
            cada refeição.
          </p>
          <div className="mt-5 grid gap-2">
            <Link
              to="/central-agons-92x/logistica"
              className="rounded-xl bg-primary px-4 py-3 text-center font-bold text-charcoal"
            >
              Abrir logística
            </Link>
            <Link
              to="/central-agons-92x/producao"
              className="rounded-xl border border-cream/20 px-4 py-3 text-center font-bold"
            >
              Ver produção
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
