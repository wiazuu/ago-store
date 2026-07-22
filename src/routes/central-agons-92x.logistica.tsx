import { createFileRoute } from "@tanstack/react-router";
import { MapPin, RefreshCw, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdminOperations } from "@/hooks/use-admin-operations";
export const Route = createFileRoute("/central-agons-92x/logistica")({ component: Logistics });
const statusLabel: Record<string, string> = {
  recebido: "Recebido",
  "em-preparacao": "Em preparação",
  pronto: "Pronto",
  "saiu-para-entrega": "Saiu para entrega",
  entregue: "Entregue",
  cancelado: "Cancelado",
  reembolsado: "Reembolsado",
};
function Logistics() {
  const { data, loading, error, load } = useAdminOperations();
  const orders = (data?.orders || [])
    .filter(
      (order) =>
        order.paymentStatus === "paid" &&
        !["entregue", "cancelado", "reembolsado"].includes(order.status),
    )
    .sort((a, b) => (a.deliveryDate || "9999").localeCompare(b.deliveryDate || "9999"));
  async function update(id: string, status: string) {
    if (
      status === "reembolsado" &&
      !window.confirm("Confirmar reembolso real deste pagamento na Stripe?")
    )
      return;
    const response = await fetch("/api/orders", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-csrf-token": sessionStorage.getItem("ago-admin-csrf") || "",
      },
      body: JSON.stringify({ id, status }),
    });
    if (response.ok) await load();
  }
  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <p className="section-kicker">Operação</p>
          <h1 className="font-display text-3xl">Logística</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Entregas e retiradas organizadas por data e período.
          </p>
        </div>
        <Button variant="outline" onClick={() => void load()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Atualizar
        </Button>
      </header>
      {error && <p className="text-destructive">{error}</p>}
      {loading ? (
        <p>Carregando...</p>
      ) : orders.length === 0 ? (
        <div className="rounded-3xl border border-dashed p-10 text-center text-muted-foreground">
          Nenhuma entrega pendente.
        </div>
      ) : (
        <div className="grid gap-4">
          {orders.map((order) => (
            <article key={order.id} className="rounded-2xl border bg-card p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                <div
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${order.fulfillmentType === "pickup" ? "bg-green-soft text-secondary" : "bg-orange-soft text-primary-dark"}`}
                >
                  {order.fulfillmentType === "pickup" ? <MapPin /> : <Truck />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap gap-x-3">
                    <strong>{order.customer.name}</strong>
                    <span className="text-sm text-muted-foreground">{order.customer.phone}</span>
                  </div>
                  <p className="mt-1 text-sm">
                    {order.fulfillmentType === "pickup"
                      ? "Retirada no local"
                      : `${order.delivery.street || ""}, ${order.delivery.number || ""} · ${order.delivery.district || ""}`}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {order.deliveryDate
                      ? new Date(`${order.deliveryDate}T12:00:00`).toLocaleDateString("pt-BR")
                      : "Sem data"}{" "}
                    · {order.deliveryWindow || "sem período"} · {order.id}
                  </p>
                </div>
                <select
                  className="h-10 rounded-md border bg-background px-3 text-sm"
                  value={order.status}
                  onChange={(e) => void update(order.id, e.target.value)}
                >
                  {Object.entries(statusLabel).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
