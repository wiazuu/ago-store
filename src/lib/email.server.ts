import "@tanstack/react-start/server-only";
import { desc, eq, inArray } from "drizzle-orm";
import { Resend } from "resend";
import { customerUsers, emailDeliveries, shopOrders } from "@/db/schema";
import { getDatabase, hasDatabase } from "@/db/client.server";
import { readAdminContent } from "@/lib/admin-content.server";

type EmailMessage = {
  eventKey: string;
  type: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  orderId?: string;
};
type DeliveryOptions = { retry?: boolean };
let client: Resend | undefined;

function escapeHtml(value: unknown) {
  return String(value ?? "").replace(
    /[&<>'"]/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ||
      character,
  );
}

function layout(title: string, body: string, preheader: string) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(title)}</title></head><body style="margin:0;background:#fff6e6;font-family:Arial,sans-serif;color:#27241f"><div style="display:none;max-height:0;overflow:hidden">${escapeHtml(preheader)}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:32px 16px"><table role="presentation" width="100%" style="max-width:620px;background:#fff;border-radius:24px;overflow:hidden;border:1px solid #eadfce"><tr><td style="background:#f5a623;padding:22px 28px;font-size:30px;font-weight:800">agô</td></tr><tr><td style="padding:32px 28px"><h1 style="margin:0 0 18px;font-size:28px">${escapeHtml(title)}</h1>${body}<p style="margin:28px 0 0;color:#6f685f;font-size:13px">Mensagem automática da agô. Se precisar, responda este e-mail para falar com a equipe.</p></td></tr></table></td></tr></table></body></html>`;
}

