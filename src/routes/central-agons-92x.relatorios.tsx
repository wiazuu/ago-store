import { createFileRoute } from "@tanstack/react-router";
import { Download, MailWarning, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdminOperations } from "@/hooks/use-admin-operations";
import { brl } from "@/lib/format";
import { useState } from "react";
import { toast } from "sonner";
export const Route = createFileRoute("/central-agons-92x/relatorios")({ component: Reports });
function Reports() {
  const { data, loading, load } = useAdminOperations();
  const [retrying, setRetrying] = useState(false);
  async function retryFailedEmails() {
    if (retrying) return;
    setRetrying(true);
    try {
      const response = await fetch("/api/admin-emails-retry", {
        method: "POST",
        headers: { "x-csrf-token": sessionStorage.getItem("ago-admin-csrf") || "" },
      });
      const result = (await response.json()) as {
        error?: string;
        attempted?: number;
        sent?: number;
        failed?: number;
        skipped?: number;
      };
      if (!response.ok) throw new Error(result.error || "Não foi possível reenviar os e-mails.");
      toast.success(
        `${result.sent || 0} e-mail(s) reenviado(s). ${result.skipped || 0} ignorado(s).`,
      );
      await load();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Falha ao reenviar e-mails.");
    } finally {
      setRetrying(false);
    }
  }
  function download() {
    if (!data) return;
    const rows = [
      ["pedido", "cliente", "email", "data", "status", "pagamento", "total"],
      ...data.orders.map((order) => [
        order.id,
        order.customer.name || "",
        order.customer.email || "",
        order.createdAt,
        order.status,
        order.paymentStatus,
        String(order.totalCents / 100),
      ]),
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(";"))
      .join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv" }));
    link.download = `pedidos-ago-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }
  if (loading || !data) return <p>Carregando...</p>;
  const cards = [
    ["Faturamento", brl(data.metrics.revenueCents / 100)],
    ["Pedidos pagos", data.metrics.paidOrders],
    ["Ticket médio", brl(data.metrics.averageTicketCents / 100)],
    ["Clientes", data.metrics.activeCustomers],
  ];
  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <p className="section-kicker">Inteligência operacional</p>
          <h1 className="font-display text-3xl">Relatórios e auditoria</h1>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={retryFailedEmails} disabled={retrying}>
            <RefreshCw className={`mr-2 h-4 w-4 ${retrying ? "animate-spin" : ""}`} />
            {retrying ? "Reenviando..." : "Reenviar e-mails com falha"}
          </Button>
          <Button onClick={download}>
            <Download className="mr-2 h-4 w-4" />
            Exportar pedidos
          </Button>
        </div>
      </header>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map(([label, value]) => (
          <div key={label as string} className="rounded-2xl bg-card p-5 brand-shadow">
            <div className="font-display text-2xl">{value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border bg-card p-5">
          <h2 className="flex items-center gap-2 font-display text-xl">
            <ShieldCheck className="text-secondary" />
            Últimas alterações
          </h2>
          <ul className="mt-4 divide-y text-sm">
            {data.audits.slice(0, 30).map((audit) => (
              <li key={audit.id} className="py-3">
                <strong>{audit.action}</strong> · {audit.entity}
                {audit.entityId ? ` ${audit.entityId}` : ""}
                <div className="text-xs text-muted-foreground">
                  {new Date(audit.createdAt).toLocaleString("pt-BR")}
                </div>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-2xl border bg-card p-5">
          <h2 className="flex items-center gap-2 font-display text-xl">
            <MailWarning className="text-primary-dark" />
            Entregas de e-mail
          </h2>
          <ul className="mt-4 divide-y text-sm">
            {data.emails.slice(0, 30).map((email) => (
              <li key={email.eventKey} className="py-3">
                <strong>{email.type}</strong> · {email.recipient}
                <div
                  className={`text-xs ${email.status === "sent" ? "text-secondary" : "text-destructive"}`}
                >
                  {email.status}
                  {email.error ? ` · ${email.error}` : ""}
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
