# Stripe na agô

O checkout usa uma página hospedada pela Stripe. Os preços, estoque, frete e cupons são recalculados no servidor antes da criação da sessão; o navegador nunca define o valor cobrado.

## Configuração local

1. Copie `.env.example` para `.env.local` para executar com Vite, ou `.dev.vars.example` para `.dev.vars` ao usar Wrangler.
2. Preencha `STRIPE_SECRET_KEY` com uma chave secreta de teste.
3. Encaminhe eventos com a Stripe CLI:

```bash
stripe listen --forward-to localhost:8080/api/stripe-webhook
```

4. Copie o `whsec_...` exibido pela CLI para `STRIPE_WEBHOOK_SECRET`.
5. Habilite Cartão e, conforme a disponibilidade da conta brasileira, Pix/Boleto no painel da Stripe.

O endpoint recebe estes eventos:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

## Cloudflare

Cadastre as variáveis como secrets, sem colocá-las no repositório:

```bash
npx wrangler secret put STRIPE_SECRET_KEY
npx wrangler secret put STRIPE_WEBHOOK_SECRET
```

No painel Stripe, registre o endpoint HTTPS de produção:

```text
https://SEU-DOMINIO/api/stripe-webhook
```

Pedidos, clientes, assinaturas e eventos da Stripe são persistidos no PostgreSQL. O `localStorage` é usado somente para preservar o carrinho e preferências de navegação no dispositivo.
