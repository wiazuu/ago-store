import { createFileRoute } from "@tanstack/react-router";
import { useInstitutional } from "@/store/admin-store";
export const Route = createFileRoute("/termos")({ component: Terms });
function Terms() {
  const content = useInstitutional();
  return (
    <main className="container-page py-12 sm:py-20">
      <article className="mx-auto max-w-3xl rounded-3xl border bg-card p-6 sm:p-10">
        <p className="section-kicker">Transparência</p>
        <h1 className="font-display text-4xl">Termos de uso e compra</h1>
        <div className="mt-7 space-y-4 text-sm leading-7 text-muted-foreground">
          <p>
            Ao concluir um pedido, o cliente confirma que revisou os itens, dados de contato, forma
            de recebimento, endereço, data e período escolhidos.
          </p>
          <p>
            Os produtos são preparados por encomenda. Alterações e cancelamentos dependem do prazo
            de corte e do estágio de produção indicado na política de entrega.
          </p>
          <p>
            Informações nutricionais podem variar conforme ingredientes e porcionamento. Pessoas com
            alergias devem consultar os alergênicos de cada prato e falar com a equipe sobre risco
            de contaminação cruzada.
          </p>
          {content.terms && <p>{content.terms}</p>}
        </div>
      </article>
    </main>
  );
}