export async function sendTransactionalEmail(message: EmailMessage, options: DeliveryOptions = {}) {
  if (!message.to || !message.to.includes("@")) return { sent: false, reason: "invalid_recipient" };
  let claimed = true;
  if (hasDatabase()) {
    const db = getDatabase();
    if (options.retry) {
      const existing = await db
        .select({ status: emailDeliveries.status })
        .from(emailDeliveries)
        .where(eq(emailDeliveries.eventKey, message.eventKey))
        .limit(1);
      claimed = Boolean(existing[0] && existing[0].status !== "sent");
      if (claimed)
        await db
          .update(emailDeliveries)
          .set({ status: "pending", error: null })
          .where(eq(emailDeliveries.eventKey, message.eventKey));
    } else {
      const rows = await db
        .insert(emailDeliveries)
        .values({
          eventKey: message.eventKey,
          type: message.type,
          recipient: message.to.toLowerCase(),
          orderId: message.orderId,
        })
        .onConflictDoNothing()
        .returning({ key: emailDeliveries.eventKey });
      claimed = rows.length > 0;
    }
  }
  if (!claimed) return { sent: false, reason: "duplicate" };

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    if (hasDatabase())
      await getDatabase()
        .update(emailDeliveries)
        .set({ status: "configuration_missing", error: "RESEND_API_KEY ou EMAIL_FROM ausente" })
        .where(eq(emailDeliveries.eventKey, message.eventKey));
    console.info("ago.email.skipped", { type: message.type, recipient: message.to });
    return { sent: false, reason: "configuration_missing" };
  }

  client ||= new Resend(apiKey);
  try {
    const { data, error } = await client.emails.send({
      from,
      to: [message.to],
      replyTo: process.env.EMAIL_REPLY_TO,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
    if (error) throw new Error(error.message);
    if (hasDatabase())
      await getDatabase()
        .update(emailDeliveries)
        .set({ status: "sent", providerId: data?.id, sentAt: new Date(), error: null })
        .where(eq(emailDeliveries.eventKey, message.eventKey));
    return { sent: true, id: data?.id };
  } catch (cause) {
    const error = cause instanceof Error ? cause.message.slice(0, 1000) : "Falha desconhecida";
    if (hasDatabase())
      await getDatabase()
        .update(emailDeliveries)
        .set({ status: "failed", error })
        .where(eq(emailDeliveries.eventKey, message.eventKey));
    console.error("ago.email.failed", { type: message.type, error });
    return { sent: false, reason: "provider_error" };
  }
}

export async function sendPasswordResetEmail(input: {
  to: string;
  name: string;
  resetUrl: string;
  tokenHash: string;
}) {
  const title = "Redefina sua senha do painel";
  const button = `<p>Olá, ${escapeHtml(input.name)}.</p><p>Recebemos uma solicitação para trocar a senha do painel administrativo. O link expira em 30 minutos e pode ser usado uma única vez.</p><p style="margin:28px 0"><a href="${escapeHtml(input.resetUrl)}" style="display:inline-block;background:#f5a623;color:#27241f;text-decoration:none;font-weight:800;padding:14px 22px;border-radius:999px">Criar nova senha</a></p><p style="font-size:13px;color:#6f685f">Se você não fez este pedido, ignore a mensagem. Sua senha atual continuará válida.</p>`;
  return sendTransactionalEmail({
    eventKey: `password-reset:${input.tokenHash}`,
    type: "admin.password_reset",
    to: input.to,
    subject: title,
    html: layout(title, button, "Link seguro para redefinir sua senha"),
    text: `Olá, ${input.name}. Redefina sua senha em ${input.resetUrl}. O link expira em 30 minutos. Se você não solicitou, ignore esta mensagem.`,
  });
}

export async function sendCustomerPasswordResetEmail(input: {
  to: string;
  name: string;
  resetUrl: string;
  tokenHash: string;
}) {
  const title = "Redefina sua senha da loja agô";
  const body = `<p>Olá, ${escapeHtml(input.name)}.</p><p>Recebemos uma solicitação para trocar a senha da sua conta na loja. Este link expira em 30 minutos e só funciona uma vez.</p><p style="margin:28px 0"><a href="${escapeHtml(input.resetUrl)}" style="display:inline-block;background:#f5a623;color:#27241f;text-decoration:none;font-weight:800;padding:14px 22px;border-radius:999px">Criar nova senha</a></p><p style="font-size:13px;color:#6f685f">Não pediu essa alteração? Ignore esta mensagem; sua senha atual continuará funcionando.</p>`;
  return sendTransactionalEmail({
    eventKey: `customer-password-reset:${input.tokenHash}`,
    type: "customer.password_reset",
    to: input.to,
    subject: title,
    html: layout(title, body, "Link seguro para recuperar sua conta"),
    text: `Olá, ${input.name}. Redefina sua senha em ${input.resetUrl}. O link expira em 30 minutos. Se não solicitou, ignore.`,
  });
}

export async function sendCustomerWelcomeEmail(input: {
  id: string;
  to: string;
  name: string;
  retry?: boolean;
}) {
  const title = "Bem-vindo à agô!";
  const storeUrl = process.env.PUBLIC_SITE_URL || "https://agogf.com.br";
  const body = `<p>Olá, ${escapeHtml(input.name)}.</p><p>Sua conta foi criada com sucesso. Agora você pode entrar na loja com seu e-mail e senha.</p><p style="margin:28px 0"><a href="${escapeHtml(storeUrl)}" style="display:inline-block;background:#f5a623;color:#27241f;text-decoration:none;font-weight:800;padding:14px 22px;border-radius:999px">Conhecer o cardápio</a></p>`;
  return sendTransactionalEmail(
    {
      eventKey: `customer-welcome:${input.id}`,
      type: "customer.welcome",
      to: input.to,
      subject: title,
      html: layout(title, body, "Sua conta na agô foi criada"),
      text: `Olá, ${input.name}. Sua conta na loja agô foi criada com sucesso. Acesse ${storeUrl}.`,
    },
    { retry: input.retry },
  );
}

type OrderEmail = {
  id: string;
  customer: unknown;
  delivery: unknown;
  totalCents: number;
  status: string;
};
export async function sendOrderStatusEmail(
  order: OrderEmail,
  event:
    | "paid"
    | "preparing"
    | "ready"
    | "out_for_delivery"
    | "delivered"
    | "cancelled"
    | "payment_failed"
    | "refunded",
  options: DeliveryOptions = {},
) {
  const customer = (order.customer && typeof order.customer === "object" ? order.customer : {}) as {
    name?: string;
    email?: string;
  };
  if (!customer.email) return;
  const content = {
    paid: {
      subject: "Pagamento confirmado — seu pedido foi recebido",
      heading: "Pedido confirmado!",
      message: "O pagamento foi aprovado e sua compra já entrou na nossa fila de preparação.",
    },
    preparing: {
      subject: "Seu pedido está sendo preparado",
      heading: "Tudo sendo preparado com carinho",
      message: "Nossa equipe já está separando e preparando os itens do seu pedido.",
    },
    ready: {
      subject: "Seu pedido está pronto",
      heading: "Tudo pronto!",
      message:
        "Seu pedido está pronto para a próxima etapa. Se escolheu retirada, confira a orientação da equipe.",
    },
    out_for_delivery: {
      subject: "Sua marmita está quase chegando!",
      heading: "Seu pedido saiu para entrega",
      message: "Pode se preparar: sua comida está a caminho e deve chegar em breve.",
    },
    delivered: {
      subject: "Pedido entregue — bom apetite!",
      heading: "Chegou!",
      message: "Seu pedido foi marcado como entregue. Esperamos que você aproveite cada refeição.",
    },
    cancelled: {
      subject: "Atualização sobre o cancelamento do pedido",
      heading: "Pedido cancelado",
      message:
        "Seu pedido foi cancelado. Se você não esperava por isso, fale com nossa equipe para verificarmos.",
    },
    payment_failed: {
      subject: "Não conseguimos confirmar seu pagamento",
      heading: "Pagamento não confirmado",
      message:
        "O pagamento do seu pedido não foi concluído. Você pode voltar à loja e tentar novamente.",
    },
    refunded: {
      subject: "Reembolso do pedido registrado",
      heading: "Pedido reembolsado",
      message:
        "O reembolso do seu pedido foi registrado. O prazo para aparecer depende do meio de pagamento e da instituição financeira.",
    },
  }[event];
  const total = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    order.totalCents / 100,
  );
  const body = `<p>Olá, ${escapeHtml(customer.name || "cliente")}.</p><p>${escapeHtml(content.message)}</p><div style="margin:24px 0;padding:18px;border-radius:16px;background:#fff6e6"><strong>Pedido:</strong> ${escapeHtml(order.id)}<br><strong>Total:</strong> ${escapeHtml(total)}</div>`;
  return sendTransactionalEmail(
    {
      eventKey: `order:${order.id}:${event}`,
      type: `order.${event}`,
      orderId: order.id,
      to: customer.email,
      subject: content.subject,
      html: layout(content.heading, body, content.subject),
      text: `Olá, ${customer.name || "cliente"}. ${content.message} Pedido ${order.id}, total ${total}.`,
    },
    options,
  );
}

