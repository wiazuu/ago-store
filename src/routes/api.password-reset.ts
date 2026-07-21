import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { allowRequest } from "@/lib/rate-limit.server";
import { requestPasswordReset, resetAdminPassword } from "@/lib/password-reset.server";
import { hasSameOrigin } from "@/lib/security.server";

const requestSchema = z.object({ identity: z.string().trim().min(2).max(254) });
const resetSchema = z.object({ token: z.string().min(32).max(200), password: z.string().min(12).max(200).regex(/[a-z]/, "Inclua uma letra minúscula.").regex(/[A-Z]/, "Inclua uma letra maiúscula.").regex(/[0-9]/, "Inclua um número.") });

export const Route = createFileRoute("/api/password-reset")({ server: { handlers: {
  POST: async ({ request }) => {
    if (!hasSameOrigin(request)) return Response.json({ error: "Origem não autorizada." }, { status: 403 });
    if (!allowRequest(request, "password-reset-request", 3, 60 * 60 * 1000)) return Response.json({ error: "Muitas solicitações. Tente novamente mais tarde." }, { status: 429 });
    const parsed = requestSchema.safeParse(await request.json().catch(() => null));
    if (parsed.success) await requestPasswordReset(request, parsed.data.identity).catch((error) => console.error("ago.password_reset.request_failed", error));
    return Response.json({ sent: true, message: "Se o usuário estiver cadastrado com e-mail, você receberá as instruções." });
  },
  PUT: async ({ request }) => {
    if (!hasSameOrigin(request)) return Response.json({ error: "Origem não autorizada." }, { status: 403 });
    if (!allowRequest(request, "password-reset-apply", 8, 60 * 60 * 1000)) return Response.json({ error: "Muitas tentativas. Aguarde." }, { status: 429 });
    const parsed = resetSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message || "Senha inválida." }, { status: 400 });
    const changed = await resetAdminPassword(request, parsed.data.token, parsed.data.password);
    return changed ? Response.json({ changed: true }) : Response.json({ error: "Este link é inválido, expirou ou já foi utilizado." }, { status: 400 });
  },
} } });
