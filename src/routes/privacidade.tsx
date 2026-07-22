import { createFileRoute } from "@tanstack/react-router";
import { useInstitutional } from "@/store/admin-store";
export const Route = createFileRoute("/privacidade")({ component: Privacy });
function Privacy() {
  const content = useInstitutional();
  return (
    <Legal title="Política de privacidade e LGPD">
      <p>
        Utilizamos os dados fornecidos pelo cliente para criar a conta, processar pagamentos,
        preparar pedidos, realizar entregas e prestar atendimento. Dados financeiros são processados
        pela Stripe e não são armazenados pela Agô.
      </p>
      <p>
        O cliente pode solicitar correção ou exclusão de seus dados pelo canal de atendimento
        informado no site, respeitadas as obrigações legais e fiscais de conservação.
      </p>
      {content.privacy && <p>{content.privacy}</p>}
    </Legal>
  );
}
function Legal({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="container-page py-12 sm:py-20">
      <article className="mx-auto max-w-3xl rounded-3xl border bg-card p-6 sm:p-10">
        <p className="section-kicker">Agô</p>
        <h1 className="font-display text-4xl">{title}</h1>
        <div className="prose prose-stone mt-7 max-w-none space-y-4 text-sm leading-7 text-muted-foreground">
          {children}
        </div>
      </article>
    </main>
  );
}
