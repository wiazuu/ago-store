# Segurança e preparação para pentest

## Controles implementados

- Senhas administrativas com Argon2id no PostgreSQL.
- Sessões aleatórias, armazenadas apenas como hash, cookie `HttpOnly`, `SameSite=Strict`, `Secure` e prefixo `__Host-` em produção; expiração de 8 horas e logout revogável.
- Token CSRF por sessão e validação de origem nas operações administrativas e checkout.
- Bloqueio de login após cinco falhas em quinze minutos e rate limit do checkout.
- Consultas parametrizadas pelo Drizzle ORM, validação Zod nas novas APIs e limites de tamanho.
- CSP, HSTS, proteção contra framing, MIME sniffing e restrição de recursos do navegador.
- Webhook Stripe validado por assinatura e eventos processados de forma idempotente.
- Recuperação de senha com resposta genérica, token aleatório armazenado apenas como hash, validade de 30 minutos, uso único, rate limit e revogação de todas as sessões após a troca.
- Contas, sessões e tokens de recuperação dos clientes são isolados das credenciais administrativas.
- Registro idempotente dos e-mails enviados, sem colocar tokens de recuperação nos logs.
- Auditoria de login, publicação, Empório e mudança de status de pedido.
- Segredos exclusivamente por variáveis de ambiente; `.env*` fora da imagem e do Git.

## Antes do pentest/produção

“Pronto para pentest” significa possuir uma base testável, não garantir ausência de falhas. Antes de aceitar pagamentos reais:

1. Contrate um pentest independente em ambiente de homologação e corrija os achados.
2. Faça varredura SAST/dependências no CI, execute DAST e confirme que nenhum segredo entrou no histórico Git.
3. Mova o rate limiting para Redis se houver mais de uma instância do serviço; a limitação geral de checkout atual é por processo. O bloqueio de login já é compartilhado via PostgreSQL.
4. Restrinja acesso ao banco, habilite alertas, backups e rotação periódica de segredos.
5. Revise LGPD, política de privacidade, retenção de dados, acesso de operadores e processo de incidente.
6. Remova contas administrativas inativas e troque imediatamente a senha inicial após criar uma interface/rotina controlada de alteração de senha.
7. Após estabilizar o frontend, substitua `unsafe-inline` da CSP por nonces por requisição para endurecimento adicional.

Não exponha chaves `sk_`, `whsec_`, URLs externas do banco, senhas ou conteúdo de `.env.local` em tickets, prints ou logs.
