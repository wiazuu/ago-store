# Loja agô / Agons

Loja full-stack em TanStack Start, com checkout hospedado da Stripe, painel administrativo protegido, catálogo de refeições, Empório e e-mails transacionais via Resend. Em produção, conteúdo, produtos, aparência, pedidos, sessões, recuperação de senha e histórico de e-mails usam PostgreSQL.

## Desenvolvimento

1. Copie `.env.example` para `.env.local` e preencha os valores sem enviá-los ao Git.
2. Rode `npm install`.
3. Rode `npm run dev` e abra `http://localhost:8080`.
4. O painel fica em `/central-agons-92x/entrar`.

## E-mails automáticos

- Recuperação de senha de clientes cadastrados com link único de 30 minutos.
- Recuperação administrativa separada, sem misturar contas de clientes e operadores.
- E-mail de boas-vindas após o cadastro do cliente.
- Confirmação de pagamento validado pela Stripe.
- Pedido em preparação.
- Pedido saiu para entrega: “sua marmita está quase chegando”.
- Pedido entregue ou cancelado.
- Estoque baixo do Empório, com cinco unidades ou menos, enviado para a operação.

Os e-mails de andamento são idempotentes: o mesmo evento de um pedido não gera mensagens duplicadas.

Sem `DATABASE_URL`, o site público usa o conteúdo local de `.data` e o login de desenvolvimento usa as credenciais do ambiente. Produção recusa iniciar corretamente sem PostgreSQL e segredos.

## Comandos

- `npm run typecheck`: valida TypeScript.
- `npm run build`: gera o servidor em `.output`.
- `npm run db:generate`: cria uma migração após alterar o schema.
- `npm run db:migrate`: aplica migrações no banco configurado.
- `npm run db:import-local`: copia o conteúdo atual de `.data/ago-admin-content.json` para o PostgreSQL.
- `npm start`: inicia o build de produção.

Veja [DEPLOY.md](./DEPLOY.md) para publicação e [SECURITY.md](./SECURITY.md) para controles e checklist de pentest.
