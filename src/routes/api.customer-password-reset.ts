import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requestCustomerPasswordReset, resetCustomerPassword } from "@/lib/customer-password-reset.server";
import { allowRequest } from "@/lib/rate-limit.server";
import { hasSameOrigin } from "@/lib/security.server";

const requestSchema = z.object({ email: z.string().trim().email().max(254) });
const resetSchema = z.object({ token: z.string().min(32).max(200), password: z.string().min(12).max(200).regex(/[a-z]/, "Inclua uma letra minúscula.").regex(/[A-Z]/, "Inclua uma letra maiúscula.").regex(/[0-9]/, "Inclua um número.") });
export const Route = createFileRoute("/api/customer-password-reset")({ server: { handlers: {
  POST: async ({ request }) => { if (!hasSameOrigin(request)) return Response.json({ error: "Origem não autorizada." }, { status: 403 }); if (!allowRequest(request, "customer-password-reset", 3, 60 * 60 * 1000)) return Response.json({ error: "Muitas solicitações. Aguarde." }, { status: 429 }); const parsed = requestSchema.safeParse(await request.json().catch(() => null)); if (parsed.success) await requestCustomerPasswordReset(request, parsed.data.email).catch((error) => console.error("ago.customer.password_reset_failed", error)); return Response.json({ sent: true, message: "Se este e-mail estiver cadastrado, enviaremos as instruções." }); },
  PUT: async ({ request }) => { if (!hasSameOrigin(request)) return Response.json({ error: "Origem não autorizada." }, { status: 403 }); if (!allowRequest(request, "customer-password-apply", 8, 60 * 60 * 1000)) return Response.json({ error: "Muitas tentativas. Aguarde." }, { status: 429 }); const parsed = resetSchema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message || "Senha inválida." }, { status: 400 }); const changed = await resetCustomerPassword(request, parsed.data.token, parsed.data.password); return changed ? Response.json({ changed: true }) : Response.json({ error: "Este link é inválido, expirou ou já foi usado." }, { status: 400 }); },
} } });
