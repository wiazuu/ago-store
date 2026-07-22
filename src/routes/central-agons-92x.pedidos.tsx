import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/central-agons-92x/pedidos")({ component: AdminOrders });
type Order = {
  id: string;
  customer: { name?: string; email?: string; phone?: string };
  delivery: { scheduledDate?: string; fulfillmentType?: string };
  fulfillmentType: string;
  deliveryDate: string | null;
  deliveryWindow: string | null;
  items: { name: string; qty: number }[];
  totalCents: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
};
const statuses = [
  "recebido",
  "em-preparacao",
  "pronto",
  "saiu-para-entrega",
  "entregue",
  "cancelado",
  "reembolsado",
] as const;
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const paymentLabels: Record<string, string> = {
  paid: "Pago",
  unpaid: "Aguardando confirmaÃ§Ã£o",
  failed: "Falhou",
  refunded: "Reembolsado",
  no_payment_required: "Pago",
};

function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    const response = await fetch("/api/orders", { cache: "no-store" });
    const data = (await response.json()) as { orders?: Order[]; error?: string };
    if (!response.ok) setError(data.error || "Falha ao carregar pedidos.");
    else {
      setOrders(data.orders || []);
      setError("");
    }
    setLoading(false);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  async function update(id: string, status: string) {
    if (
      status === "reembolsado" &&
      !window.confirm(
        "Confirmar reembolso real deste pagamento na Stripe? Esta ação não pode ser desfeita.",
      )
    )
      return;
    if (status === "cancelado" && !window.confirm("Confirmar o cancelamento deste pedido?")) return;
    const response = await fetch("/api/orders", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": sessionStorage.getItem("ago-admin-csrf") || "",
      },
      body: JSON.stringify({ id, status }),
    });
    if (response.ok)
      setOrders((current) =>
        current.map((order) => (order.id === id ? { ...order, status } : order)),
      );
    else setError("Não foi possível atualizar o pedido.");
  }
  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="section-kicker">Operação</p>
          <h1 className="font-display text-3xl">Pedidos</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Pagamento, produção e atendimento em um único lugar.
          </p>
        </div>
        <Button variant="outline" onClick={() => void load()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Atualizar
        </Button>
      </header>
      {error && (
        <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
      )}
      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : orders.length === 0 ? (
        <div className="rounded-3xl border border-dashed bg-card p-10 text-center">
          <h2 className="font-display text-2xl">Nenhum pedido ainda</h2>
          <p className="mt-2 text-muted-foreground">
            Pedidos criados no checkout serão registrados aqui.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-muted text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-3 text-left">Pedido</th>
                  <th className="p-3 text-left">Cliente</th>
                  <th className="p-3 text-left">Itens</th>
                  <th className="p-3 text-left">Atendimento</th>
                  <th className="p-3 text-right">Total</th>
                  <th className="p-3 text-left">Pagamento</th>
                  <th className="p-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-t align-top">
                    <td className="p-3 font-mono text-xs">
                      {order.id}
                      <div className="mt-1 text-muted-foreground">
                        {new Date(order.createdAt).toLocaleString("pt-BR")}
                      </div>
                    </td>
                    <td className="p-3">
                      <strong>{order.customer?.name || "Cliente"}</strong>
                      <div className="text-xs text-muted-foreground">
                        {order.customer?.email}
                        <br />
                        {order.customer?.phone}
                      </div>
                    </td>
                    <td className="max-w-64 p-3 text-xs">
                      {(order.items || []).map((item) => `${item.qty}× ${item.name}`).join(" · ")}
                    </td>
                    <td className="p-3">
                      {order.fulfillmentType === "pickup" ? "Retirada" : "Entrega"}
                      <div className="text-xs text-muted-foreground">
                        {order.deliveryDate || "Sem data"} · {order.deliveryWindow || "—"}
                      </div>
                    </td>
                    <td className="p-3 text-right font-bold">
                      {money.format(order.totalCents / 100)}
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                          order.paymentStatus === "paid"
                            ? "bg-secondary/10 text-secondary"
                            : order.paymentStatus === "failed"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-primary/15 text-charcoal"
                        }`}
                      >
                        {paymentLabels[order.paymentStatus] || order.paymentStatus}
                      </span>
                    </td>
                    <td className="p-3">
                      <Select
                        value={order.status}
                        onValueChange={(value) => void update(order.id, value)}
                        disabled={
                          order.status === "aguardando-pagamento" ||
                          order.status === "pagamento-falhou"
                        }
                      >
                        <SelectTrigger className="w-44">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statuses.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