export async function sendNewOrderAdminEmail(order: OrderEmail, options: DeliveryOptions = {}) {
  const to = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.ADMIN_INITIAL_EMAIL;
  if (!to) return;
  const customer = (order.customer && typeof order.customer === "object" ? order.customer : {}) as {
    name?: string;
    phone?: string;
  };
  const total = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    order.totalCents / 100,
  );
  return sendTransactionalEmail(
    {
      eventKey: `admin:new-order:${order.id}`,
      type: "admin.new_order",
      orderId: order.id,
      to,
      subject: `Novo pedido pago — ${order.id}`,
      html: layout(
        "Novo pedido pago",
        `<p><strong>${escapeHtml(customer.name || "Cliente")}</strong> concluiu um pedido de <strong>${escapeHtml(total)}</strong>.</p><p>WhatsApp: ${escapeHtml(customer.phone || "não informado")}</p><p>Abra o painel para conferir data, período e produção.</p>`,
        `Novo pedido ${order.id}`,
      ),
      text: `Novo pedido pago ${order.id}, cliente ${customer.name || "Cliente"}, total ${total}, WhatsApp ${customer.phone || "não informado"}.`,
    },
    options,
  );
}

export async function sendSubscriptionStatusEmail(input: {
  eventId: string;
  to: string;
  name: string;
  event: "upcoming" | "payment_failed" | "paused" | "resumed" | "cancelled";
}) {
  const content = {
    upcoming: {
      subject: "Sua assinatura Agô será renovada em breve",
      heading: "Próxima renovação",
      message:
        "Sua próxima cobrança e ciclo de refeições estão chegando. Confira seus dados e preferências na sua conta.",
    },
    payment_failed: {
      subject: "Atenção ao pagamento da sua assinatura",
      heading: "Pagamento não confirmado",
      message:
        "Não conseguimos confirmar a cobrança da sua assinatura. Atualize a forma de pagamento para evitar interrupções.",
    },
    paused: {
      subject: "Sua assinatura Agô foi pausada",
      heading: "Assinatura pausada",
      message: "A pausa da sua assinatura foi registrada. Você pode retomar pela área Minha conta.",
    },
    resumed: {
      subject: "Sua assinatura Agô foi retomada",
      heading: "Assinatura ativa novamente",
      message: "Sua assinatura foi retomada e os próximos ciclos voltarão a ser processados.",
    },
    cancelled: {
      subject: "Cancelamento da assinatura Agô",
      heading: "Assinatura cancelada",
      message:
        "O cancelamento da sua assinatura foi registrado. Pedidos já pagos ou em produção seguem as regras de cancelamento da loja.",
    },
  }[input.event];
  const accountUrl = `${process.env.PUBLIC_SITE_URL || "https://agogf.com.br"}/minha-conta`;
  await sendTransactionalEmail({
    eventKey: `subscription:${input.eventId}:${input.event}`,
    type: `subscription.${input.event}`,
    to: input.to,
    subject: content.subject,
    html: layout(
      content.heading,
      `<p>Olá, ${escapeHtml(input.name)}.</p><p>${escapeHtml(content.message)}</p><p style="margin:28px 0"><a href="${escapeHtml(accountUrl)}" style="display:inline-block;background:#f5a623;color:#27241f;text-decoration:none;font-weight:800;padding:14px 22px;border-radius:999px">Abrir minha conta</a></p>`,
      content.subject,
    ),
    text: `Olá, ${input.name}. ${content.message} Acesse ${accountUrl}.`,
  });
}

