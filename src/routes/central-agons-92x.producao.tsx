import { createFileRoute } from "@tanstack/react-router";
import { ChefHat, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAdminOperations } from "@/hooks/use-admin-operations";
export const Route = createFileRoute("/central-agons-92x/producao")({ component: Production });
function Production() {
  const { data, loading } = useAdminOperations();
  const groups = new Map<string, { day: string; productId: string; name: string; qty: number }[]>();
  for (const item of data?.production || [])
    groups.set(item.day, [...(groups.get(item.day) || []), item]);
  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <p className="section-kicker">Cozinha</p>
          <h1 className="font-display text-3xl">Mapa de produção</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Quantidades consolidadas dos pedidos pagos, sem controle artificial de estoque.
          </p>
        </div>
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="mr-2 h-4 w-4" />
          Imprimir
        </Button>
      </header>
      {loading ? (
        <p>Carregando...</p>
      ) : groups.size === 0 ? (
        <div className="rounded-3xl border border-dashed p-10 text-center text-muted-foreground">
          Nenhuma produção programada.
        </div>
      ) : (
        Array.from(groups).map(([day, items]) => (
          <section key={day} className="rounded-3xl border bg-card p-5">
            <h2 className="flex items-center gap-2 font-display text-2xl">
              <ChefHat className="text-primary-dark" />
              {new Date(`${day}T12:00:00`).toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "2-digit",
                month: "long",
              })}
            </h2>
            <div className="mt-4 overflow-hidden rounded-xl border">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-3 text-left">Refeição/kit</th>
                    <th className="p-3 text-right">Quantidade</th>
                  </tr>
                </thead>
                <tbody>
                  {items?.map((item) => (
                    <tr key={item.productId} className="border-t">
                      <td className="p-3 font-medium">{item.name}</td>
                      <td className="p-3 text-right text-lg font-bold">{item.qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))
      )}
    </div>
  );
}
