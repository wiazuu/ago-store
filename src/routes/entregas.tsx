import { createFileRoute } from "@tanstack/react-router";
import { useInstitutional } from "@/store/admin-store";
export const Route = createFileRoute("/entregas")({ component: DeliveryPolicy });
function DeliveryPolicy() {
  const content = useInstitutional();
  return (
    <main className="container-page py-12 sm:py-20">
      <article className="mx-auto max-w-3xl rounded-3xl border bg-card p-6 sm:p-10">
        <p className="section-kicker">Atendimento em Manaus</p>
        <h1 className="font-display text-4xl">Entregas, retiradas e cancelamentos</h1>
        <div className="mt-7 space-y-4 text-sm leading-7 text-muted-foreground">
          <p>
            <strong>Entrega:</strong> taxa fixa de R$ 15 para endereços localizados em Manaus/AM.
          </p>
          <p>
            <strong>Retirada:</strong> gratuita, na data e período escolhidos durante a compra. O
            endereço e as instruções de retirada são confirmados pela equipe.
          </p>
          <p>
            <strong>Agenda:</strong> datas podem fechar quando a capacidade de produção for atingida
            ou após o prazo de corte configurado no calendário.
          </p>
          <p>
            <strong>Prazo de produção:</strong> reservamos dois dias completos para preparar as
            refeições. Por exemplo, um pedido feito no dia 23 pode ser agendado a partir do dia 26.
          </p>
          <p>
            <strong>Pagamento:</strong> pedidos que não forem pagos em até 15 minutos serão
            cancelados automaticamente e deixarão de reservar vaga na produção.
          </p>
          <p>
            <strong>Alteração ou cancelamento:</strong> entre em contato antes do prazo de corte.
            Após o início da produção, a solicitação será analisada conforme o estágio do pedido.
          </p>
          {content.deliveryArea && <p>{content.deliveryArea}</p>}
        </div>
      </article>
    </main>
  );
}
