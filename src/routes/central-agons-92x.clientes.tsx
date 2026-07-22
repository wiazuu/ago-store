import { createFileRoute } from "@tanstack/react-router";
import { Search, Users } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useAdminOperations } from "@/hooks/use-admin-operations";
import { brl } from "@/lib/format";
export const Route = createFileRoute("/central-agons-92x/clientes")({ component: Customers });
function Customers() {
  const { data, loading } = useAdminOperations();
  const [search, setSearch] = useState("");
  const customers = (data?.customers || []).filter((item) =>
    `${item.name} ${item.email} ${item.phone}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="space-y-6">
      <header>
        <p className="section-kicker">Relacionamento</p>
        <h1 className="font-display text-3xl">Clientes</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Contato, frequência e valor acumulado de cada cliente cadastrado.
        </p>
      </header>
      <div className="relative max-w-lg">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar nome, e-mail ou telefone"
        />
      </div>
      {loading ? (
        <p>Carregando...</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="p-3 text-left">Cliente</th>
                <th className="p-3 text-left">WhatsApp</th>
                <th className="p-3 text-right">Pedidos</th>
                <th className="p-3 text-right">Total comprado</th>
                <th className="p-3 text-left">Cadastro</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id} className="border-t">
                  <td className="p-3">
                    <strong>{customer.name}</strong>
                    <div className="text-xs text-muted-foreground">{customer.email}</div>
                  </td>
                  <td className="p-3">
                    {customer.phone ? (
                      <a
                        className="font-bold text-secondary"
                        href={`https://wa.me/55${customer.phone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {customer.phone}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="p-3 text-right">{customer.orders}</td>
                  <td className="p-3 text-right font-bold">{brl(customer.spentCents / 100)}</td>
                  <td className="p-3">
                    {new Date(customer.createdAt).toLocaleDateString("pt-BR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {customers.length === 0 && (
            <p className="p-10 text-center text-muted-foreground">
              <Users className="mx-auto mb-2" />
              Nenhum cliente encontrado.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
