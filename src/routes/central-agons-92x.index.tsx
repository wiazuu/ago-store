import { createFileRoute, Link } from "@tanstack/react-router";
import { useAdminStore } from "@/store/admin-store";
import { brl } from "@/lib/format";
import {
  Package,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Tags,
  Ticket,
  Image,
} from "lucide-react";
import { BarChart, Bar, ResponsiveContainer, XAxis, Tooltip, PieChart, Pie, Cell } from "recharts";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export const Route = createFileRoute("/central-agons-92x/")({ component: AdminDashboard });

function Card({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="bg-card p-5 rounded-2xl brand-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="text-2xl font-display">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
      {hint && <div className="text-[10px] text-secondary mt-1">{hint}</div>}
    </div>
  );
}

function AdminDashboard() {
  const s = useAdminStore();
  const revenue = s.orders.reduce((a, o) => a + o.total, 0);
  const today = s.orders.filter(
    (o) => new Date(o.createdAt).toDateString() === new Date().toDateString(),
  ).length;
  const outOfStock = s.products.filter((p) => p.stock === 0).length;

  const byCategory = s.categories
    .map((c) => ({
      name: c.name.split(" ")[0],
      value: s.products.filter((p) => p.categoryId === c.id).length,
    }))
    .filter((x) => x.value > 0)
    .slice(0, 8);

  const topProducts = [...s.products]
    .sort((a, b) => (b.bestSeller ? 1 : 0) - (a.bestSeller ? 1 : 0))
    .slice(0, 5);

  const COLORS = [
    "oklch(0.79 0.15 75)",
    "oklch(0.55 0.09 130)",
    "oklch(0.62 0.16 40)",
    "oklch(0.7 0.14 55)",
    "oklch(0.6 0.14 140)",
    "oklch(0.35 0.05 60)",
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card
          icon={Package}
          label="Produtos ativos"
          value={s.products.filter((p) => p.active).length}
        />
        <Card icon={ShoppingCart} label="Pedidos hoje" value={today} />
        <Card icon={DollarSign} label="Faturamento estimado" value={brl(revenue)} />
        <Card
          icon={AlertCircle}
          label="Sem estoque"
          value={outOfStock}
          hint={outOfStock > 0 ? "Precisa de atenção" : "Tudo ok"}
        />
        <Card
          icon={Tags}
          label="Categorias ativas"
          value={s.categories.filter((c) => c.active).length}
        />
        <Card
          icon={Ticket}
          label="Cupons ativos"
          value={s.coupons.filter((c) => c.active).length}
        />
        <Card
          icon={Image}
          label="Banners ativos"
          value={s.banners.filter((b) => b.active).length}
        />
        <Card icon={TrendingUp} label="Kits ativos" value={s.kits.filter((k) => k.active).length} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-card p-6 rounded-2xl brand-shadow">
          <h3 className="font-display text-lg mb-4">Produtos por categoria</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={byCategory}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" fill="oklch(0.79 0.15 75)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card p-6 rounded-2xl brand-shadow">
          <h3 className="font-display text-lg mb-4">Distribuição do catálogo</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={byCategory}
                dataKey="value"
                nameKey="name"
                innerRadius={50}
                outerRadius={90}
              >
                {byCategory.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-card p-6 rounded-2xl brand-shadow">
          <h3 className="font-display text-lg mb-4">Mais vendidos</h3>
          <ul className="divide-y">
            {topProducts.map((p) => (
              <li key={p.id} className="py-3 flex items-center gap-3">
                <img src={p.image} alt="" className="w-10 h-10 rounded-lg object-cover" />
                <div className="flex-1">
                  <div className="text-sm font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{brl(p.price)}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-card p-6 rounded-2xl brand-shadow">
          <h3 className="font-display text-lg mb-4">Pedidos recentes</h3>
          <ul className="divide-y">
            {s.orders.slice(0, 5).map((o) => (
              <li key={o.id} className="py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">
                    {o.number} · {o.customer.name}
                  </div>
                  <div className="text-xs text-muted-foreground">{o.status}</div>
                </div>
                <div className="text-sm font-medium">{brl(o.total)}</div>
              </li>
            ))}
          </ul>
          <Link to="/central-agons-92x/pedidos" className="text-primary text-sm mt-3 inline-block">
            Ver todos →
          </Link>
        </div>
      </div>
    </div>
  );
}
