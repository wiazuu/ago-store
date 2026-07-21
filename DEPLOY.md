# Publicação da loja agô

## Arquitetura inicial sem mensalidade

- Render Free: frontend e backend juntos, construídos pelo `Dockerfile`.
- Neon Free: PostgreSQL persistente.
- Resend Free: e-mails transacionais.
- Stripe: checkout; cobra uma taxa somente quando há pagamento.

O banco gratuito do Render não é usado porque expira. No plano gratuito, o Web Service do Render suspende depois de um período sem visitas; o primeiro acesso seguinte pode levar cerca de um minuto. Essa configuração é adequada para testes e lançamento inicial. Antes de depender da loja para vendas diárias, use um serviço sem suspensão e habilite backups do banco.

## 1. Criar o banco no Neon

1. Crie uma conta em `https://neon.tech` e clique em **Create project**.
2. Escolha uma região próxima e mantenha PostgreSQL como banco.
3. Abra **Connect** e selecione a conexão com pool. O host dessa URL normalmente contém `-pooler`.
4. Copie a URL completa `postgresql://...` e guarde-a em um gerenciador de senhas. Ela será a variável `DATABASE_URL`.
5. Nunca coloque essa URL em arquivos enviados ao GitHub.

## 2. Colocar o projeto em um repositório privado

Crie um repositório privado no GitHub, GitLab ou Bitbucket. Esta pasta ainda precisa ser inicializada com Git. Os arquivos `.env.local` e `.data` já estão ignorados e não serão enviados.

## 3. Criar a aplicação no Render

1. No Render, escolha **New > Blueprint**.
2. Conecte o repositório e selecione o arquivo `render.yaml`.
3. Preencha as variáveis solicitadas:
   - `DATABASE_URL`: URL com pool copiada do Neon.
   - `ADMIN_INITIAL_USERNAME`: usuário inicial do painel.
   - `ADMIN_INITIAL_EMAIL`: e-mail do administrador.
   - `ADMIN_INITIAL_PASSWORD`: senha única de pelo menos 12 caracteres.
   - `ADMIN_NOTIFICATION_EMAIL`: endereço que recebe avisos de estoque.
   - `RESEND_API_KEY`, `EMAIL_FROM` e `EMAIL_REPLY_TO`: podem ser configuradas depois.
   - `STRIPE_SECRET_KEY`: use `sk_test_...` durante os testes.
   - `STRIPE_WEBHOOK_SECRET`: pode ser configurada após criar o webhook.
4. Aguarde o build. O container executa as migrações no Neon antes de iniciar o servidor.
5. Copie a URL final `https://...onrender.com`.
6. Em **Environment**, crie `PUBLIC_SITE_URL` com essa URL exata e faça novo deploy.
7. Teste `/api/health`; a resposta deve ter `{"status":"ok"}`.

## 4. Importar o conteúdo local atual

No PowerShell, dentro do projeto, execute usando a mesma URL do Neon:

```powershell
$env:DATABASE_URL='cole-a-url-do-neon-aqui'
$env:DATABASE_SSL='true'
npm run db:migrate
npm run db:import-local
Remove-Item Env:DATABASE_URL
Remove-Item Env:DATABASE_SSL
```

Depois teste a home, Empório, login administrativo, publicação, cadastro de cliente e checkout.

## 5. Stripe

1. Use chaves de teste até concluir compras ponta a ponta.
2. No Stripe Dashboard, crie um webhook para `https://SEU-SITE.onrender.com/api/stripe-webhook`.
3. Selecione `checkout.session.completed`, `checkout.session.async_payment_succeeded` e `checkout.session.async_payment_failed`.
4. Copie o segredo `whsec_...` para `STRIPE_WEBHOOK_SECRET` no Render.
5. Faça um pagamento de teste e confirme que o pedido aparece no painel.
6. Quando o domínio estiver ativo, crie o endpoint equivalente para `https://agons.com.br/api/stripe-webhook` antes de remover o endereço antigo.

## 6. E-mails e recuperação de senha

1. Crie uma conta no Resend.
2. Antes do domínio próprio, o Resend permite testes limitados com o remetente de teste. Para enviar a clientes, registre e valide `agons.com.br` no Resend.
3. Configure no Render `RESEND_API_KEY`, `EMAIL_FROM` e `EMAIL_REPLY_TO`.
4. Teste o cadastro e **Esqueci minha senha** de clientes em `/esqueci-senha`.
5. Teste também a recuperação administrativa em `/central-agons-92x/esqueci-senha`.
6. Em um pedido de teste, altere o status para preparação, saiu para entrega e entregue; confira cada e-mail.

## 7. Domínio e HTTPS

1. Depois de registrar `agons.com.br`, abra **Settings > Custom Domains** no serviço do Render.
2. Adicione `agons.com.br` e `www.agons.com.br`.
3. Copie exatamente os registros exibidos para o painel DNS do registrador.
4. Após a validação, altere `PUBLIC_SITE_URL` para `https://agons.com.br`.
5. O Render gera e renova o certificado HTTPS automaticamente.

## 8. Atualizações futuras

1. Faça a alteração local.
2. Rode `npm run typecheck` e `npm run build`.
3. Faça commit e envie para a branch conectada.
4. O Render fará o novo deploy e aplicará migrações pendentes.
5. Confira `/api/health` e faça um teste rápido do painel e do checkout.

Não altere uma migração já aplicada. Para mudanças no banco, atualize `src/db/schema.ts` e rode `npm run db:generate` para criar uma nova migração.

## Backup

O plano gratuito serve para iniciar, mas não substitui uma política de backup. Exporte o banco antes de migrações grandes e habilite retenção compatível com o plano escolhido antes de operar vendas importantes. Os dados de cartão não passam pela aplicação; o pagamento acontece na página hospedada pela Stripe.

Referências oficiais: [Render Free](https://render.com/docs/free), [Render Blueprints](https://render.com/docs/infrastructure-as-code), [domínios no Render](https://render.com/docs/custom-domains), [conexão no Neon](https://neon.com/docs/connect/connect-from-any-app) e [Resend Domains](https://resend.com/docs/dashboard/domains/introduction).