export async function sendLowStockEmail(input: {
  productId: string;
  productName: string;
  stock: number;
  retry?: boolean;
}) {
  const to = process.env.ADMIN_NOTIFICATION_EMAIL || process.env.ADMIN_INITIAL_EMAIL;
  if (!to) return;
  const title = `Estoque baixo: ${input.productName}`;
  return sendTransactionalEmail(
    {
      eventKey: `stock:${input.productId}:${input.stock}`,
      type: "inventory.low",
      to,
      subject: title,
      html: layout(
        title,
        `<p>O produto <strong>${escapeHtml(input.productName)}</strong> está com apenas <strong>${input.stock}</strong> unidade(s).</p><p>Abra o painel para atualizar o estoque ou ocultar o item.</p>`,
        title,
      ),
      text: `${input.productName} está com ${input.stock} unidade(s) em estoque.`,
    },
    { retry: input.retry },
  );
}

const retryableOrderEvents = new Set([
  "paid",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "payment_failed",
  "refunded",
]);

export async function retryFailedTransactionalEmails() {
  if (!hasDatabase()) return { attempted: 0, sent: 0, failed: 0, skipped: 0 };
  const db = getDatabase();
  const deliveries = await db
    .select()
    .from(emailDeliveries)
    .where(inArray(emailDeliveries.status, ["failed", "configuration_missing"]))
    .orderBy(desc(emailDeliveries.createdAt))
    .limit(200);
  const content = await readAdminContent();
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const delivery of deliveries) {
    let result: { sent: boolean; reason?: string } | void;
    if (delivery.type.startsWith("order.") && delivery.orderId) {
      const event = delivery.type.slice("order.".length);
      if (!retryableOrderEvents.has(event)) {
        skipped++;
        continue;
      }
      const order = await db
        .select()
        .from(shopOrders)
        .where(eq(shopOrders.id, delivery.orderId))
        .limit(1);
      if (!order[0]) {
        skipped++;
        continue;
      }
      result = await sendOrderStatusEmail(
        order[0],
        event as
          | "paid"
          | "preparing"
          | "ready"
          | "out_for_delivery"
          | "delivered"
          | "cancelled"
          | "payment_failed"
          | "refunded",
        { retry: true },
      );
    } else if (delivery.type === "admin.new_order" && delivery.orderId) {
      const order = await db
        .select()
        .from(shopOrders)
        .where(eq(shopOrders.id, delivery.orderId))
        .limit(1);
      if (!order[0]) {
        skipped++;
        continue;
      }
      result = await sendNewOrderAdminEmail(order[0], { retry: true });
    } else if (delivery.type === "customer.welcome") {
      const customerId = delivery.eventKey.slice("customer-welcome:".length);
      const customer = await db
        .select()
        .from(customerUsers)
        .where(eq(customerUsers.id, customerId))
        .limit(1);
      if (!customer[0]) {
        skipped++;
        continue;
      }
      result = await sendCustomerWelcomeEmail({
        id: customer[0].id,
        to: customer[0].email,
        name: customer[0].name,
        retry: true,
      });
    } else if (delivery.type === "inventory.low") {
      const parts = delivery.eventKey.split(":");
      const productId = parts[1] || "";
      const stock = Number(parts[2]);
      const product = content.data.products.find((item) => item.id === productId);
      if (!product || !Number.isFinite(stock)) {
        skipped++;
        continue;
      }
      result = await sendLowStockEmail({
        productId,
        productName: product.name,
        stock,
        retry: true,
      });
    } else {
      skipped++;
      continue;
    }
    if (result?.sent) sent++;
    else failed++;
  }

  return { attempted: deliveries.length, sent, failed, skipped };
}
