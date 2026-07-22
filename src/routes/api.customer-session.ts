import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  clearCustomerCookie,
  createCustomerCookie,
  destroyCustomerSession,
  getCustomerSession,
  loginCustomer,
} from "@/lib/customer-auth.server";
import { allowRequest } from "@/lib/rate-limit.server";
import { hasSameOrigin } from "@/lib/security.server";

const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(200),
});
export const Route = createFileRoute("/api/customer-session")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await getCustomerSession(request);
        return Response.json(
          {
            authenticated: Boolean(session),
            user: session
              ? {
                  id: session.userId,
                  name: session.name,
                  email: session.email,
                  phone: session.phone,
                }
              : null,
          },
          { headers: { "Cache-Control": "no-store" } },
        );
      },
      POST: async ({ request }) => {
        if (!hasSameOrigin(request))
          return Response.json({ error: "Origem não autorizada." }, { status: 403 });
        if (!allowRequest(request, "customer-login", 10, 15 * 60 * 1000))
          return Response.json(
            { error: "Muitas tentativas. Aguarde alguns minutos." },
            { status: 429 },
          );
        const parsed = loginSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success)
          return Response.json({ error: "E-mail ou senha inválidos." }, { status: 400 });
        try {
          const result = await loginCustomer(request, parsed.data.email, parsed.data.password);
          if (!result)
            return Response.json({ error: "E-mail ou senha inválidos." }, { status: 401 });
          return Response.json(
            { authenticated: true, user: result.user },
            {
              headers: {
                "Set-Cookie": createCustomerCookie(request, result.token),
                "Cache-Control": "no-store",
              },
            },
          );
        } catch (cause) {
          return Response.json(
            {
              error:
                cause instanceof Error && cause.message === "DATABASE_UNAVAILABLE"
                  ? "Cadastro de clientes disponível após conectar o banco de dados."
                  : "Não foi possível entrar.",
            },
            { status: 503 },
          );
        }
      },
      DELETE: async ({ request }) => {
        if (!hasSameOrigin(request))
          return Response.json({ error: "Origem não autorizada." }, { status: 403 });
        await destroyCustomerSession(request);
        return Response.json(
          { authenticated: false },
          { headers: { "Set-Cookie": clearCustomerCookie(request), "Cache-Control": "no-store" } },
        );
      },
    },
  },
});
